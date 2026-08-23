/**
 * Avyron — Email Worker
 *
 * Rol:
 *  - Primește orice email trimis la contact@avyron.ro (sau alte alias-uri
 *    pe avyron.ro setate în Email Routing → Send to Worker).
 *  - Îl forwardează către cutia internă configurată prin FORWARD_TO ca să fie
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
  FORWARD_TO: string;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env) {
    const destination = env.FORWARD_TO?.trim().toLowerCase();
    if (!destination || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destination)) {
      console.error(JSON.stringify({ event: "email_routing_invalid_destination", recipient: message.to }));
      message.setReject("Email routing destination is not configured");
      return;
    }
    // 1) Forward către cutia internă (păstrează headerele originale)
    try {
      await message.forward(destination);
      console.log(JSON.stringify({ event: "email_forwarded", from: message.from, to: message.to, destination, size: message.rawSize }));
    } catch (err) {
      console.error(JSON.stringify({ event: "email_forward_failed", from: message.from, to: message.to, destination, error: String(err) }));
      throw err;
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
