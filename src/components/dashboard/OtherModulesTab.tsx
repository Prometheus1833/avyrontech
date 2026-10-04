import { ArrowUpRight, Command, MessageSquare, MessagesSquare, Megaphone, Radar, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import type { SectionId } from "@/lib/access";

const internalModules: Array<{
  title: string;
  detail: string;
  status: string;
  icon: typeof Wrench;
  destination?: SectionId;
  href?: string;
}> = [
  { title: "Solicitări clienți", detail: "Tichete și conversații care necesită răspuns.", status: "Activ", icon: MessageSquare, destination: "staff-tickets" },
  { title: "Chat intern", detail: "Conversațiile operaționale ale echipei AVYRON.", status: "Activ", icon: MessagesSquare, destination: "intern" },
  { title: "Anunțuri", detail: "Actualizări și comunicări interne pentru echipă.", status: "Activ", icon: Megaphone, destination: "announcements" },
  { title: "AVY Engine", detail: "Registru de capabilități, surse, conectori și documentație privată.", status: "Activ parțial", icon: Command, href: "/intern/avy-engine" },
  { title: "Rapoarte transversale", detail: "Rapoarte unificate între proiecte, vânzări, mentenanță și platformă.", status: "De dezvoltat", icon: Radar },
];

export default function OtherModulesTab({ onNavigate }: { onNavigate: (section: SectionId) => void }) {
  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">Inventar funcțional</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Altele</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Funcțiile care nu au nevoie de o poziție permanentă în meniu rămân accesibile aici. Starea lor arată clar ce funcționează și ce trebuie dezvoltat în continuare.</p>
      </header>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Alte module AVYRON OS">
        {internalModules.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <div className="flex items-start justify-between gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span><span className="rounded-full border border-white/[0.08] px-2 py-1 text-[9px] uppercase tracking-wide text-slate-400">{item.status}</span></div>
              <h2 className="mt-4 text-sm font-semibold text-slate-100">{item.title}</h2>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-slate-400">{item.detail}</p>
              {(item.destination || item.href) && <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-300">Deschide <ArrowUpRight className="size-3.5" /></span>}
            </>
          );
          if (item.href) return <Link key={item.title} to={item.href} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/30 hover:bg-violet-500/[0.06]">{content}</Link>;
          return <button key={item.title} type="button" disabled={!item.destination} onClick={() => item.destination && onNavigate(item.destination)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left transition enabled:hover:border-violet-400/30 enabled:hover:bg-violet-500/[0.06] disabled:cursor-default">{content}</button>;
        })}
      </section>
    </div>
  );
}
