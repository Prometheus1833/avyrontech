import { useEffect, useState } from "react";

/**
 * FaqAccordion — Avyron Products (avyron.ro/produse)
 * Accordion accesibil care generează singur JSON-LD FAQPage. Răspunsurile
 * rămân în DOM și când sunt închise, deci Google le citește.
 */

export type Qa = { id: string; q: string; a: string };

type Props = { items: Qa[]; jsonLdId?: string };

export function FaqAccordion({ items, jsonLdId = "avy-faq-ld" }: Props) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    // Ancora din URL deschide întrebarea potrivită.
    const hash = window.location.hash.replace("#", "");
    if (hash && items.some((item) => item.id === hash)) setOpen(hash);
  }, [items]);

  useEffect(() => {
    const ld = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    };
    let tag = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement("script");
      tag.id = jsonLdId;
      tag.type = "application/ld+json";
      document.head.appendChild(tag);
    }
    tag.textContent = JSON.stringify(ld);
    const created = tag;
    return () => {
      created.remove();
    };
  }, [items, jsonLdId]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id} id={item.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", overflow: "hidden" }}>
            <h3 style={{ margin: 0 }}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                onClick={() => setOpen(isOpen ? null : item.id)}
                style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: 0, color: "#fff", font: "inherit", fontSize: 14, fontWeight: 600, textAlign: "left", cursor: "pointer" }}
              >
                {item.q}
                <span aria-hidden style={{ transition: "transform .3s cubic-bezier(.22,1,.36,1)", transform: isOpen ? "rotate(45deg)" : "none", opacity: 0.6 }}>
                  +
                </span>
              </button>
            </h3>
            <div
              id={`${item.id}-panel`}
              style={{
                display: "grid",
                gridTemplateRows: isOpen ? "1fr" : "0fr",
                transition: "grid-template-rows .45s cubic-bezier(.22,1,.36,1)",
              }}
            >
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, padding: "0 16px 16px", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,.66)" }}>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FaqAccordion;
