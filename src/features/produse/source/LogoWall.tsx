/**
 * LogoWall — Avyron Products (avyron.ro/produse)
 * Zidul de clienți: logourile trec în gri și se colorează la hover, iar pe
 * ecrane mici se rearanjează singure. Fiecare logo e un `<img>` cu `alt` real,
 * deci secțiunea rămâne utilă și pentru SEO, nu doar decor.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type Client = { name: string; src: string; href?: string };

export function LogoWall({ clients, title, color = "#8b5cf6" }: { clients: Client[]; title?: string; color?: string }) {
  return (
    <section style={{ padding: "2rem 0" }}>
      {title && (
        <h2 style={{ margin: "0 0 1.2rem", textAlign: "center", fontSize: 13, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(255,255,255,.55)" }}>
          {title}
        </h2>
      )}
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "1.4rem 2rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          alignItems: "center",
        }}
      >
        {clients.map((client) => {
          const logo = (
            <img
              src={client.src}
              alt={client.name}
              loading="lazy"
              decoding="async"
              style={{
                width: "100%",
                maxHeight: 38,
                objectFit: "contain",
                filter: "grayscale(1) opacity(.55)",
                transition: "filter .3s ease, transform .3s ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.filter = "grayscale(0) opacity(1)";
                event.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.filter = "grayscale(1) opacity(.55)";
                event.currentTarget.style.transform = "none";
              }}
            />
          );
          return (
            <li key={client.name} style={{ display: "grid", placeItems: "center" }}>
              {client.href ? (
                <a href={client.href} rel="noopener" style={{ display: "block", width: "100%", outlineColor: color }}>
                  {logo}
                </a>
              ) : (
                logo
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default LogoWall;
