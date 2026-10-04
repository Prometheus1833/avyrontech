import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bot, CalendarClock, CheckCircle2, FileCheck2, RefreshCw, Send, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { aiProjectsApi, type AiProjectDetail } from "@/lib/aiProjectsApi";
import { Button } from "@/components/ui/button";

export default function SocialMediaManagerTab() {
  const [data, setData] = useState<AiProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await aiProjectsApi.detail("avyron-web")); }
    catch { toast.error("Managerul Social Media nu a putut încărca proiectul AI AVYRON."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const content = useMemo(() => [...(data?.content || [])].sort((a, b) => b.created_at - a.created_at), [data]);
  const pending = content.filter((item) => item.status === "pending_approval" || item.status === "draft");
  const approve = async (id: string, status: "approved" | "rejected") => {
    if (!data) return;
    setSaving(id);
    try { await aiProjectsApi.updateContent(data.project.id, id, status); toast.success(status === "approved" ? "Propunerea este aprobată pentru următorul pas; nu a fost publicată automat." : "Propunerea a fost respinsă."); await load(); }
    catch { toast.error("Decizia nu a putut fi salvată."); }
    finally { setSaving(null); }
  };

  return <div className="space-y-4 text-slate-100">
    <header className="rounded-2xl border border-fuchsia-300/15 bg-gradient-to-br from-fuchsia-500/[0.13] via-[#11182d] to-cyan-400/[0.07] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-fuchsia-200/70">AI AVY Prod · aprobare umană</p><h1 className="mt-2 font-display text-2xl font-bold text-white">Manager Social Media</h1><p className="mt-1 max-w-3xl text-sm text-slate-400">Propuneri, rezultate și activități planificate pentru proiectul canonic AVYRON. Aprobarea pregătește pasul următor, fără publicare automată.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} className="border-white/10 bg-white/[0.03] text-slate-300"><RefreshCw className="size-4" /> Actualizează</Button><Button asChild className="bg-fuchsia-600 hover:bg-fuchsia-500"><Link to="/intern/ai-projects/avyron-web">Studio complet <ArrowUpRight className="size-4" /></Link></Button></div></div></header>
    {loading ? <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" /> : <>
      <div className="grid gap-3 sm:grid-cols-4"><Metric icon={FileCheck2} label="De revizuit" value={pending.length} /><Metric icon={CheckCircle2} label="Aprobate" value={content.filter((item) => item.status === "approved").length} /><Metric icon={CalendarClock} label="Activități viitoare" value={(data?.socialJobs || []).filter((job) => ["queued","generating","draft_ready","awaiting_approval"].includes(job.status)).length} /><Metric icon={Bot} label="Agenți pregătiți" value={(data?.agents || []).filter((agent) => agent.status === "ready").length} /></div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,.7fr)]"><section className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5"><div className="mb-4"><h2 className="font-display text-lg font-semibold text-white">Următoarele aprobări</h2><p className="text-xs text-slate-500">Drafturile sunt ordonate de la cel mai recent. Nicio acțiune externă nu pleacă de aici fără aprobare.</p></div><div className="space-y-2">{pending.slice(0, 12).map((item) => <article key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] text-fuchsia-300/70">{item.format} · {item.objective}</p><h3 className="mt-1 truncate text-sm font-semibold text-slate-200">{item.title}</h3></div><span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">{item.status === "draft" ? "Draft" : "Așteaptă aprobarea"}</span></div><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">{item.caption}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[10px] text-slate-600">{new Date(item.created_at).toLocaleString("ro-RO")}</span><div className="flex gap-1.5"><button type="button" disabled={saving === item.id} onClick={() => void approve(item.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-rose-400/10 px-2.5 py-1.5 text-[11px] text-rose-200"><XCircle className="size-3.5" /> Respinge</button><button type="button" disabled={saving === item.id} onClick={() => void approve(item.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-[11px] text-emerald-200"><CheckCircle2 className="size-3.5" /> Aprobă</button></div></div></article>)}{pending.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Nu există propuneri care așteaptă decizia.</p>}</div></section>
      <aside className="h-fit rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5"><h2 className="font-display text-lg font-semibold text-white">Plan și rezultate</h2><div className="mt-3 space-y-2">{(data?.socialJobs || []).slice(0, 10).map((job) => <div key={job.id} className="rounded-xl border border-white/[0.06] p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-medium text-slate-300">{job.topic}</p><span className="text-[10px] text-cyan-300">{job.primary_channel}</span></div><p className="mt-1 text-[10px] text-slate-600">{job.kind} · {new Date(job.due_at).toLocaleString("ro-RO")} · {job.status}</p></div>)}{(data?.socialJobs || []).length === 0 && <p className="text-xs text-slate-600">Nu există activități planificate.</p>}</div><div className="mt-4 rounded-xl border border-emerald-300/10 bg-emerald-400/[0.05] p-3"><p className="flex items-center gap-2 text-xs font-medium text-emerald-200"><Send className="size-3.5" /> Control editorial</p><p className="mt-1 text-[11px] leading-relaxed text-slate-500">Mod: {data?.project.automation_mode || "approval"}. Publicarea reală rămâne separată și cere conector verificat plus autorizare.</p></div></aside></div>
    </>}
  </div>;
}

const Metric = ({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: number }) => <div className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><p className="flex items-center gap-2 text-xs text-slate-500"><Icon className="size-4 text-fuchsia-300" /> {label}</p><p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p></div>;
