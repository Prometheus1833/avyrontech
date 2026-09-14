import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Bot, Check, CircleDollarSign, Clock3,
  Cloud, FolderKanban, Gauge, RefreshCw, ShieldCheck, Sparkles, Target, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import type { Access, SectionId } from "@/lib/access";
import { canOpenSection } from "@/lib/access";
import { osApi, type OsOverview } from "@/lib/osApi";

type Props = {
  access: Access;
  displayName: string;
  onOpenSection: (section: SectionId) => void;
  onOpenCommand: () => void;
};

const money = (minor: number) => new Intl.NumberFormat("ro-RO", {
  style: "currency", currency: "RON", maximumFractionDigits: 0,
}).format(minor / 100);

const relativeTime = (timestamp: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "acum";
  if (minutes < 60) return `acum ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `acum ${hours} h`;
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" }).format(timestamp);
};

const statusTone = (status: string) => {
  if (["funcțional", "conectat", "succeeded", "active"].includes(status)) return "bg-emerald-400";
  if (["eroare", "failed", "critic"].includes(status)) return "bg-rose-400";
  if (["atenție", "în_verificare", "running", "queued"].includes(status)) return "bg-amber-300";
  return "bg-slate-500";
};

const agentStatusLabel = (status: string) => ({
  succeeded: "finalizat",
  failed: "eșuat",
  running: "în desfășurare",
  queued: "în așteptare",
  awaiting_approval: "așteaptă aprobare",
  denied: "respins",
}[status] || status.replace(/_/g, " "));

const actionLabel = (action: OsOverview["approvals"][number]["action_class"]) => ({
  write: "scriere",
  external: "acțiune externă",
  financial: "acțiune financiară",
  publish: "publicare",
}[action]);

const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-2xl border border-white/[0.08] bg-[#10162a]/90 shadow-[0_24px_70px_-46px_rgba(124,58,237,0.9)] ${className}`}>
    {children}
  </section>
);

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-5 text-center text-xs leading-relaxed text-slate-400">
    {children}
  </div>
);

export default function AvyronOverview({ access, displayName, onOpenSection, onOpenCommand }: Props) {
  const [data, setData] = useState<OsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyApproval, setBusyApproval] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await osApi.overview());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Dashboardul nu a putut fi încărcat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = async (id: string, decision: "approved" | "rejected") => {
    setBusyApproval(id);
    try {
      await osApi.decideApproval(id, decision);
      toast.success(decision === "approved" ? "Acțiunea a fost aprobată." : "Acțiunea a fost respinsă.");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Decizia nu a putut fi salvată.");
    } finally {
      setBusyApproval(null);
    }
  };

  const metrics = useMemo(() => {
    if (!data) return [];
    if (access.isSuperAdmin) return [
      { label: "Leaduri deschise", value: data.metrics.openLeads, helper: `${data.metrics.leads} în total`, icon: Target, tone: "from-cyan-500/20" },
      { label: "Proiecte active", value: data.metrics.activeProjects, helper: `${data.metrics.projects} în portofoliu`, icon: FolderKanban, tone: "from-blue-500/20" },
      { label: "Venituri luna aceasta", value: money(data.metrics.revenuesMinor), helper: "estimare · echivalente RON cunoscute", icon: CircleDollarSign, tone: "from-emerald-500/20" },
      { label: "Cheltuieli luna aceasta", value: money(data.metrics.expensesMinor), helper: "estimare · echivalente RON cunoscute", icon: Gauge, tone: "from-violet-500/20" },
    ];
    if (access.isStaff) return [
      { label: "Leaduri deschise", value: data.metrics.openLeads, helper: `${data.metrics.leads} în total`, icon: Target, tone: "from-cyan-500/20" },
      { label: "Proiecte active", value: data.metrics.activeProjects, helper: `${data.metrics.projects} în portofoliu`, icon: FolderKanban, tone: "from-blue-500/20" },
      { label: "Clienți activi", value: data.metrics.clients, helper: "relații active", icon: Users, tone: "from-fuchsia-500/20" },
      { label: "Vizitatori", value: data.metrics.visits, helper: "ultimele 30 de zile", icon: Activity, tone: "from-emerald-500/20" },
    ];
    return [
      { label: "Proiectele mele", value: data.metrics.projects, helper: "acces autorizat", icon: FolderKanban, tone: "from-blue-500/20" },
      { label: "În lucru", value: data.metrics.activeProjects, helper: "proiecte active", icon: Activity, tone: "from-violet-500/20" },
    ];
  }, [access, data]);

  if (loading) return (
    <div className="grid gap-4 lg:grid-cols-12" aria-label="Se încarcă dashboardul AVYRON OS">
      <div className="h-40 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-12" />
      {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-3" />)}
      <div className="h-80 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-7" />
      <div className="h-80 animate-pulse rounded-2xl bg-white/[0.05] lg:col-span-5" />
    </div>
  );

  if (error || !data) return (
    <Panel className="p-8 text-center">
      <AlertTriangle className="mx-auto size-8 text-amber-300" />
      <h2 className="mt-3 font-display text-lg font-semibold text-white">Dashboard indisponibil temporar</h2>
      <p className="mt-1 text-sm text-slate-400">{error || "Nu există date disponibile."}</p>
      <button type="button" onClick={() => void load()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400">
        <RefreshCw className="size-4" /> Reîncearcă
      </button>
    </Panel>
  );

  return (
    <div className="flex flex-col gap-4 text-slate-100">
      <header className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/[0.16] via-[#11182d] to-cyan-500/[0.08] p-5 sm:p-6">
        <div aria-hidden className="absolute -right-20 -top-24 size-64 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-violet-200/70">Informare AVY · actualizată {relativeTime(data.generatedAt)}</p>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">Bun venit, {displayName}.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{data.briefing}</p>
          </div>
          <button type="button" onClick={onOpenCommand} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/15 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25">
            <Sparkles className="size-4" /> Deschide centrul de comandă <kbd className="ml-1 rounded border border-white/10 bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="p-4 sm:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200/70">Prioritate operațională</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">Necesită atenție · Azi</h2>
            </div>
            <span className="rounded-full bg-amber-300/10 px-2.5 py-1 text-xs font-semibold text-amber-200">{data.attention.length}</span>
          </div>
          <div className="space-y-2">
            {data.attention.length === 0 && <EmptyState>Nu există urgențe confirmate în modulele conectate.</EmptyState>}
            {data.attention.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenSection(item.destination as SectionId)} className="group flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[0.06]">
                <span className={`mt-1 size-2 shrink-0 rounded-full ${item.severity === "critic" ? "bg-rose-400 shadow-[0_0_14px_rgba(251,113,133,.7)]" : "bg-amber-300"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-100">{item.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.detail}</span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/70">Control uman</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-white">Centru de aprobări</h2>
            </div>
            <ShieldCheck className="size-5 text-fuchsia-300" />
          </div>
          <div className="space-y-3">
            {data.approvals.length === 0 && <EmptyState>{access.isSuperAdmin ? "Nicio acțiune AI nu așteaptă aprobare." : "Aprobările sunt vizibile utilizatorilor autorizați."}</EmptyState>}
            {data.approvals.slice(0, 4).map((approval) => (
              <div key={approval.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-fuchsia-400/10 text-fuchsia-300"><Bot className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{approval.agent_slug} · {actionLabel(approval.action_class)}</p>
                    <p className="mt-1 text-sm leading-snug text-slate-200">{approval.summary}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button disabled={busyApproval === approval.id} onClick={() => void decide(approval.id, "approved")} className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-400/12 px-2 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"><Check className="size-3" /> Aprobă</button>
                  <button onClick={() => onOpenSection("ai-os")} className="rounded-lg bg-white/[0.05] px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.1]">Revizuiește</button>
                  <button disabled={busyApproval === approval.id} onClick={() => void decide(approval.id, "rejected")} className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-400/10 px-2 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/20 disabled:opacity-50"><X className="size-3" /> Respinge</button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className={`grid gap-3 ${metrics.length > 2 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={`relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${metric.tone} to-[#10162a] p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className="mt-2 font-display text-2xl font-bold text-white">{metric.value}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{metric.helper}</p>
                </div>
                <span className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-violet-200"><Icon className="size-4" /></span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Panel className="p-4 sm:p-5 xl:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">Observabilitate AI</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Activitatea agenților</h2></div>
            {access.isSuperAdmin && <button type="button" onClick={() => onOpenSection("ai-os")} className="text-xs font-medium text-violet-300 hover:text-violet-200">Vezi agenții</button>}
          </div>
          <div className="space-y-2">
            {data.agentRuns.length === 0 && <EmptyState>{access.isSuperAdmin ? "Nu există rulări recente." : "Activitatea AI detaliată este rezervată rolurilor autorizate."}</EmptyState>}
            {data.agentRuns.slice(0, 6).map((run) => (
              <div key={run.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><Bot className="size-4" /></span>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-200">{run.agent_slug}</p><p className="text-[11px] text-slate-500">{run.steps} pași · {run.input_tokens + run.output_tokens} tokeni · {relativeTime(run.created_at)}</p></div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400"><span className={`size-2 rounded-full ${statusTone(run.status)}`} />{agentStatusLabel(run.status)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5 xl:col-span-5">
          <div className="mb-4 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">Stare sistem</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Infrastructură</h2></div><Cloud className="size-5 text-emerald-300" /></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {data.health.map((item) => (
              <div key={item.id} title={item.detail} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <span className={`size-2 rounded-full ${statusTone(item.status)}`} />
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300">{item.label}</span>
                <span className="text-[10px] text-slate-600">{item.status}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-300">Registrul integrărilor</h3><span className="text-[10px] text-slate-600">{data.integrations.length} înregistrate</span></div>
            {data.integrations.length === 0 ? <EmptyState>Nu există conectori externi validați. Aceștia vor apărea după configurare.</EmptyState> : (
              <div className="flex flex-wrap gap-2">
                {data.integrations.slice(0, 8).map((item, index) => <span key={`${item.name}-${index}`} className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400"><span className={`size-1.5 rounded-full ${statusTone(item.status)}`} />{item.name}</span>)}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="p-4 sm:p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-200/70">Acces rapid</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Centre AVYRON OS</h2></div>
          <p className="hidden text-xs text-slate-500 sm:block">Detaliile apar numai după deschiderea modulului.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Proiecte", helper: "Livrări și progres", icon: FolderKanban, section: "projects" },
            { label: "Leaduri & CRM", helper: "Pipeline și răspunsuri", icon: Target, section: "leads" },
            { label: "Financiar", helper: "Costuri și profitabilitate", icon: CircleDollarSign, section: "finance" },
            { label: "Agenți AI", helper: "Control și activitate", icon: Bot, section: "ai-os" },
            { label: "Domenii", helper: "DNS, SSL și active", icon: Cloud, section: "domains" },
            { label: "Echipă", helper: "Roluri și permisiuni", icon: Users, section: "team-staff" },
            { label: "Securitate", helper: "Incidente și audit", icon: ShieldCheck, section: "security" },
            { label: "Automatizări", helper: "Execuții și economie", icon: Clock3, section: "automations" },
          ].filter((item) => canOpenSection(item.section, access) || (access.isStaff && ["security", "automations"].includes(item.section))).map((item) => {
            const Icon = item.icon;
            return <button key={item.label} type="button" onClick={() => onOpenSection(item.section as SectionId)} className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-violet-400/25 hover:bg-violet-400/[0.06]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-medium text-slate-200">{item.label}</span><span className="block truncate text-[11px] text-slate-600">{item.helper}</span></span><ArrowRight className="ml-auto size-4 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-violet-300" /></button>;
          })}
        </div>
      </Panel>
    </div>
  );
}
