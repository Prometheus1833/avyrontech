import { ArrowUpRight, Bot, Braces, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function AiProductionEntryCard() {
  return (
    <Link
      to="/intern/ai-projects"
      className="group relative block overflow-hidden rounded-2xl border border-violet-500/20 bg-[linear-gradient(120deg,hsl(var(--card))_0%,hsl(var(--card))_62%,rgba(124,58,237,.10)_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-500/40 hover:shadow-lg"
      aria-label="Deschide AI AVY Prod — Proiecte AI"
    >
      <div className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-500">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-500">
              <Sparkles className="size-3" /> AI AVY Prod
            </p>
            <h2 className="mt-1 text-lg font-semibold">Proiecte AI</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Strategie, agenți, memorie și producție de conținut pentru brandurile proprii și proiectele administrate.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {['Avyron WEB', 'Cutiuța Magică', 'Retuvo'].map((name) => (
              <span key={name} className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">{name}</span>
            ))}
          </div>
          <span className="grid size-9 place-items-center rounded-full border border-border/70 bg-background transition group-hover:border-violet-500/40 group-hover:text-violet-500">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
      <div className="relative mt-4 flex items-center gap-2 border-t border-border/50 pt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <Braces className="size-3.5 text-emerald-500" /> ciorne controlate · aprobări umane · Cloudflare native
      </div>
    </Link>
  );
}
