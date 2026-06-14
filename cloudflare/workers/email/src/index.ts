/**
 * Avyron — Email Worker
 *
 * Rol:
 *  - Primește orice email trimis la contact@avyron.ro (sau alte alias-uri
 *    pe avyron.ro setate în Email Routing → Send to Worker).
 *  - Îl forwardează către cutia internă (avyrontech@gmail.com) ca să fie
 *    citit normal în Gmail.
 *  - Logica de auto-reply / filtrare se poate adăuga aici (env.SEND_EMAIL).
 *
 * Important: răspunsurile trimise din Gmail vor pleca tot din
 * avyrontech@gmail.com — pentru a afișa "contact@avyron.ro" la
 * destinatar, configurează în Gmail: Settings → Accounts → "Send mail as"
 * cu contact@avyron.ro (SMTP via Cloudflare Email Routing nu suportă
 * trimitere directă din Gmail, dar Gmail acceptă "Send as" cu verificare).
 */

export interface Env {
  SEND_EMAIL: SendEmail;
}

interface SendEmail {
  send(message: {
    from: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
  }): Promise<void>;
}

const INTERNAL_INBOX = "avyrontech@gmail.com";

export default {
  async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext) {
    // 1) Forward către cutia internă (păstrează headerele originale)
    try {
      await message.forward(INTERNAL_INBOX);
    } catch (err) {
      console.error("forward failed", err);
    }

    // 2) Exemplu auto-reply (dezactivat by default).
    // const subject = message.headers.get("subject") ?? "";
    // await env.SEND_EMAIL.send({
    //   from: message.to, // contact@avyron.ro
    //   to: message.from,
    //   subject: `Re: ${subject}`,
    //   text: "Mulțumim pentru mesaj! Vă răspundem în maximum 24h.\n\nEchipa Avyron",
    // });
  },
};

// Tipuri Cloudflare (minim necesare; @cloudflare/workers-types le oferă complet)
interface ForwardableEmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream;
  readonly rawSize: number;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
  reply(message: EmailMessage): Promise<void>;
  setReject(reason: string): void;
}
interface EmailMessage {
  readonly from: string;
  readonly to: string;
  readonly raw: ReadableStream | string;
}
