import type { DemoProps } from "./registry";

/** Cuprinsul ghidului, ca previzualizare a documentului. */
const TOC = [
  { ro: "De ce un SPA nu e indexabil din start", en: "Why an SPA isn't indexable out of the box" },
  { ro: "Prerender fără Next.js: scriptul, pas cu pas", en: "Prerendering without Next.js: the script, step by step" },
  { ro: "Canonical, hreflang și capcanele lor", en: "Canonical, hreflang and their traps" },
  { ro: "Sitemap generat din rute, nu scris de mână", en: "A sitemap generated from routes, not hand-written" },
  { ro: "Date structurate care produc rich results", en: "Structured data that earns rich results" },
  { ro: "Core Web Vitals: ce măsori și ce repari primul", en: "Core Web Vitals: what to measure and fix first" },
  { ro: "Worker-ul de edge: 404, 301 și antete", en: "The edge worker: 404s, 301s and headers" },
  { ro: "Checklist final înainte de lansare", en: "Final checklist before launch" },
];

export default function DocSeoDemo({ lang }: DemoProps) {
  const ro = lang === "ro";
  return (
    <div className="h-full w-full overflow-y-auto p-4 text-white">
      <p className="pa-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{ro ? "Cuprins · 8 capitole" : "Contents · 8 chapters"}</p>
      <ol className="mt-2 grid list-none gap-1.5 p-0">
        {TOC.map((entry, index) => (
          <li key={entry.ro} className="flex gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[12.5px] text-white/75">
            <span className="pa-mono text-white/35">{String(index + 1).padStart(2, "0")}</span>
            <span>{ro ? entry.ro : entry.en}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-white/40">{ro ? "Cu exemple de cod din avyron.ro și scripturile reale de build." : "With code examples from avyron.ro and the real build scripts."}</p>
    </div>
  );
}
