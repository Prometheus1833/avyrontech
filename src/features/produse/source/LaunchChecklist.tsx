import { useMemo, useState } from "react";

/**
 * LaunchChecklist — Avyron Products (avyron.ro/produse)
 * Lista pe care o parcurgem înainte de fiecare lansare. Bifele stau local, iar
 * lista se exportă în Markdown ca să poată intra în documentația proiectului.
 */

export type ChecklistGroup = { title: string; items: string[] };

export const LAUNCH_CHECKLIST: ChecklistGroup[] = [
  {
    title: "SEO",
    items: [
      "Titlu și descriere unice pe fiecare pagină",
      "Sitemap generat și trimis în Search Console",
      "Date structurate validate (Rich Results Test)",
      "hreflang reciproc pe paginile traduse",
      "robots.txt permite crawlarea paginilor publice",
      "Redirecturi 301 pentru URL-urile vechi",
    ],
  },
  {
    title: "Performanță",
    items: [
      "LCP sub 2,5 s pe mobil, pe rețea 4G",
      "Imagini AVIF/WebP, cu dimensiuni explicite",
      "Fonturi cu font-display: swap și preload",
      "JavaScript inițial sub 200 kB gzip",
      "Fără layout shift la încărcarea anunțurilor sau bannerelor",
    ],
  },
  {
    title: "Accesibilitate",
    items: [
      "Contrast minim 4,5:1 pe text normal",
      "Focus vizibil pe toate elementele interactive",
      "Navigare completă din tastatură",
      "Etichete pe toate câmpurile de formular",
      "prefers-reduced-motion respectat",
    ],
  },
  {
    title: "Securitate",
    items: [
      "HTTPS forțat, HSTS activ",
      "Antete de securitate (CSP, X-Content-Type-Options, Referrer-Policy)",
      "Formulare protejate anti-spam",
      "Backup automat și procedură de restaurare testată",
    ],
  },
  {
    title: "Legal (România)",
    items: [
      "Termeni și condiții publicate",
      "Politica de confidențialitate (GDPR) și politica de cookies",
      "Banner de consimțământ cu refuz real, înainte de scripturi",
      "Date de firmă, ANPC și SOL/SAL în subsol",
      "Informare privind dreptul de retragere (pentru vânzări online)",
    ],
  },
  {
    title: "Analytics și conversii",
    items: [
      "Analytics instalat, cu Consent Mode",
      "Evenimente de conversie definite și testate",
      "Search Console și Bing Webmaster conectate",
      "Alertă la căderea site-ului (uptime monitor)",
    ],
  },
];

export function toMarkdown(groups: ChecklistGroup[] = LAUNCH_CHECKLIST): string {
  return groups.map((group) => `## ${group.title}\n\n${group.items.map((item) => `- [ ] ${item}`).join("\n")}`).join("\n\n");
}

export function LaunchChecklist({ groups = LAUNCH_CHECKLIST }: { groups?: ChecklistGroup[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const total = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);
  const checked = Object.values(done).filter(Boolean).length;

  const download = () => {
    const url = URL.createObjectURL(new Blob([toMarkdown(groups)], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "checklist-lansare.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ color: "#fff", fontSize: 12.5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 5, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(checked / total) * 100}%`, background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", transition: "width .4s" }} />
        </div>
        <span style={{ fontVariantNumeric: "tabular-nums", opacity: 0.6, fontSize: 11 }}>
          {checked}/{total}
        </span>
        <button type="button" onClick={download} style={{ borderRadius: 999, border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.05)", color: "#fff", padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>
          Markdown
        </button>
      </div>
      {groups.map((group) => (
        <section key={group.title} style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.16em", opacity: 0.45 }}>{group.title}</h3>
          <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {group.items.map((item) => (
              <li key={item}>
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", opacity: done[item] ? 0.5 : 0.8 }}>
                  <input type="checkbox" checked={Boolean(done[item])} onChange={(e) => setDone({ ...done, [item]: e.target.checked })} style={{ marginTop: 3 }} />
                  <span style={{ textDecoration: done[item] ? "line-through" : "none" }}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default LaunchChecklist;
