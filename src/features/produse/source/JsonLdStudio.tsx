import { useMemo, useState } from "react";

/**
 * JsonLdStudio — Avyron Products (avyron.ro/produse)
 * Generează JSON-LD valid pentru Organization, LocalBusiness, Product și FAQ.
 */

type Kind = "Organization" | "LocalBusiness" | "Product" | "FAQPage";

export function buildJsonLd(kind: Kind, data: Record<string, string>) {
  const base = { "@context": "https://schema.org", "@type": kind } as Record<string, unknown>;
  if (kind === "Organization" || kind === "LocalBusiness") {
    Object.assign(base, {
      name: data.name,
      url: data.url,
      email: data.email || undefined,
      telephone: data.phone || undefined,
      logo: data.logo || undefined,
      address: data.city ? { "@type": "PostalAddress", addressLocality: data.city, addressCountry: data.country || "RO" } : undefined,
    });
    if (kind === "LocalBusiness" && data.priceRange) base.priceRange = data.priceRange;
  }
  if (kind === "Product") {
    Object.assign(base, {
      name: data.name,
      description: data.description || undefined,
      brand: { "@type": "Brand", name: data.brand || data.name },
      offers: data.price
        ? { "@type": "Offer", price: Number(data.price), priceCurrency: data.currency || "RON", availability: "https://schema.org/InStock", url: data.url }
        : undefined,
    });
  }
  if (kind === "FAQPage") {
    const pairs = (data.faq || "")
      .split("\n")
      .map((line) => line.split("|"))
      .filter((parts) => parts.length >= 2);
    base.mainEntity = pairs.map(([q, a]) => ({ "@type": "Question", name: q.trim(), acceptedAnswer: { "@type": "Answer", text: a.trim() } }));
  }
  return JSON.parse(JSON.stringify(base));
}

const FIELDS: Record<Kind, Array<{ key: string; label: string; placeholder?: string; area?: boolean }>> = {
  Organization: [
    { key: "name", label: "Nume" },
    { key: "url", label: "URL" },
    { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefon" },
    { key: "city", label: "Oraș" },
  ],
  LocalBusiness: [
    { key: "name", label: "Nume" },
    { key: "url", label: "URL" },
    { key: "phone", label: "Telefon" },
    { key: "city", label: "Oraș" },
    { key: "priceRange", label: "Interval de preț", placeholder: "€€" },
  ],
  Product: [
    { key: "name", label: "Produs" },
    { key: "description", label: "Descriere" },
    { key: "price", label: "Preț" },
    { key: "currency", label: "Monedă", placeholder: "RON" },
    { key: "url", label: "URL" },
  ],
  FAQPage: [{ key: "faq", label: "Întrebare | Răspuns (una pe linie)", area: true }],
};

export function JsonLdStudio() {
  const [kind, setKind] = useState<Kind>("LocalBusiness");
  const [data, setData] = useState<Record<string, string>>({ name: "Avyron", url: "https://avyron.ro", city: "Iași", country: "RO" });
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => JSON.stringify(buildJsonLd(kind, data), null, 2), [kind, data]);
  const field: React.CSSProperties = { width: "100%", borderRadius: 10, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "6px 9px", fontSize: 12 };

  return (
    <div style={{ display: "grid", gap: 9, color: "#fff", fontSize: 12 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(Object.keys(FIELDS) as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: kind === k ? "linear-gradient(135deg,#8b5cf6,#22d3ee)" : "transparent", color: "#fff", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}
          >
            {k}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))" }}>
        {FIELDS[kind].map((f) =>
          f.area ? (
            <textarea
              key={f.key}
              rows={3}
              aria-label={f.label}
              placeholder={f.label}
              value={data[f.key] ?? ""}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              style={{ ...field, gridColumn: "1 / -1", resize: "vertical" }}
            />
          ) : (
            <input
              key={f.key}
              aria-label={f.label}
              placeholder={f.placeholder ?? f.label}
              value={data[f.key] ?? ""}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
              style={field}
            />
          ),
        )}
      </div>
      <pre style={{ margin: 0, maxHeight: 130, overflow: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", background: "rgba(0,0,0,.35)", padding: 10, fontSize: 11, lineHeight: 1.5 }}>
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(`<script type="application/ld+json">\n${code}\n</script>`);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        style={{ justifySelf: "start", borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "5px 11px", fontSize: 11.5, cursor: "pointer" }}
      >
        {copied ? "Copiat" : "Copiază scriptul"}
      </button>
    </div>
  );
}

export default JsonLdStudio;
