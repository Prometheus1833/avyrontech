import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight, Bot, BrainCircuit, CheckCircle2, CircleDashed,
  Layers3, Radio, ShieldCheck, Sparkles,
} from "lucide-react";
import PageBackLink from "@/components/site/PageBackLink";
import { aiProjectsApi, type AiProjectListRow } from "@/lib/aiProjectsApi";

const objectiveLabel: Record<AiProjectListRow["primary_objective"], string> = {
  sales: "Vânzări", promotion: "Promovare", visibility: "Vizibilitate",
  monetization: "Monetizare", community: "Comunitate",
};

const statusLabel: Record<AiProjectListRow["status"], string> = {
  setup: "În configurare", active: "Activ", paused: "În pauză", archived: "Arhivat",
};

const statusStyle: Record<AiProjectListRow["status"], string> = {
  setup: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  paused: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  archived: "border-border bg-muted text-muted-foreground",
};

export default function AiProjects() {
  const [projects, setProjects] = useState<AiProjectListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await aiProjectsApi.list();
      setProjects(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proiectele AI nu au putut fi încărcate.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({
      title: "Proiecte AI — AI AVY Prod",
      description: "Producție AI controlată pentru proiectele administrate de Avyron.",
      path: "/intern/ai-projects",
      robots: "noindex, nofollow",
    }));
  }, []);

  const connected = projects.reduce((total, project) => total + project.channels_connected, 0);
  const readyAgents = projects.reduce((total, project) => total + project.agents_ready, 0);

  return (
    <main className="min-h-screen bg-secondary/30 px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageBackLink to="/profil" label="Înapoi" title="Înapoi la dashboard" />

        <header className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-card/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-violet-500">
                <Sparkles className="size-3.5" /> AI AVY Prod
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Proiecte AI</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Agenți specializați, strategie, memorie și conținut pentru produsele Avyron și proiectele clienților. Publicarea rămâne controlată și necesită aprobare umană.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                [projects.length, "proiecte"], [readyAgents, "agenți gata"], [connected, "canale active"],
              ].map(([value, label]) => (
                <div key={label} className="min-w-24 rounded-2xl border border-border/60 bg-background/60 px-3 py-3">
                  <p className="text-xl font-semibold">{loading ? "—" : value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Portofoliu administrat</h2>
            <p className="text-sm text-muted-foreground">Separat de proiectele operaționale aflate în lucru.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-500" /> acces explicit
          </span>
        </div>

        {loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Se încarcă proiectele AI">
            {[0, 1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl border border-border/50 bg-card/50" />)}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-3 rounded-xl border border-border px-3 py-2 font-medium hover:bg-muted">Reîncearcă</button>
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Layers3 className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Nu ai încă proiecte AI atribuite.</p>
            <p className="mt-1 text-sm text-muted-foreground">Accesul este acordat explicit de administratorul platformei.</p>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Lista proiectelor AI">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/intern/ai-projects/${project.slug}`}
                className="group flex min-h-72 flex-col rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-500/35 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-500">
                    <Bot className="size-5" />
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusStyle[project.status]}`}>
                    {statusLabel[project.status]}
                  </span>
                </div>
                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {project.ownership_scope === "agency" ? "Produs Avyron" : "Administrare client"}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{project.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{project.summary}</p>
                </div>
                <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                  <div className="rounded-xl bg-muted/55 p-2.5">
                    <Radio className="size-3.5 text-cyan-500" />
                    <p className="mt-1 text-sm font-semibold">{project.channels_connected}/{project.channels_total}</p>
                    <p className="text-[10px] text-muted-foreground">canale</p>
                  </div>
                  <div className="rounded-xl bg-muted/55 p-2.5">
                    <BrainCircuit className="size-3.5 text-violet-500" />
                    <p className="mt-1 text-sm font-semibold">{project.agents_ready}/{project.agents_total}</p>
                    <p className="text-[10px] text-muted-foreground">agenți</p>
                  </div>
                  <div className="rounded-xl bg-muted/55 p-2.5">
                    {project.content_pending ? <CircleDashed className="size-3.5 text-amber-500" /> : <CheckCircle2 className="size-3.5 text-emerald-500" />}
                    <p className="mt-1 text-sm font-semibold">{project.content_pending}</p>
                    <p className="text-[10px] text-muted-foreground">de revizuit</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs">
                  <span>{objectiveLabel[project.primary_objective]} · {project.automation_mode === "manual" ? "Manual" : project.automation_mode === "approval" ? "Cu aprobare" : "Automat"}</span>
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
