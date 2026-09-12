import { ArrowUpRight, DatabaseZap, Link2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function EngineEntryCard() {
  return (
    <Link
      to="/intern/avy-engine"
      className="group relative block overflow-hidden rounded-2xl border border-cyan-500/20 bg-[linear-gradient(120deg,hsl(var(--card))_0%,hsl(var(--card))_62%,rgba(6,182,212,.10)_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-500/40 hover:shadow-lg"
      aria-label="Deschide AVY Engine"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-600"><DatabaseZap className="size-5" /></span>
          <div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-600"><Sparkles className="size-3" /> Capability control plane</p><h2 className="mt-1 text-lg font-semibold">AVY Engine</h2><p className="mt-1 text-sm text-muted-foreground">Surse, documentație, funcții și integrări verificate pentru AVYRON OS și agenții AI.</p></div>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border/70 bg-background transition group-hover:border-cyan-500/40 group-hover:text-cyan-600"><ArrowUpRight className="size-4" /></span>
      </div>
      <div className="relative mt-4 flex items-center gap-2 border-t border-border/50 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-3.5 text-emerald-500" /> surse aprobate · zero execuție implicită <Link2 className="ml-auto size-3.5 text-cyan-600" /></div>
    </Link>
  );
}
