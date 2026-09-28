/**
 * AnpcBar — Avyron Products (avyron.ro/produse)
 * Blocul de conformitate din subsolul magazinelor românești: legăturile către
 * ANPC (SAL și SOL) plus datele firmei. Legăturile sunt cele publice oficiale,
 * iar textul spune limpede ce e fiecare — nu doar două bannere colorate.
 * Licență: utilizare nelimitată în proiecte proprii și ale clienților.
 */

export type CompanyInfo = {
  name: string;
  cui: string;
  regCom?: string;
  address?: string;
  email?: string;
  phone?: string;
};

const LINKS = [
  { label: "ANPC — Soluționarea alternativă a litigiilor (SAL)", href: "https://anpc.ro/ce-este-sal/" },
  { label: "Soluționarea online a litigiilor (SOL)", href: "https://ec.europa.eu/consumers/odr" },
  { label: "ANPC — protecția consumatorului", href: "https://anpc.ro/" },
];

export function AnpcBar({ company, className }: { company: CompanyInfo; className?: string }) {
  return (
    <section
      className={className}
      aria-label="Informații legale și protecția consumatorului"
      style={{ display: "grid", gap: 10, padding: "1rem 0", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 12, color: "rgba(255,255,255,.7)" }}
    >
      <p style={{ margin: 0, lineHeight: 1.6 }}>
        <strong style={{ color: "#fff" }}>{company.name}</strong> · CUI {company.cui}
        {company.regCom ? ` · Reg. Com. ${company.regCom}` : ""}
        {company.address ? ` · ${company.address}` : ""}
      </p>
      {(company.email || company.phone) && (
        <p style={{ margin: 0 }}>
          {company.email && (
            <a href={`mailto:${company.email}`} style={{ color: "#7dd3fc" }}>
              {company.email}
            </a>
          )}
          {company.email && company.phone ? " · " : ""}
          {company.phone && (
            <a href={`tel:${company.phone.replace(/\s+/g, "")}`} style={{ color: "#7dd3fc" }}>
              {company.phone}
            </a>
          )}
        </p>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer nofollow" style={{ color: "rgba(255,255,255,.75)", textDecoration: "underline", textUnderlineOffset: 3 }}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AnpcBar;
