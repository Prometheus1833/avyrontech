import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CheckCircle2, Play, RefreshCw, SearchCheck, ShieldAlert } from "lucide-react";
import { ProjectWorkspacePicker } from "@/components/intern/ProjectWorkspacePicker";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth } from "@/lib/cfAuth";
import { toast } from "sonner";

type Diagnostic = { component: string; status: string; detail: string; checked_at?: number };
type DiagnosticPayload = { data: { run: { id: string; status: string; completed_at?: number } | null; results: Diagnostic[] } };
type WorkItem = { id: string; title: string; affected_module: string; priority: string; risk: string; status: string; acceptance_criteria: string };
type SeoAudit = {
  generatedAt: string;
  summary: { indexablePages: number; noindexPages: number; strategicProductPages: number; llmsPages: number };
  checkedAssets: { sitemap: boolean; robots: boolean; llms: boolean };
  recommendations: Array<{ route: string; code: string; recommendation: string }>;
  indexingEvidence: string;
};

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
  const [seo, setSeo] = useState<SeoAudit | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [running, setRunning] = useState(false);
  const [draft, setDraft] = useState({ title: "", problem: "", affectedModule: "", acceptanceCriteria: "", priority: "medium", risk: "medium" });

  const load = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const [diag, items, seoResult] = await Promise.all([
        cfAuth.request<DiagnosticPayload>("/api/admin/system/diagnostics"),
        cfAuth.request<{ data: WorkItem[] }>("/api/admin/codex-work-items"),
        cfAuth.request<{ data: SeoAudit }>("/api/admin/system/seo").catch(() => null),
      ]);
      setDiagnostics(diag.data.results);
      setWorkItems(items.data);
      setSeo(seoResult?.data ?? null);
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

      <section className="rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.08] via-[#10162a] to-cyan-500/[0.06] p-5" aria-labelledby="seo-audit-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">AVYRON OS · vizibilitate</p><h2 id="seo-audit-title" className="mt-1 flex items-center gap-2 font-display text-xl font-semibold"><SearchCheck className="size-5" /> Verificări SEO și indexabilitate</h2><p className="mt-1 text-xs text-slate-400">Raport din HTML-ul public al build-ului, sitemap, robots și llms.txt.</p></div>
          <Button variant="outline" onClick={() => void load()} className="gap-2"><RefreshCw className="size-4" /> Reîncarcă raportul</Button>
        </div>
        {seo ? <>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {[["URL-uri canonice în build", seo.summary.indexablePages], ["Pagini excluse intenționat", seo.summary.noindexPages], ["Pagini strategice Produse", seo.summary.strategicProductPages], ["Linkuri llms.txt în build", seo.summary.llmsPages]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.07] bg-black/15 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>)}
          </div>
          <p className="mt-3 text-xs text-slate-400">Generat: {new Date(seo.generatedAt).toLocaleString("ro-RO")} · Sitemap: {seo.checkedAssets.sitemap ? "prezent" : "lipsă"} · Robots: {seo.checkedAssets.robots ? "prezent" : "lipsă"} · llms.txt: {seo.checkedAssets.llms ? "prezent" : "lipsă"}.</p>
          <p className="mt-2 text-xs text-slate-400">{seo.indexingEvidence}</p>
          {seo.recommendations.length ? <div className="mt-4 space-y-2"><h3 className="text-sm font-semibold">Corecții recomandate ({seo.recommendations.length})</h3><ul className="space-y-2">{seo.recommendations.map((item, index) => <li key={`${item.code}-${item.route}-${index}`} className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3 text-xs"><code className="text-amber-200">{item.route}</code><p className="mt-1 text-slate-300">{item.recommendation}</p></li>)}</ul></div> : <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3 text-xs text-emerald-200">Nu au fost detectate lipsuri tehnice în verificările acestui build.</p>}
        </> : <p className="mt-4 text-xs text-slate-400">Raportul SEO nu este disponibil încă pentru acest build.</p>}
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
