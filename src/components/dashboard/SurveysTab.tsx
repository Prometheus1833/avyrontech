import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Database, FileCheck2, Loader2, RefreshCw, Save, Settings2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { surveyAdminApi, type SurveyOverview, type SurveyTemplate } from "@/lib/surveyAdminApi";

type View = "dashboard" | "pipeline" | "templates" | "settings";

const statusLabels: Record<string, string> = {
  draft: "Draft", ready: "Pregătit", sent: "Trimis", opened: "Deschis", in_progress: "În completare",
  completed: "Completat", needs_information: "Necesită informații", reviewed: "Revizuit", approved: "Aprobat",
  expired: "Expirat", archived: "Arhivat",
};

const formatDate = (value: number) => value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";

export default function SurveysTab() {
  const [view, setView] = useState<View>("dashboard");
  const [data, setData] = useState<SurveyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(365);
  const [publicEnabled, setPublicEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await surveyAdminApi.overview();
      setData(overview);
      setRetentionDays(overview.settings.retention_days);
      setPublicEnabled(Boolean(overview.settings.public_enabled));
      setAiEnabled(Boolean(overview.settings.ai_enabled));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Surveys nu poate fi încărcat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const total = useMemo(() => data?.statuses.reduce((sum, row) => sum + Number(row.total), 0) ?? 0, [data]);
  const completed = useMemo(() => data?.statuses.filter((row) => ["completed", "reviewed", "approved"].includes(row.status)).reduce((sum, row) => sum + Number(row.total), 0) ?? 0, [data]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await surveyAdminApi.saveSettings({ retentionDays, publicEnabled, aiEnabled });
      toast.success("Setările Surveys au fost salvate.");
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Setările nu au putut fi salvate.");
    } finally { setSaving(false); }
  };

  const updateTemplate = async (template: SurveyTemplate, field: "active" | "publicVisible") => {
    try {
      await surveyAdminApi.saveTemplate(template.id, {
        active: field === "active" ? template.active !== 1 : template.active === 1,
        publicVisible: field === "publicVisible" ? template.public_visible !== 1 : template.public_visible === 1,
      });
      toast.success(`Modelul „${template.title}” a fost actualizat.`);
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Modelul nu a putut fi actualizat.");
    }
  };

  const views: Array<{ id: View; label: string }> = [
    { id: "dashboard", label: "Dashboard" }, { id: "pipeline", label: "Pipeline și rezultate" },
    { id: "templates", label: "Modele" }, { id: "settings", label: "Setări" },
  ];

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 via-white/[0.025] to-cyan-400/[0.05] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">Platformă · Smart Surveys</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-white">Surveys</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">Modele, parcursuri, răspunsuri, briefuri și politici administrate din aceeași zonă, direct din datele D1.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
          </button>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Secțiuni Surveys">
          {views.map((item) => <button key={item.id} type="button" onClick={() => setView(item.id)} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${view === item.id ? "bg-violet-400/15 text-violet-200 ring-1 ring-violet-300/20" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>{item.label}</button>)}
        </nav>
      </header>

      {loading && !data ? <div className="grid min-h-48 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.02]"><Loader2 className="size-6 animate-spin text-violet-300" /></div> : null}
      {error ? <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.06] p-4 text-sm text-rose-100">{error}</div> : null}

      {data && view === "dashboard" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Survey-uri", value: total, icon: Database },
              { label: "Finalizate", value: completed, icon: FileCheck2 },
              { label: "Modele active", value: data.templates.filter((item) => item.active).length, icon: Workflow },
              { label: "Briefuri", value: data.briefs.reduce((sum, row) => sum + Number(row.total), 0), icon: Activity },
            ].map((card) => { const Icon = card.icon; return <article key={card.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><Icon className="size-4 text-violet-300" /><p className="mt-4 text-2xl font-bold text-white">{card.value}</p><p className="mt-1 text-xs text-slate-400">{card.label}</p></article>; })}
          </section>
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <h2 className="text-sm font-semibold text-white">Activitate recentă</h2>
              <div className="mt-3 divide-y divide-white/[0.06]">
                {data.recent.slice(0, 6).map((row) => <div key={row.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{row.title}</p><p className="mt-1 text-[11px] text-slate-500">{row.completion}% · {formatDate(row.updated_at)}</p></div><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-slate-300">{statusLabels[row.status] || row.status}</span></div>)}
                {!data.recent.length ? <p className="py-8 text-center text-sm text-slate-500">Nu există încă survey-uri.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <h2 className="text-sm font-semibold text-white">Distribuție pipeline</h2>
              <div className="mt-4 space-y-3">{data.statuses.map((row) => <div key={row.status} className="flex items-center justify-between gap-3"><span className="text-xs text-slate-400">{statusLabels[row.status] || row.status}</span><span className="font-mono text-xs text-slate-200">{row.total}</span></div>)}</div>
            </div>
          </section>
        </>
      ) : null}

      {data && view === "pipeline" ? (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
          <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-white/[0.035] text-slate-400"><tr><th className="px-4 py-3">Survey</th><th className="px-4 py-3">Stadiu</th><th className="px-4 py-3">Progres</th><th className="px-4 py-3">Răspuns</th><th className="px-4 py-3">Brief</th><th className="px-4 py-3">Actualizat</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{data.recent.map((row) => <tr key={row.id} className="text-slate-300"><td className="px-4 py-3"><p className="font-medium text-slate-100">{row.title}</p><p className="mt-1 font-mono text-[10px] text-slate-600">{row.id}</p></td><td className="px-4 py-3">{statusLabels[row.status] || row.status}</td><td className="px-4 py-3">{row.completion}%</td><td className="px-4 py-3">{row.response_revision ? `rev. ${row.response_revision}` : "—"}</td><td className="px-4 py-3">{row.brief_status || "—"}</td><td className="px-4 py-3">{formatDate(row.updated_at)}</td></tr>)}</tbody></table></div>
          {!data.recent.length ? <p className="p-8 text-center text-sm text-slate-500">Nu există rezultate de afișat.</p> : null}
        </div>
      ) : null}

      {data && view === "templates" ? (
        <section className="grid gap-3 md:grid-cols-2">
          {data.templates.map((template) => <article key={template.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-white">{template.title}</h2><p className="mt-1 font-mono text-[10px] text-slate-500">{template.current_version_id || "Fără versiune curentă"}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${template.active ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-400/10 text-slate-400"}`}>{template.active ? "Activ" : "Retras"}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!data.canEdit} onClick={() => void updateTemplate(template, "active")} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">{template.active ? "Retrage" : "Activează"}</button><button type="button" disabled={!data.canEdit} onClick={() => void updateTemplate(template, "publicVisible")} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">{template.public_visible ? "Ascunde public" : "Publică în catalog"}</button></div></article>)}
        </section>
      ) : null}

      {data && view === "settings" ? (
        <section className="max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Settings2 className="size-4" /></span><div><h2 className="text-sm font-semibold text-white">Politici globale</h2><p className="mt-1 text-xs text-slate-500">Aplicate întregului motor Smart Surveys.</p></div></div>
          <label className="mt-5 block text-xs font-medium text-slate-300">Păstrarea datelor (zile)<input disabled={!data.canEdit} type="number" min={7} max={1825} value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-300/40 disabled:opacity-60" /></label>
          <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] p-3"><span><span className="block text-sm font-medium text-slate-200">Acces public</span><span className="mt-1 block text-xs text-slate-500">Permite traseele publice pentru modelele vizibile.</span></span><input disabled={!data.canEdit} type="checkbox" checked={publicEnabled} onChange={(event) => setPublicEnabled(event.target.checked)} className="size-4 accent-violet-400 disabled:opacity-50" /></label>
          <label className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-white/[0.07] p-3"><span><span className="block text-sm font-medium text-slate-200">Asistență AI pentru brief</span><span className="mt-1 block text-xs text-slate-500">Rămâne supusă aprobării umane și politicilor AVYRON OS.</span></span><input disabled={!data.canEdit} type="checkbox" checked={aiEnabled} onChange={(event) => setAiEnabled(event.target.checked)} className="size-4 accent-violet-400 disabled:opacity-50" /></label>
          {!data.canEdit ? <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs text-amber-100/75">Poți consulta configurația. Modificarea politicilor este rezervată administratorilor.</p> : null}
          <button type="button" onClick={() => void saveSettings()} disabled={saving || !data.canEdit} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Salvează setările</button>
        </section>
      ) : null}
    </div>
  );
}
