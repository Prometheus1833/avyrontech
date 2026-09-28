/**
 * WhatsappOrder — Avyron Products (avyron.ro/produse)
 * Butonul prin care se comandă efectiv în România: compune mesajul din coș, cu
 * produse, cantități și total, și deschide WhatsApp. Numărul se scrie o dată,
 * iar mesajul e citibil și pentru cine îl primește pe telefon.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type OrderLine = { name: string; quantity?: number; priceRon?: number };

const money = (value: number) => `${value.toLocaleString("ro-RO")} lei`;

export function whatsappHref({
  phone,
  lines,
  note,
  intro = "Salut! Vreau să comand:",
}: {
  phone: string;
  lines: OrderLine[];
  note?: string;
  intro?: string;
}) {
  const total = lines.reduce((sum, line) => sum + (line.priceRon ?? 0) * (line.quantity ?? 1), 0);
  const body = [
    intro,
    ...lines.map((line) => `• ${line.name}${line.quantity && line.quantity > 1 ? ` × ${line.quantity}` : ""}${line.priceRon ? ` — ${money(line.priceRon * (line.quantity ?? 1))}` : ""}`),
    total > 0 ? `Total: ${money(total)}` : "",
    note ? `\n${note}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  // `wa.me` cere numărul fără plus și fără spații.
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(body)}`;
}

export function WhatsappOrder({
  phone,
  lines,
  note,
  label = "Comandă pe WhatsApp",
  disabledLabel = "Adaugă ceva în coș",
}: {
  phone: string;
  lines: OrderLine[];
  note?: string;
  label?: string;
  disabledLabel?: string;
}) {
  const empty = lines.length === 0;
  const total = lines.reduce((sum, line) => sum + (line.priceRon ?? 0) * (line.quantity ?? 1), 0);

  if (empty) {
    return (
      <button type="button" disabled style={{ width: "100%", padding: ".7rem 1rem", borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.5)", fontSize: 13 }}>
        {disabledLabel}
      </button>
    );
  }

  return (
    <a
      href={whatsappHref({ phone, lines, note })}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        padding: ".7rem 1rem",
        borderRadius: 999,
        background: "#25D366",
        color: "#04220f",
        fontSize: 13.5,
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="currentColor">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 .1-3.3-.9-2.6-1.1-4.2-3.8-4.3-4-.2-.3-1-1.4-1-2.7s.7-1.9 1-2.2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6.5.8 1 1.4 1.7 1.9.6.4.9.5 1.1.6.2 0 .4 0 .5-.1l.8-.9c.2-.2.4-.2.6-.1l1.8.9c.5.2.5.4.5.6s0 .7-.1 1.1Z" />
      </svg>
      {label}
      {total > 0 && <span style={{ opacity: 0.75, fontWeight: 600 }}>· {money(total)}</span>}
    </a>
  );
}

export default WhatsappOrder;
