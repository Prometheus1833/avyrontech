import type { ReactNode } from "react";

/**
 * TypeHero — Avyron Products (avyron.ro/produse)
 * Hero tipografic, fără imagini: LCP mic, gradient animat în titlu.
 */

type Props = {
  eyebrow?: string;
  title: string;
  highlight?: string;
  lead?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  trust?: string[];
  children?: ReactNode;
  /**
   * Nivelul titlului. Un hero e de obicei titlul paginii, deci h1; pune h2 când
   * hero-ul stă într-o pagină care are deja un h1 (o previzualizare, un demo).
   */
  headingAs?: "h1" | "h2";
};

const CSS = `
@keyframes avy-hero-flow { to { background-position: 220% 50%; } }
@media (prefers-reduced-motion: reduce) { [data-avy-hero] .grad { animation: none; } }
`;

export function TypeHero({ eyebrow, title, highlight, lead, primary, secondary, trust = [], children, headingAs: Heading = "h1" }: Props) {
  return (
    <section data-avy-hero style={{ position: "relative", padding: "clamp(2rem, 6vw, 5rem) 1.25rem", textAlign: "center" }}>
      <style>{CSS}</style>
      {eyebrow && (
        <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "#a78bfa" }}>{eyebrow}</p>
      )}
      <Heading style={{ margin: "0.6rem auto 0", maxWidth: "20ch", fontSize: "clamp(2rem, 6vw, 4rem)", lineHeight: 1.03, letterSpacing: "-0.03em", fontWeight: 800, color: "#fff" }}>
        {title}{" "}
        {highlight && (
          <span
            className="grad"
            style={{
              background: "linear-gradient(100deg,#8b5cf6,#22d3ee,#ec4899,#8b5cf6)",
              backgroundSize: "220% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "avy-hero-flow 9s linear infinite",
            }}
          >
            {highlight}
          </span>
        )}
      </Heading>
      {lead && <p style={{ margin: "1.1rem auto 0", maxWidth: "48ch", fontSize: 15, lineHeight: 1.6, color: "rgba(255,255,255,.62)" }}>{lead}</p>}
      <div style={{ marginTop: "1.6rem", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {primary && (
          <a href={primary.href} style={{ padding: "0.8rem 1.4rem", borderRadius: 999, background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            {primary.label}
          </a>
        )}
        {secondary && (
          <a href={secondary.href} style={{ padding: "0.8rem 1.4rem", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            {secondary.label}
          </a>
        )}
      </div>
      {trust.length > 0 && (
        <ul style={{ margin: "1.6rem 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "0.4rem 1.4rem", justifyContent: "center", fontSize: 12, color: "rgba(255,255,255,.5)" }}>
          {trust.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}

export default TypeHero;
