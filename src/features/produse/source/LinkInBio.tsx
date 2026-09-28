/**
 * LinkInBio — Avyron Products (avyron.ro/produse)
 * Pagină de linkuri pe domeniul tău, cu evenimente GA4 la click.
 */

type Link = { label: string; href: string; note?: string; featured?: boolean; emoji?: string };

type Props = {
  name: string;
  tagline?: string;
  avatar?: string;
  links: Link[];
  accent?: string;
  /** Trimite evenimentul în dataLayer/gtag dacă există. */
  track?: boolean;
  /** Implicit h1 (pagina e despre persoana asta); h2 într-o previzualizare. */
  headingAs?: "h1" | "h2";
};

export function LinkInBio({ name, tagline, avatar, links, accent = "#8b5cf6", track = true, headingAs: Heading = "h1" }: Props) {
  const onClick = (link: Link) => {
    if (!track) return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "link_click", { link_label: link.label, link_url: link.href });
  };

  return (
    <div style={{ minHeight: "100%", padding: "26px 18px", background: `radial-gradient(70% 50% at 50% 0%, ${accent}33, transparent 70%), #07080d`, color: "#fff", textAlign: "center" }}>
      {avatar ? (
        <img src={avatar} alt="" width={72} height={72} style={{ borderRadius: "50%", objectFit: "cover", border: `2px solid ${accent}` }} />
      ) : (
        <div aria-hidden style={{ width: 72, height: 72, margin: "0 auto", borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, #22d3ee)`, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 800 }}>
          {name.slice(0, 1)}
        </div>
      )}
      <Heading style={{ margin: "12px 0 0", fontSize: 19, fontWeight: 750 }}>{name}</Heading>
      {tagline && <p style={{ margin: "5px 0 0", fontSize: 12.5, opacity: 0.6 }}>{tagline}</p>}

      <ul style={{ margin: "18px auto 0", padding: 0, listStyle: "none", display: "grid", gap: 8, maxWidth: 360 }}>
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              onClick={() => onClick(link)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 14px",
                borderRadius: 14,
                textDecoration: "none",
                color: "#fff",
                border: link.featured ? `1px solid ${accent}` : "1px solid rgba(255,255,255,.12)",
                background: link.featured ? `linear-gradient(135deg, ${accent}33, transparent)` : "rgba(255,255,255,.04)",
              }}
            >
              {link.emoji && <span aria-hidden>{link.emoji}</span>}
              <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 600 }}>{link.label}</span>
              {link.note && <span style={{ fontSize: 11, opacity: 0.55 }}>{link.note}</span>}
              <span aria-hidden style={{ opacity: 0.5 }}>›</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LinkInBio;
