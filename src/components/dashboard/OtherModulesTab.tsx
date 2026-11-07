import { useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { additionalSectionsFor, type Access, type SectionId } from "@/lib/access";
import { DASHBOARD_SECTION_META } from "./dashboardNavigation";

const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function OtherModulesTab({ access, onNavigate }: { access: Access; onNavigate: (section: SectionId) => void }) {
  const [query, setQuery] = useState("");
  const sections = additionalSectionsFor(access);
  const filtered = sections.filter(section => {
    const meta = DASHBOARD_SECTION_META[section.id];
    return fold([meta.label, meta.hint, ...section.keywords].join(" ")).includes(fold(query.trim()));
  });
  return (
    <section className="space-y-4" aria-label="Alte module AVYRON OS">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-violet-300">Acces rapid</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Altele</h1>
        <p className="mt-2 text-sm text-slate-400">Paginile disponibile contului tău care nu au un buton propriu în meniu. Se deschid în același dashboard.</p>
      </header>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Caută în Altele</span>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Caută o pagină sau o funcție…" className="os-workspace-input w-full pl-10" />
      </label>
      <p className="text-xs text-slate-400" role="status">Pagini disponibile: {filtered.length}</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(section => {
          const meta = DASHBOARD_SECTION_META[section.id], Icon = meta.icon;
          return <button key={section.id} type="button" onClick={() => onNavigate(section.id)} aria-label={`Deschide ${meta.label}`} className="min-w-0 rounded-2xl border border-white/10 bg-white/[.025] p-4 text-left transition hover:border-violet-400/40 hover:bg-violet-500/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 motion-reduce:transition-none">
            <div className="flex items-center justify-between gap-3"><Icon className="size-5 text-violet-300" aria-hidden="true" /><ArrowUpRight className="size-4 text-slate-400" aria-hidden="true" /></div>
            <h2 className="mt-3 break-words text-sm font-semibold text-slate-100">{meta.label}</h2>
            <p className="mt-1 break-words text-xs leading-relaxed text-slate-400">{meta.hint}</p>
          </button>;
        })}
      </div>
      {!filtered.length && <p className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-400">{sections.length ? "Nicio pagină pentru această căutare." : "Toate paginile disponibile au deja o intrare în meniu."}</p>}
    </section>
  );
}
