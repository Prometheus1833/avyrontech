import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, Play, RefreshCw, ShieldAlert } from "lucide-react";
import { ProjectWorkspacePicker } from "@/components/intern/ProjectWorkspacePicker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { toast } from "sonner";

type Diagnostic = { component: string; status: string; detail: string; checked_at?: number };
type DiagnosticPayload = { data: { run: { id: string; status: string; completed_at?: number } | null; results: Diagnostic[] } };
type WorkItem = { id: string; title: string; affected_module: string; priority: string; risk: string; status: string; acceptance_criteria: string };

const statusClass: Record<string, string> = {
  healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  limited: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  degraded: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  not_configured: "border-slate-400/15 bg-slate-400/[0.07] text-slate-400",
  error: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  unknown: "border-slate-400/15 bg-slate-400/[0.07] text-slate-400",
};

export const StaffMaintenanceTab = () => {
  const { isSuperAdmin } = useAuth();
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [running, setRunning] = useState(false);
  const [draft, setDraft] = useState({ title: "", problem: "", affectedModule: "", acceptanceCriteria: "", priority: "medium", risk: "medium" });

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [diag, items] = await Promise.all([
        cfAuth.request<DiagnosticPayload>("/api/admin/system/diagnostics"),
        cfAuth.request<{ data: WorkItem[] }>("/api/admin/codex-work-items"),
      ]);
      setDiagnostics(diag.data.results);
      setWorkItems(items.data);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Starea sistemului nu a putut fi încărcată."); }
  }, [isSuperAdmin]);

  useEffect(() => { void load(); }, [load]);

  const runDiagnostics = async () => {
    setRunning(true);
    try {
      const result = await cfAuth.request<DiagnosticPayload>("/api/admin/system/diagnostics/run", { method: "POST" });
      setDiagnostics(result.data.results);
      toast.success("Diagnosticele sigure au fost actualizate.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Diagnosticele nu au rulat."); }
    finally { setRunning(false); }
  };

  const createWorkItem = async () => {
    try {
      await cfAuth.request("/api/admin/codex-work-items", { method: "POST", body: JSON.stringify({ ...draft, context: "Propunere creată manual din AVYRON OS", likelyFiles: [] }) });
      setDraft({ title: "", problem: "", affectedModule: "", acceptanceCriteria: "", priority: "medium", risk: "medium" });
      await load();
      toast.success("Pachetul Codex a fost propus; nu s-a executat cod.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Propunerea nu a putut fi salvată."); }
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    try {
      await cfAuth.request(`/api/admin/codex-work-items/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
      toast.success(status === "approved" ? "Pachet aprobat pentru preluare manuală." : "Pachet respins.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Starea nu a putut fi schimbată."); }
  };

  return <div className="space-y-6 text-slate-100">
    {isSuperAdmin && <>
      <section className="rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[0.08] via-[#10162a] to-violet-500/[0.08] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">Cloudflare control plane</p><h2 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold"><Activity className="size-5" /> Diagnostice sistem</h2><p className="mt-1 text-xs text-slate-400">Teste de citire și configurare, fără inferențe AI scumpe și fără a afișa secrete.</p></div><Button onClick={() => void runDiagnostics()} disabled={running} className="gap-2"><RefreshCw className={`size-4 ${running ? "animate-spin" : ""}`} /> {running ? "Se verifică…" : "Rulează verificările"}</Button></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{diagnostics.map((item) => <article key={item.component} className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold">{item.component}</h3><span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${statusClass[item.status] || statusClass.unknown}`}>{item.status.replace(/_/g, " ")}</span></div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{item.detail}</p></article>)}</div>
        {!diagnostics.length && <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">Nu există încă o rulare. Apasă „Rulează verificările”.</p>}
      </section>

      <section className="rounded-2xl border border-violet-400/15 bg-[#10162a]/90 p-5">
        <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Bot className="size-4" /></span><div><h2 className="font-display text-lg font-semibold">Codex Work Items</h2><p className="text-xs text-slate-500">Propuneri structurate și aprobabile. Aprobarea nu execută automat cod și nu publică nimic.</p></div></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2"><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Titlu" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm" /><input value={draft.affectedModule} onChange={(event) => setDraft({ ...draft, affectedModule: event.target.value })} placeholder="Modul afectat" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm" /><textarea value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} placeholder="Problemă și context" className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm" /><textarea value={draft.acceptanceCriteria} onChange={(event) => setDraft({ ...draft, acceptanceCriteria: event.target.value })} placeholder="Criterii de acceptare" className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm" /></div>
        <Button className="mt-3 gap-2" disabled={!draft.title || !draft.problem || !draft.affectedModule || !draft.acceptanceCriteria} onClick={() => void createWorkItem()}><Play className="size-4" /> Propune pachet</Button>
        <div className="mt-4 space-y-2">{workItems.map((item) => <article key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-sm font-medium">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.affected_module} · prioritate {item.priority} · risc {item.risk}</p><p className="mt-2 text-[11px] text-slate-400">{item.acceptance_criteria}</p></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-slate-400">{item.status}</span>{item.status === "proposed" && <><Button size="sm" variant="outline" onClick={() => void decide(item.id, "rejected")}><ShieldAlert className="mr-1 size-3.5" /> Respinge</Button><Button size="sm" onClick={() => void decide(item.id, "approved")}><CheckCircle2 className="mr-1 size-3.5" /> Aprobă</Button></>}</div></div></article>)}</div>
      </section>
    </>}
    <ProjectWorkspacePicker mode="maintenance" />
  </div>;
};
