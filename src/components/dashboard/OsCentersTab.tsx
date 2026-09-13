import {
  Activity, ArchiveRestore, Beaker, Blocks, BookOpen, Bot, CalendarClock, Cloud,
  FileCheck2, FileKey2, Gauge, Globe2, HeartHandshake, Mail, MessageSquare, Plug,
  RefreshCcw, ShieldCheck, TimerReset, UserRoundCheck, Workflow,
} from "lucide-react";

const modules = [
  { group: "AI și automatizare", name: "Centru de aprobări", detail: "Aprobă, revizuiește sau respinge acțiunile propuse de agenți.", status: "activ", icon: UserRoundCheck },
  { group: "AI și automatizare", name: "Activitate agenți", detail: "Rulări, pași, resurse, cost estimat și rezultat.", status: "activ", icon: Bot },
  { group: "AI și automatizare", name: "Centru de automatizări", detail: "Execuții, erori, următoarea rulare și economie de timp.", status: "în dezvoltare", icon: Workflow },
  { group: "AI și automatizare", name: "Pluginuri", detail: "Registru verificat de capabilități, versiuni și permisiuni.", status: "fundație existentă", icon: Blocks },
  { group: "Clienți și livrare", name: "Profitabilitate clienți", detail: "Venit, cost alocat, marjă estimată, upsell și risc.", status: "fundație existentă", icon: Gauge },
  { group: "Clienți și livrare", name: "SLA și termene", detail: "Răspuns, livrare și suport cu avertizare înainte de depășire.", status: "în dezvoltare", icon: TimerReset },
  { group: "Clienți și livrare", name: "Solicitări de modificare", detail: "Solicitări separate de proiect, cu status și cost suplimentar.", status: "în dezvoltare", icon: RefreshCcw },
  { group: "Clienți și livrare", name: "Urmărirea livrabilelor", detail: "Livrabile, responsabil, termen, aprobare și predare.", status: "în dezvoltare", icon: FileCheck2 },
  { group: "Clienți și livrare", name: "Onboarding / Offboarding", detail: "Checklisturi controlate pentru pornire, predare și arhivare.", status: "în dezvoltare", icon: HeartHandshake },
  { group: "Infrastructură și siguranță", name: "Stare infrastructură", detail: "Site, app, API, auth, baze de date, Workers, Pages și email.", status: "activ parțial", icon: Cloud },
  { group: "Infrastructură și siguranță", name: "Stare integrări", detail: "Cloudflare, GitHub, financiar, email, Google, Meta și altele.", status: "activ parțial", icon: Plug },
  { group: "Infrastructură și siguranță", name: "Centru de securitate", detail: "Autentificări, rate limits, incidente, chei, domenii și SSL.", status: "fundație existentă", icon: ShieldCheck },
  { group: "Infrastructură și siguranță", name: "Centru de erori", detail: "Cloudflare, API, formulare, email, webhookuri, plăți și agenți.", status: "în dezvoltare", icon: Activity },
  { group: "Infrastructură și siguranță", name: "Backup și recuperare", detail: "Starea copiilor, teste de restaurare și recovery controlat.", status: "în dezvoltare", icon: ArchiveRestore },
  { group: "Infrastructură și siguranță", name: "Domenii și active digitale", detail: "Expirări, DNS, SSL, redirecturi, subdomenii și oportunități.", status: "fundație existentă", icon: Globe2 },
  { group: "Cunoaștere și active", name: "Centru de documente și cunoaștere", detail: "Oferte, contracte, briefuri, facturi și documentație cu căutare AI.", status: "fundație existentă", icon: BookOpen },
  { group: "Cunoaștere și active", name: "Seif de active", detail: "Elemente de brand și documente private; secretele rămân în configurările securizate Cloudflare.", status: "în dezvoltare", icon: FileKey2 },
  { group: "Creștere și conformitate", name: "Comentarii", detail: "Moderarea centralizată a comentariilor din blog și pagini.", status: "în dezvoltare", icon: MessageSquare },
  { group: "Creștere și conformitate", name: "Vizite și analytics", detail: "Trafic first-party, funneluri și conversii.", status: "activ", icon: Activity },
  { group: "Creștere și conformitate", name: "Abonați / Newsletter", detail: "Liste, consimțământ, campanii și dezabonare.", status: "în dezvoltare", icon: Mail },
  { group: "Creștere și conformitate", name: "Programări", detail: "Planificare, responsabil, client și reminder.", status: "în dezvoltare", icon: CalendarClock },
  { group: "Creștere și conformitate", name: "Centru de experimente", detail: "Teste A/B, CTA-uri, prețuri, conversii și rezultate.", status: "în dezvoltare", icon: Beaker },
  { group: "Creștere și conformitate", name: "Confidențialitate și consimțământ", detail: "GDPR, cereri de export/ștergere, consimțăminte și politici active.", status: "fundație existentă", icon: ShieldCheck },
  { group: "Creștere și conformitate", name: "Calendar juridic", detail: "Contracte, politici, accesibilitate și obligații care expiră.", status: "în dezvoltare", icon: CalendarClock },
] as const;

const tones: Record<string, string> = {
  "activ": "bg-emerald-400/10 text-emerald-300 border-emerald-300/15",
  "activ parțial": "bg-cyan-400/10 text-cyan-300 border-cyan-300/15",
  "fundație existentă": "bg-violet-400/10 text-violet-300 border-violet-300/15",
  "în dezvoltare": "bg-amber-300/10 text-amber-200 border-amber-200/15",
};

export default function OsCentersTab() {
  const groups = Array.from(new Set(modules.map((module) => module.group)));
  return <div className="space-y-4 text-slate-100">
    <header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.14] via-[#11182d] to-cyan-400/[0.06] p-5 sm:p-6"><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-violet-200/70">Arhitectură modulară</p><h1 className="mt-2 font-display text-2xl font-bold text-white">Centre AVYRON OS</h1><p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">Inventarul unic al capabilităților operaționale. Statusurile separă funcțiile active de fundațiile existente și modulele care urmează să primească fluxuri complete.</p></header>
    {groups.map((group) => <section key={group} className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5"><h2 className="font-display text-base font-semibold text-white">{group}</h2><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{modules.filter((module) => module.group === group).map((module) => { const Icon = module.icon; return <article key={module.name} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span><div><h3 className="text-sm font-medium text-slate-200">{module.name}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{module.detail}</p></div></div><span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tones[module.status]}`}>{module.status}</span></article>; })}</div></section>)}
  </div>;
}
