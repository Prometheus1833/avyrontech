// Minimal SMTP client pentru Cloudflare Workers (TCP sockets + STARTTLS).
// Folosit de /api/contact/demo pentru a trimite formularele pe emailul agenției.
//
// Secrete necesare (wrangler secret put ...):
//   SMTP_HOST, SMTP_PORT (opțional, default 587), SMTP_USER, SMTP_PASS
//   SMTP_FROM (opțional, default SMTP_USER), LEAD_TO (opțional, default SMTP_FROM)

import { connect } from "cloudflare:sockets";

export type SmtpConfig = {
  host: string;
  port?: number;
  user: string;
  pass: string;
};

export type Attachment = {
  filename: string;
  contentType: string;
  content: Uint8Array;
};

export type MailMessage = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Attachment[];
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}
const b64str = (s: string) => b64(enc.encode(s));

function wrap76(s: string): string {
  return s.replace(/.{1,76}/g, "$&\r\n");
}

function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7E]*$/.test(value) ? value : `=?UTF-8?B?${b64str(value)}?=`;
}

class SmtpSession {
  private writer!: WritableStreamDefaultWriter<Uint8Array>;
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private buffer = "";
  constructor(private socket: any) {}

  attach() {
    this.writer = this.socket.writable.getWriter();
    this.reader = this.socket.readable.getReader();
  }

  async upgradeTls() {
    await this.writer.close();
    await this.reader.cancel().catch(() => {});
    this.socket = this.socket.startTls();
    this.buffer = "";
    this.attach();
  }

  async send(line: string) {
    await this.writer.write(enc.encode(line + "\r\n"));
  }

  async sendRaw(data: string) {
    await this.writer.write(enc.encode(data));
  }

  async read(expect: number): Promise<string> {
    // Citește până la o linie finală "NNN <text>"
    while (true) {
      const match = this.buffer.match(/^(?:\d{3}-[^\r\n]*\r\n)*(\d{3}) [^\r\n]*\r\n/);
      if (match) {
        const consumed = match[0];
        this.buffer = this.buffer.slice(consumed.length);
        const code = parseInt(match[1], 10);
        if (Math.floor(code / 100) !== Math.floor(expect / 100)) {
          throw new Error(`SMTP ${code}: ${consumed.trim()}`);
        }
        return consumed;
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error("SMTP: conexiune închisă neașteptat");
      this.buffer += dec.decode(value, { stream: true });
    }
  }

  async cmd(line: string, expect = 250) {
    await this.send(line);
    return this.read(expect);
  }

  async close() {
    try {
      await this.send("QUIT");
    } catch {}
    try {
      await this.writer.close();
    } catch {}
    try {
      await this.socket.close();
    } catch {}
  }
}

function buildMime(msg: MailMessage): string {
  const boundary = `----avyron_${crypto.randomUUID().replace(/-/g, "")}`;
  const headers = [
    `From: ${msg.from}`,
    `To: ${msg.to}`,
    msg.replyTo ? `Reply-To: ${msg.replyTo}` : "",
    `Subject: ${encodeHeader(msg.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@avyron.ro>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ].filter(Boolean);

  const parts: string[] = [];
  const bodyBoundary = `${boundary}_alt`;
  parts.push(
    `--${boundary}\r\n` +
      `Content-Type: multipart/alternative; boundary="${bodyBoundary}"\r\n\r\n` +
      `--${bodyBoundary}\r\n` +
      `Content-Type: text/plain; charset=UTF-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      wrap76(b64str(msg.text)) +
      `\r\n` +
      (msg.html
        ? `--${bodyBoundary}\r\n` +
          `Content-Type: text/html; charset=UTF-8\r\n` +
          `Content-Transfer-Encoding: base64\r\n\r\n` +
          wrap76(b64str(msg.html)) +
          `\r\n`
        : "") +
      `--${bodyBoundary}--\r\n`,
  );

  for (const att of msg.attachments || []) {
    parts.push(
      `--${boundary}\r\n` +
        `Content-Type: ${att.contentType}; name="${att.filename.replace(/"/g, "")}"\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-Disposition: attachment; filename="${att.filename.replace(/"/g, "")}"\r\n\r\n` +
        wrap76(b64(att.content)) +
        `\r\n`,
    );
  }

  return `${headers.join("\r\n")}\r\n\r\n${parts.join("")}--${boundary}--\r\n`;
}

const addrOnly = (a: string) => {
  const m = a.match(/<([^>]+)>/);
  return m ? m[1] : a.trim();
};

export async function sendMailSmtp(cfg: SmtpConfig, msg: MailMessage): Promise<void> {
  const port = cfg.port ?? 587;
  const socket = connect({ hostname: cfg.host, port }, { secureTransport: port === 465 ? "on" : "starttls", allowHalfOpen: false });
  const s = new SmtpSession(socket);
  s.attach();

  try {
    await s.read(220);
    await s.cmd(`EHLO avyron.ro`);
    if (port !== 465) {
      await s.cmd("STARTTLS", 220);
      await s.upgradeTls();
      await s.cmd(`EHLO avyron.ro`);
    }
    await s.cmd("AUTH LOGIN", 334);
    await s.cmd(b64str(cfg.user), 334);
    await s.cmd(b64str(cfg.pass), 235);
    await s.cmd(`MAIL FROM:<${addrOnly(msg.from)}>`);
    await s.cmd(`RCPT TO:<${addrOnly(msg.to)}>`);
    await s.cmd("DATA", 354);
    const mime = buildMime(msg).replace(/\r\n\./g, "\r\n..");
    await s.sendRaw(mime + "\r\n.\r\n");
    await s.read(250);
  } finally {
    await s.close();
  }
}
