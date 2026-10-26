import { ArrowUpRight } from "lucide-react";
import type { SectionId } from "@/lib/access";
import { DASHBOARD_SECTION_META } from "./dashboardNavigation";

const tools: Array<{ group: string; title: string; description: string; destination: SectionId }> = [
  { group: "Conținut și ofertă", title: "Servicii", description: "Serviciile și oferta AVYRON.", destination: "servicii-avyron" },
  { group: "Conținut și ofertă", title: "Produse", description: "Catalogul și produsele digitale.", destination: "produse-avyron" },
  { group: "Conținut și ofertă", title: "Coduri comerciale", description: "Nomenclator, TVA și trasee de plată.", destination: "commercial-codes" },
  { group: "Conținut și ofertă", title: "Promoții", description: "Campanii și reguli comerciale.", destination: "promotions" },
  { group: "Conținut și ofertă", title: "Pagini și funcții definite în cod", description: "Propune o modificare structurată în Codex Work Items pentru revizuire și implementare.", destination: "maintenance" },
  { group: "Relații și comunicare", title: "Recenzii", description: "Moderarea recenziilor și testimonialelor.", destination: "reviews" },
  { group: "Relații și comunicare", title: "Newsletter", description: "Abonați, conținut și campanii.", destination: "newsletter" },
  { group: "Relații și comunicare", title: "Social Media", description: "Propuneri, aprobări și rezultate editoriale.", destination: "social-manager" },
  { group: "Acces și operațiuni", title: "Echipă și roluri", description: "Accesul membrilor staff și permisiunile lor.", destination: "team-staff" },
  { group: "Acces și operațiuni", title: "Abonamente", description: "Planuri și clienți abonați.", destination: "subscriptions-admin" },
  { group: "Acces și operațiuni", title: "Financiar", description: "Situația financiară și tranzacțiile.", destination: "finance" },
  { group: "Acces și operațiuni", title: "Centre AVYRON OS", description: "Integrări, automatizări și instrumente operaționale.", destination: "os-centers" },
];

export default function SuperAdminControlHub({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  return <div className="space-y-5">
    <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">Super administrator</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">Control platformă</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Instrumentele existente de administrare, într-un singur loc. Paginile publice definite în cod se modifică prin fluxul de dezvoltare și revizuire din GitHub.</p>
    </header>
    {Array.from(new Set(tools.map((tool) => tool.group))).map((group) => <section key={group} aria-label={group} className="space-y-3">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">{group}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tools.filter((tool) => tool.group === group).map((tool) => {
        const Icon = DASHBOARD_SECTION_META[tool.destination].icon;
        return <button key={tool.destination} type="button" onClick={() => onNavigate(tool.destination)} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-5" /></span>
          <span className="mt-3 block text-sm font-semibold text-slate-100">{tool.title}</span>
          <span className="mt-1 block min-h-9 text-xs text-slate-400">{tool.description}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-300">Deschide <ArrowUpRight className="size-3.5" /></span>
        </button>;
      })}</div>
    </section>)}
  </div>;
}
