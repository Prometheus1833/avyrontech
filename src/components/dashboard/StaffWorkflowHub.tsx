import { ArrowUpRight } from "lucide-react";
import { canOpenSection, type Access, type SectionId } from "@/lib/access";
import { DASHBOARD_SECTION_META } from "./dashboardNavigation";

const flows: Array<{ title: string; description: string; destination: SectionId; stage: string }> = [
  { title: "Vânzări și leaduri", description: "Calificare, oferte și urmărirea oportunităților în CRM.", destination: "leads", stage: "Pipeline" },
  { title: "Solicitări demo", description: "Cereri de exemplu personalizat, cu stadii și acțiuni de contact.", destination: "demo-requests", stage: "Pipeline" },
  { title: "Simulări Logo 3D", description: "Solicitările Logo Studio în pipeline-ul comercial.", destination: "logo-simulations", stage: "Pipeline" },
  { title: "Configurator", description: "Estimările și cererile din configurator în pipeline-ul comercial.", destination: "configurator", stage: "Pipeline" },
  { title: "Surveys", description: "Briefuri, răspunsuri și progresul chestionarelor.", destination: "surveys", stage: "Pipeline" },
  { title: "Proiecte", description: "Livrabile, termene și starea lucrărilor.", destination: "projects", stage: "Flux de livrare" },
  { title: "Mentenanță", description: "Intervenții și monitorizarea proiectelor active.", destination: "maintenance", stage: "Flux operațional" },
  { title: "Solicitări clienți", description: "Tichete și conversații de suport.", destination: "staff-tickets", stage: "Flux de suport" },
];

export default function StaffWorkflowHub({ access, onNavigate }: { access: Access; onNavigate: (section: SectionId) => void }) {
  return <div className="space-y-5">
    <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">Operațiuni</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">Fluxuri și pipeline</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Deschide direct fluxul în care lucrezi. Fiecare card duce la secțiunea care gestionează datele reale.</p>
    </header>
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Fluxuri de lucru">
      {flows.filter((flow) => canOpenSection(flow.destination, access)).map((flow) => {
        const Icon = DASHBOARD_SECTION_META[flow.destination].icon;
        return <button key={flow.destination} type="button" onClick={() => onNavigate(flow.destination)} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          <span className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-5" /></span><span className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] text-slate-400">{flow.stage}</span></span>
          <span className="mt-4 block text-sm font-semibold text-slate-100">{flow.title}</span>
          <span className="mt-1 block min-h-10 text-xs leading-relaxed text-slate-400">{flow.description}</span>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-300 group-hover:text-violet-200">Deschide fluxul <ArrowUpRight className="size-3.5" /></span>
        </button>;
      })}
    </section>
  </div>;
}
