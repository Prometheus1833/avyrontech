import { useState, type FormEvent } from "react";

/**
 * MegaFooter — Avyron Products (avyron.ro/produse)
 * Subsol complet, cu sloturile cerute de legislația din România (ANPC, SOL/SAL,
 * date de firmă) pregătite, ca să nu fie descoperite la lansare.
 */

type Column = { title: string; links: Array<{ label: string; href: string }> };

type Props = {
  brand: string;
  slogan?: string;
  columns: Column[];
  legal?: Array<{ label: string; href: string }>;
  company?: string;
  onSubscribe?: (email: string) => Promise<void> | void;
  labels?: Partial<Record<"newsletter" | "placeholder" | "submit" | "done" | "rights", string>>;
};

export function MegaFooter({ brand, slogan, columns, legal = [], company, onSubscribe, labels = {} }: Props) {
  const l = { newsletter: "Primește noutățile", placeholder: "adresa@exemplu.ro", submit: "Abonează-mă", done: "Gata! Verifică e-mailul.", rights: "Toate drepturile rezervate.", ...labels };
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setBusy(true);
    try {
      await onSubscribe?.(email);
      setDone(true);
      setEmail("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,.1)", background: "#07080d", color: "#fff", padding: "28px 20px 18px" }}>
      <div style={{ margin: "0 auto", maxWidth: 1120, display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div style={{ gridColumn: "span 2", minWidth: 180 }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "0.12em" }}>{brand}</p>
          {slogan && <p style={{ margin: "6px 0 0", fontSize: 12, opacity: 0.55, letterSpacing: "0.08em" }}>{slogan}</p>}
          <form onSubmit={submit} style={{ marginTop: 14 }}>
            <label htmlFor="avy-news" style={{ display: "block", fontSize: 11, opacity: 0.6, marginBottom: 5 }}>
              {l.newsletter}
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                id="avy-news"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={l.placeholder}
                style={{ minWidth: 0, flex: 1, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "7px 12px", fontSize: 12.5 }}
              />
              <button type="submit" disabled={busy} style={{ borderRadius: 999, border: 0, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#fff", padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                {l.submit}
              </button>
            </div>
            {done && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: "#86efac" }}>{l.done}</p>}
          </form>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p style={{ margin: 0, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.16em", opacity: 0.45 }}>{column.title}</p>
            <ul style={{ margin: "9px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
              {column.links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} style={{ color: "rgba(255,255,255,.72)", fontSize: 12.5, textDecoration: "none" }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <p aria-hidden style={{ margin: "26px auto 0", maxWidth: 1120, fontSize: "clamp(2rem, 11vw, 7rem)", fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.04em", color: "rgba(255,255,255,.055)" }}>
        {brand}
      </p>

      <div style={{ margin: "14px auto 0", maxWidth: 1120, display: "flex", flexWrap: "wrap", gap: "6px 14px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 12, fontSize: 11, opacity: 0.55 }}>
        <span>
          © {new Date().getFullYear()} {company ?? brand}. {l.rights}
        </span>
        {legal.map((entry) => (
          <a key={entry.href} href={entry.href} style={{ color: "inherit" }}>
            {entry.label}
          </a>
        ))}
      </div>
    </footer>
  );
}

export default MegaFooter;
