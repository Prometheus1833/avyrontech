import { useEffect, useState } from "react";

/**
 * CookieConsent — Avyron Products (avyron.ro/produse)
 * Banner de consimțământ cu categorii, refuz la fel de ușor ca acceptul și
 * alegerea ținută local. ATENȚIE: bannerul înregistrează decizia și o anunță
 * prin `onDecision`; blocarea efectivă a scripturilor o faci tu, încărcându-le
 * abia după consimțământ — niciun banner nu face asta singur.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type Consent = { necessary: true; analytics: boolean; marketing: boolean; at: number };

const KEY = "cookie-consent-v1";

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Consent) : null;
  } catch {
    return null;
  }
}

export function CookieConsent({
  policyHref = "/politica-cookies",
  onDecision,
  /** Pentru demo: pornește vizibil chiar dacă există deja o alegere salvată. */
  forceOpen = false,
}: {
  policyHref?: string;
  onDecision?: (consent: Consent) => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(forceOpen);
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (forceOpen) return;
    setOpen(readConsent() === null);
  }, [forceOpen]);

  const decide = (next: { analytics: boolean; marketing: boolean }) => {
    const consent: Consent = { necessary: true, ...next, at: Date.now() };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {
      /* fără storage: decizia ține doar cât ține pagina */
    }
    onDecision?.(consent);
    setOpen(false);
  };

  if (!open) return null;

  const button = {
    padding: ".5rem .9rem",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
  } as const;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Consimțământ pentru cookie-uri"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        padding: "1rem",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,.12)",
        background: "rgba(10,12,22,.96)",
        backdropFilter: "blur(12px)",
        color: "#fff",
        display: "grid",
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,.8)" }}>
        Folosim cookie-uri necesare pentru funcționarea site-ului. Cu acordul tău, adăugăm și cookie-uri de analiză și de marketing.{" "}
        <a href={policyHref} style={{ color: "#7dd3fc" }}>
          Politica de cookie-uri
        </a>
        .
      </p>

      {details && (
        <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "rgba(255,255,255,.55)" }}>
            <input type="checkbox" checked disabled aria-label="Cookie-uri necesare, mereu active" />
            Necesare — mereu active
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
            Analiză (trafic, pagini vizitate)
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
            Marketing (remarketing, conversii)
          </label>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {/* Refuzul stă lângă accept, la fel de vizibil — asta cere GDPR. */}
        <button type="button" style={button} onClick={() => decide({ analytics: false, marketing: false })}>
          Doar necesare
        </button>
        <button
          type="button"
          style={{ ...button, border: 0, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)" }}
          onClick={() => decide({ analytics: true, marketing: true })}
        >
          Accept toate
        </button>
        {details ? (
          <button type="button" style={button} onClick={() => decide({ analytics, marketing })}>
            Salvează alegerea
          </button>
        ) : (
          <button type="button" style={{ ...button, background: "transparent", border: 0, textDecoration: "underline" }} onClick={() => setDetails(true)}>
            Setări
          </button>
        )}
      </div>
    </div>
  );
}

export default CookieConsent;
