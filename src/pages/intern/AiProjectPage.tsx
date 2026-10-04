import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bot, BrainCircuit, CalendarClock, Check, CheckCircle2, CircleDashed,
  BookOpen, Database, Eye, Globe2, Link2, ListChecks,
  LockKeyhole, MessageSquareText, Newspaper, Radio, RefreshCw, RotateCcw,
  Save, Send, ShieldCheck, Sparkles, Target, Trash2, UserMinus, UserRoundPlus, Users,
} from "lucide-react";
import { toast } from "sonner";
import PageBackLink from "@/components/site/PageBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  aiProjectsApi, type AiChannelProvider, type AiContentFormat,
  type AiContentItem, type AiObjective, type AiProjectDetail,
} from "@/lib/aiProjectsApi";

const providers: Record<AiChannelProvider, string> = {
  facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok",
  threads: "Threads", linkedin: "LinkedIn", whatsapp: "WhatsApp", messenger: "Messenger",
};
const objectives: Array<{ value: AiObjective; label: string }> = [
  { value: "sales", label: "Vânzări" }, { value: "promotion", label: "Promovare" },
  { value: "visibility", label: "Vizibilitate" }, { value: "monetization", label: "Monetizare" },
  { value: "community", label: "Comunitate" },
];
const formats: Array<{ value: AiContentFormat; label: string }> = [
  { value: "post", label: "Postare" }, { value: "story", label: "Story" },
  { value: "reel", label: "Reel" }, { value: "carousel", label: "Carusel" },
  { value: "message", label: "Mesaj" }, { value: "article", label: "Articol" },
];
const fieldClass = "w-full rounded-xl border border-border/70 bg-background/70 px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-60";

const jsonStrings = (raw: string) => {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
};

const jsonObject = (raw: string) => {
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch { return {}; }
};

const dateLabel = (timestamp: number | null) => timestamp
  ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(timestamp)
  : "Niciodată";

const Panel = ({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: typeof Bot; children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur-md sm:p-6">
    <div className="mb-5 flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-500"><Icon className="size-4.5" /></span>
      <div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{description}</p></div>
    </div>
    {children}
  </section>
);

export default function AiProjectPage() {
  const { slug = "" } = useParams();
  const [detail, setDetail] = useState<AiProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [strategy, setStrategy] = useState({
    primaryObjective: "visibility" as AiObjective, automationMode: "manual",
    brandTone: "", targetAudience: "", coreOffer: "", agentInstructions: "",
    dailyGenerationLimit: 12, contentRetentionDays: 45, rawDataRetentionDays: 7,
  });
  const [generator, setGenerator] = useState({
    format: "post" as AiContentFormat, channel: "instagram" as AiChannelProvider,
    objective: "visibility" as AiObjective, topic: "", context: "",
  });
  const [channelLabels, setChannelLabels] = useState<Partial<Record<AiChannelProvider, string>>>({});
  const [cadence, setCadence] = useState({
    dailyPostCount: 1, dailyImageCount: 1, reelIntervalDays: 3,
    tagMin: 5, tagMax: 10, weeklyArticleHour: 16,
    engagementIntervalMinutes: 180,
    postTime: "10:15", imageTime: "13:15", reelTime: "18:15", storyTime: "20:15",
  });
  const [sourceDraft, setSourceDraft] = useState({
    kind: "current_post", title: "", canonicalUrl: "", sourceLabel: "", scope: "owned", insight: "",
  });
  const [accountDraft, setAccountDraft] = useState({ provider: "instagram", surface: "professional", label: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await aiProjectsApi.detail(slug);
      setDetail(result);
      setStrategy({
        primaryObjective: result.project.primary_objective,
        automationMode: result.project.automation_mode,
        brandTone: result.project.brand_tone,
        targetAudience: result.project.target_audience,
        coreOffer: result.project.core_offer,
        agentInstructions: result.project.agent_instructions,
        dailyGenerationLimit: result.project.daily_generation_limit,
        contentRetentionDays: result.project.content_retention_days,
        rawDataRetentionDays: result.project.raw_data_retention_days,
      });
      setGenerator((current) => ({ ...current, objective: result.project.primary_objective }));
      setChannelLabels(Object.fromEntries(result.channels.map((channel) => [channel.provider, channel.account_label || ""])));
      if (result.socialPolicy) {
        const slots = jsonObject(result.socialPolicy.time_slots_json);
        setCadence({
          dailyPostCount: result.socialPolicy.daily_post_count,
          dailyImageCount: result.socialPolicy.daily_image_count,
          reelIntervalDays: result.socialPolicy.reel_interval_days,
          tagMin: result.socialPolicy.tag_min,
          tagMax: result.socialPolicy.tag_max,
          weeklyArticleHour: result.socialPolicy.weekly_article_hour,
          engagementIntervalMinutes: result.socialPolicy.engagement_interval_minutes,
          postTime: slots.post || "10:15", imageTime: slots.image || "13:15",
          reelTime: slots.reel || "18:15", storyTime: slots.story || "20:15",
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Proiectul AI nu a putut fi încărcat.");
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void import("@/lib/seo").then(({ setPageMeta }) => setPageMeta({
      title: `${detail?.project.name || "Proiect AI"} — AI AVY Prod`,
      description: "Spațiu privat pentru strategia și producția AI Avyron.",
      path: `/intern/ai-projects/${slug}`,
      robots: "noindex, nofollow",
    }));
  }, [detail?.project.name, slug]);

  const connected = useMemo(() => detail?.channels.filter((channel) => channel.connection_status === "connected").length || 0, [detail]);

  const saveStrategy = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await aiProjectsApi.update(detail.project.id, strategy);
      toast.success("Strategia proiectului a fost salvată.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Strategia nu a putut fi salvată."); }
    finally { setBusy(false); }
  };

  const verifyChannel = async (provider: AiChannelProvider) => {
    if (!detail) return;
    setBusy(true);
    try {
      await aiProjectsApi.updateChannel(detail.project.id, provider, {
        status: "verifying", accountLabel: channelLabels[provider]?.trim() || null,
      });
      toast.success(`${providers[provider]} a intrat în verificare.`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Canalul nu a putut fi actualizat."); }
    finally { setBusy(false); }
  };

  const generate = async () => {
    if (!detail || generator.topic.trim().length < 3) {
      toast.error("Descrie subiectul în minimum 3 caractere."); return;
    }
    setBusy(true);
    try {
      const result = await aiProjectsApi.generate(detail.project.id, { ...generator, topic: generator.topic.trim(), context: generator.context.trim() });
      setDetail((current) => current ? { ...current, content: [result.data, ...current.content] } : current);
      setGenerator((current) => ({ ...current, topic: "", context: "" }));
      toast.success("Ciorna a fost generată. Nu a fost publicată.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Ciorna nu a putut fi generată."); }
    finally { setBusy(false); }
  };

  const changeContentStatus = async (item: AiContentItem, status: "pending_approval" | "approved" | "rejected") => {
    if (!detail) return;
    setBusy(true);
    try {
      await aiProjectsApi.updateContent(detail.project.id, item.id, status);
      setDetail((current) => current ? {
        ...current, content: current.content.map((content) => content.id === item.id ? { ...content, status } : content),
      } : current);
      toast.success(status === "approved" ? "Ciorna a fost aprobată." : status === "rejected" ? "Ciorna a fost respinsă." : "Ciorna a fost trimisă la aprobare.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Starea nu a putut fi actualizată."); }
    finally { setBusy(false); }
  };

  const saveCadence = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await aiProjectsApi.updateSocialPolicy(detail.project.id, {
        dailyPostCount: cadence.dailyPostCount,
        dailyImageCount: cadence.dailyImageCount,
        reelIntervalDays: cadence.reelIntervalDays,
        tagMin: cadence.tagMin,
        tagMax: cadence.tagMax,
        weeklyArticleHour: cadence.weeklyArticleHour,
        engagementIntervalMinutes: cadence.engagementIntervalMinutes,
        timeSlots: { post: cadence.postTime, image: cadence.imageTime, reel: cadence.reelTime, story: cadence.storyTime },
      });
      toast.success("Calendarul editorial a fost salvat.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Calendarul nu a putut fi salvat."); }
    finally { setBusy(false); }
  };

  const runPlan = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await aiProjectsApi.runSocialPlan(detail.project.id);
      toast.success(`Plan actualizat: ${result.created} sarcini noi, ${result.processed} procesate.`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Planificarea nu a putut fi rulată."); }
    finally { setBusy(false); }
  };

  const retrySocialJob = async (jobId: string) => {
    if (!detail) return;
    setBusy(true);
    try { await aiProjectsApi.retrySocialJob(detail.project.id, jobId); toast.success("Sarcina a fost repusă în coadă."); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Sarcina nu a putut fi reluată."); }
    finally { setBusy(false); }
  };

  const addSource = async () => {
    if (!detail || sourceDraft.title.trim().length < 3 || sourceDraft.sourceLabel.trim().length < 2) {
      toast.error("Completează titlul și sursa."); return;
    }
    setBusy(true);
    try {
      await aiProjectsApi.addSocialSource(detail.project.id, sourceDraft);
      setSourceDraft({ kind: "current_post", title: "", canonicalUrl: "", sourceLabel: "", scope: "owned", insight: "" });
      toast.success("Sursa a fost adăugată pentru verificare.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Sursa nu a putut fi adăugată."); }
    finally { setBusy(false); }
  };

  const reviewSource = async (sourceId: string, status: "approved" | "rejected") => {
    if (!detail) return;
    setBusy(true);
    try { await aiProjectsApi.reviewSocialSource(detail.project.id, sourceId, status); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Sursa nu a putut fi revizuită."); }
    finally { setBusy(false); }
  };

  const reviewOpportunity = async (opportunityId: string, decision: "approved" | "rejected" | "handed_off") => {
    if (!detail) return;
    setBusy(true);
    try {
      await aiProjectsApi.reviewOpportunity(detail.project.id, opportunityId, decision);
      toast.success(decision === "handed_off" ? "Oportunitatea a fost predată agentului Leads." : "Oportunitatea a fost revizuită.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Oportunitatea nu a putut fi revizuită."); }
    finally { setBusy(false); }
  };

  const addAudienceAccount = async () => {
    if (!detail || accountDraft.label.trim().length < 2) { toast.error("Completează eticheta contului sau paginii."); return; }
    setBusy(true);
    try {
      await aiProjectsApi.addAudienceAccount(detail.project.id, accountDraft);
      setAccountDraft({ provider: "instagram", surface: "professional", label: "" });
      toast.success("Contul a fost înregistrat separat pentru auditul audienței.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Contul nu a putut fi înregistrat."); }
    finally { setBusy(false); }
  };

  const reviewAudienceRun = async (runId: string, group: "cleanup" | "growth", decision: "approved" | "rejected") => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await aiProjectsApi.reviewAudienceRun(detail.project.id, runId, group, decision);
      toast.success(decision === "approved" ? `${result.queued} acțiuni au intrat în coada verificată.` : "Lista a fost respinsă.");
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Lista nu a putut fi revizuită."); }
    finally { setBusy(false); }
  };

  const createSocialBackup = async (scope: "configuration" | "content" | "full" = "configuration") => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await aiProjectsApi.createSocialBackup(detail.project.id, scope);
      toast.success(`Backup verificat: ${Object.values(result.rowCounts).reduce((sum, count) => sum + count, 0)} înregistrări.`);
      await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Backupul nu a putut fi creat."); }
    finally { setBusy(false); }
  };

  const downloadSocialBackup = async (backupId: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      const response = await aiProjectsApi.downloadSocialBackup(detail.project.id, backupId);
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `avyron-social-studio-${backupId}.json`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Backupul nu a putut fi descărcat."); }
    finally { setBusy(false); }
  };

  if (loading) return <main className="min-h-screen bg-secondary/30 p-6"><div className="mx-auto h-96 max-w-6xl animate-pulse rounded-3xl bg-card/60" aria-label="Se încarcă proiectul AI" /></main>;
  if (error || !detail) return (
    <main className="min-h-screen bg-secondary/30 p-6"><div className="mx-auto max-w-3xl space-y-5"><PageBackLink to="/intern/ai-projects" label="Înapoi" /><div className="rounded-2xl border border-destructive/30 bg-card p-6"><p>{error || "Proiect indisponibil."}</p><Button className="mt-4" variant="outline" onClick={() => void load()}>Reîncearcă</Button></div></div></main>
  );

  const { project, permission } = detail;
  return (
    <main className="min-h-screen bg-secondary/30 px-4 py-7 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PageBackLink to="/intern/ai-projects" label="Proiecte AI" />
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className="mr-2 size-3.5" />Actualizează</Button>
        </div>

        <header className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-card/75 p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-28 -top-28 size-72 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-500">AI AVY Prod · {project.ownership_scope === "agency" ? "produs propriu" : "administrare client"}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{project.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{project.summary}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-300">{project.status === "active" ? "Activ" : "În configurare"}</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs">{connected}/{detail.channels.length} canale</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs">Rol: {permission.role}</span>
            </div>
          </div>
        </header>

        {detail.socialPolicy && <Panel title="Backup Social Studio" description="Configurație versionată în Git, index verificabil în D1 și manifeste private în R2. Secretele și sesiunile sunt excluse." icon={Database}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/65 bg-background/55 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Profil de design</p><p className="mt-1 text-sm font-medium">v{detail.socialDesignProfiles.find((profile) => profile.status === "approved")?.version || "—"} aprobat</p></div>
            <div className="rounded-xl border border-border/65 bg-background/55 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active în registru</p><p className="mt-1 text-sm font-medium">{detail.socialAssets.length}</p></div>
            <div className="rounded-xl border border-border/65 bg-background/55 p-3"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Politică</p><p className="mt-1 text-sm font-medium">Aprobare umană · free only</p></div>
          </div>
          {permission.canManage && <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void createSocialBackup("configuration")}><Database className="mr-2 size-4" />Backup configurație</Button>
            <Button disabled={busy} variant="outline" onClick={() => void createSocialBackup("content")}>Configurație + conținut</Button>
          </div>}
          <div className="mt-4 space-y-2">
            {detail.socialBackups.slice(0, 6).map((backup) => <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
              <div><p className="text-sm font-medium">{backup.scope} · schema {backup.schema_version}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(backup.started_at)} · {(backup.byte_size / 1024).toFixed(1)} KB · {backup.status}</p>{backup.manifest_sha256 && <p className="mt-1 max-w-xl truncate font-mono text-[9px] text-muted-foreground">SHA-256 {backup.manifest_sha256}</p>}</div>
              {backup.status === "verified" && permission.canManage && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void downloadSocialBackup(backup.id)}>Descarcă</Button>}
            </div>)}
            {detail.socialBackups.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Nu există încă un manifest R2. Creează prima copie după aplicarea migrației în mediul autorizat.</p>}
          </div>
        </Panel>}

        {detail.socialPolicy && <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <Panel title="Ritm editorial AVYRON" description="Ore în fusul Europe/Bucharest. Sistemul creează ciorne și păstrează aprobarea umană." icon={CalendarClock}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="social-post-count">Postări / zi</Label><Input id="social-post-count" type="number" min={1} max={8} disabled={!permission.canManage} value={cadence.dailyPostCount} onChange={(e) => setCadence({ ...cadence, dailyPostCount: Number(e.target.value) })} /></div>
              <div><Label htmlFor="social-post-time">Ora postării</Label><Input id="social-post-time" type="time" disabled={!permission.canManage} value={cadence.postTime} onChange={(e) => setCadence({ ...cadence, postTime: e.target.value })} /></div>
              <div><Label htmlFor="social-image-count">Imagini / zi</Label><Input id="social-image-count" type="number" min={1} max={8} disabled={!permission.canManage} value={cadence.dailyImageCount} onChange={(e) => setCadence({ ...cadence, dailyImageCount: Number(e.target.value) })} /></div>
              <div><Label htmlFor="social-image-time">Ora imaginii</Label><Input id="social-image-time" type="time" disabled={!permission.canManage} value={cadence.imageTime} onChange={(e) => setCadence({ ...cadence, imageTime: e.target.value })} /></div>
              <div><Label htmlFor="social-reel-days">Reel la câte zile</Label><Input id="social-reel-days" type="number" min={1} max={30} disabled={!permission.canManage} value={cadence.reelIntervalDays} onChange={(e) => setCadence({ ...cadence, reelIntervalDays: Number(e.target.value) })} /></div>
              <div><Label htmlFor="social-reel-time">Ora Reel-ului</Label><Input id="social-reel-time" type="time" disabled={!permission.canManage} value={cadence.reelTime} onChange={(e) => setCadence({ ...cadence, reelTime: e.target.value })} /></div>
              <div><Label htmlFor="social-story-time">Ora Story-ului</Label><Input id="social-story-time" type="time" disabled={!permission.canManage} value={cadence.storyTime} onChange={(e) => setCadence({ ...cadence, storyTime: e.target.value })} /></div>
              <div><Label htmlFor="social-article-hour">Articol vineri — ora</Label><Input id="social-article-hour" type="number" min={0} max={23} disabled={!permission.canManage} value={cadence.weeklyArticleHour} onChange={(e) => setCadence({ ...cadence, weeklyArticleHour: Number(e.target.value) })} /></div>
              <div><Label htmlFor="social-tag-min">Hashtaguri minimum</Label><Input id="social-tag-min" type="number" min={0} max={20} disabled={!permission.canManage} value={cadence.tagMin} onChange={(e) => setCadence({ ...cadence, tagMin: Number(e.target.value) })} /></div>
              <div><Label htmlFor="social-tag-max">Hashtaguri maximum</Label><Input id="social-tag-max" type="number" min={0} max={30} disabled={!permission.canManage} value={cadence.tagMax} onChange={(e) => setCadence({ ...cadence, tagMax: Number(e.target.value) })} /></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {permission.canManage && <Button onClick={() => void saveCadence()} disabled={busy}><Save className="mr-2 size-4" />Salvează calendarul</Button>}
              {permission.canConnect && <Button variant="outline" onClick={() => void runPlan()} disabled={busy}><RotateCcw className="mr-2 size-4" />Rulează planificarea</Button>}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Orele inițiale sunt ipoteze editoriale. După conectarea analiticelor, recomandările de oră se calibrează din performanța reală a conturilor AVYRON.</p>
          </Panel>

          <Panel title="Calendar și execuție" description="Sarcini create idempotent de programarea Cloudflare; nicio stare de aici nu înseamnă publicare externă." icon={ListChecks}>
            <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              {detail.socialJobs.slice(0, 24).map((job) => <div key={job.id} className="rounded-xl border border-border/65 bg-background/55 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono text-[9px] uppercase tracking-wider text-violet-500">{job.kind.replace(/_/g, " ")} · {job.primary_channel}</p><p className="mt-1 text-sm font-medium">{job.topic}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{job.status.replace(/_/g, " ")}</span></div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground"><span>{new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(job.due_at)}</span>{job.last_error_code && <span className="text-amber-600">· {job.last_error_code}</span>}</div>
                {["failed", "awaiting_budget"].includes(job.status) && permission.canManage && <Button className="mt-2 h-8" size="sm" variant="outline" disabled={busy} onClick={() => void retrySocialJob(job.id)}><RotateCcw className="mr-1.5 size-3" />Reîncearcă</Button>}
              </div>)}
              {detail.socialJobs.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Calendarul va crea prima serie de sarcini la următoarea rulare de 15 minute.</div>}
            </div>
          </Panel>
        </div>}

        {detail.socialPolicy && <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Surse și învățare" description="Postări AVYRON, exemple concurențiale, noutăți și cărți PDF intră mai întâi la verificare." icon={BookOpen}>
            {permission.canManage && <div className="grid gap-3 sm:grid-cols-2">
              <div><Label htmlFor="social-source-kind">Tip</Label><select id="social-source-kind" className={fieldClass} value={sourceDraft.kind} onChange={(e) => setSourceDraft({ ...sourceDraft, kind: e.target.value })}><option value="current_post">Postare AVYRON</option><option value="competitor_post">Postare agenție</option><option value="trend">Tendință</option><option value="industry_news">Noutate industrie</option><option value="pdf_book">Carte / ghid PDF</option><option value="website">Website</option><option value="analytics">Analitice</option></select></div>
              <div><Label htmlFor="social-source-scope">Arie</Label><select id="social-source-scope" className={fieldClass} value={sourceDraft.scope} onChange={(e) => setSourceDraft({ ...sourceDraft, scope: e.target.value })}><option value="owned">Propriu</option><option value="national">Național</option><option value="international">Internațional</option><option value="internal">Intern</option></select></div>
              <div className="sm:col-span-2"><Label htmlFor="social-source-title">Titlu</Label><Input id="social-source-title" value={sourceDraft.title} onChange={(e) => setSourceDraft({ ...sourceDraft, title: e.target.value })} /></div>
              <div><Label htmlFor="social-source-label">Sursa</Label><Input id="social-source-label" placeholder="Ex.: AVYRON Instagram" value={sourceDraft.sourceLabel} onChange={(e) => setSourceDraft({ ...sourceDraft, sourceLabel: e.target.value })} /></div>
              <div><Label htmlFor="social-source-url">Link / PDF</Label><Input id="social-source-url" type="url" placeholder="https://…" value={sourceDraft.canonicalUrl} onChange={(e) => setSourceDraft({ ...sourceDraft, canonicalUrl: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label htmlFor="social-source-insight">Ce trebuie învățat</Label><Textarea id="social-source-insight" rows={2} value={sourceDraft.insight} onChange={(e) => setSourceDraft({ ...sourceDraft, insight: e.target.value })} /></div>
              <div className="sm:col-span-2"><Button variant="outline" disabled={busy} onClick={() => void addSource()}><Link2 className="mr-2 size-4" />Adaugă pentru verificare</Button></div>
            </div>}
            <div className="mt-4 space-y-2">{detail.socialSources.slice(0, 8).map((source) => <div key={source.id} className="rounded-xl border border-border/60 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{source.title}</p><p className="text-[11px] text-muted-foreground">{source.source_label} · {source.scope}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{source.status}</span></div>{source.insight && <p className="mt-2 text-xs leading-relaxed">{source.insight}</p>}{source.status === "proposed" && permission.canManage && <div className="mt-2 flex gap-2"><Button size="sm" className="h-8" onClick={() => void reviewSource(source.id, "approved")}>Aprobă</Button><Button size="sm" className="h-8" variant="ghost" onClick={() => void reviewSource(source.id, "rejected")}>Respinge</Button></div>}</div>)}</div>
          </Panel>

          <Panel title="Oportunități și Leads" description="Semnalele din comentarii și feed devin recomandări; contactarea rămâne controlată." icon={Newspaper}>
            <div className="space-y-2">{detail.socialOpportunities.map((opportunity) => <div key={opportunity.id} className="rounded-xl border border-border/65 bg-background/55 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{opportunity.business_name || "Afacere neidentificată"}</p><p className="text-[11px] text-muted-foreground">{providers[opportunity.channel]} · semnal {opportunity.intent_score}/100 · {opportunity.recommended_action}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{opportunity.status}</span></div><p className="mt-2 text-xs leading-relaxed">{opportunity.business_signal}</p>{opportunity.proposed_message && <div className="mt-2 rounded-lg bg-muted/55 p-2 text-xs"><strong>Ciornă:</strong> {opportunity.proposed_message}</div>}{opportunity.status === "pending" && permission.canManage && <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" className="h-8" onClick={() => void reviewOpportunity(opportunity.id, "handed_off")}>Predă către Leads</Button><Button size="sm" className="h-8" variant="outline" onClick={() => void reviewOpportunity(opportunity.id, "approved")}>Aprobă acțiunea</Button><Button size="sm" className="h-8" variant="ghost" onClick={() => void reviewOpportunity(opportunity.id, "rejected")}>Respinge</Button></div>}</div>)}{detail.socialOpportunities.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Oportunitățile vor apărea după conectarea citirii comentariilor și a feedului. Sunt urmărite afaceri și activități profesionale, nu persoane fizice.</div>}</div>
          </Panel>
        </div>}

        {detail.socialPolicy && <Panel title="Optimizarea audienței" description="Audit zilnic la 15:00, separat pentru fiecare cont sau pagină. Protecțiile au prioritate absolută." icon={Users}>
          {permission.canConnect && <div className="grid gap-3 rounded-xl border border-border/60 bg-background/45 p-4 md:grid-cols-[.75fr_.9fr_1.5fr_auto]">
            <div><Label htmlFor="audience-provider">Platformă</Label><select id="audience-provider" className={fieldClass} value={accountDraft.provider} onChange={(e) => setAccountDraft({ ...accountDraft, provider: e.target.value })}><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></div>
            <div><Label htmlFor="audience-surface">Tip</Label><select id="audience-surface" className={fieldClass} value={accountDraft.surface} onChange={(e) => setAccountDraft({ ...accountDraft, surface: e.target.value })}><option value="profile">Profil</option><option value="page">Pagină</option><option value="professional">Profesional</option><option value="business">Business</option><option value="creator">Creator</option></select></div>
            <div><Label htmlFor="audience-label">Etichetă exactă</Label><Input id="audience-label" placeholder="Ex.: AVYRON Instagram" value={accountDraft.label} onChange={(e) => setAccountDraft({ ...accountDraft, label: e.target.value })} /></div>
            <Button className="self-end" variant="outline" disabled={busy} onClick={() => void addAudienceAccount()}><UserRoundPlus className="mr-2 size-4" />Adaugă</Button>
          </div>}
          <div className="mt-4 grid gap-3 md:grid-cols-3">{detail.socialAccounts.map((account) => <div key={account.id} className="rounded-xl border border-border/65 bg-background/55 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium">{account.label}</p><p className="text-[11px] text-muted-foreground">{account.provider} · {account.surface}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{account.connection_status}</span></div><p className="mt-2 text-xs text-muted-foreground">Zilnic la {String(account.daily_review_hour).padStart(2, "0")}:{String(account.daily_review_minute).padStart(2, "0")} · maximum {account.cleanup_limit} curățare + {account.growth_limit} creștere</p><p className="mt-1 text-[10px] text-muted-foreground">Ultimul snapshot: {dateLabel(account.last_snapshot_at)}</p></div>)}</div>
          {detail.socialAccounts.length === 0 && <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Înregistrează separat profilul Facebook, pagina Facebook, Instagram și TikTok. Conectarea nu este presupusă din simpla autentificare în browser.</div>}
          <div className="mt-5 space-y-3">{detail.audienceRuns.slice(0, 12).map((run) => {
            const candidates = detail.audienceCandidates.filter((candidate) => candidate.run_id === run.id);
            const cleanup = candidates.filter((candidate) => candidate.action === "unfollow" || candidate.action === "unfriend");
            const growth = candidates.filter((candidate) => candidate.action === "follow" || candidate.action === "friend_request");
            return <div key={run.id} className="rounded-xl border border-border/65 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{run.label} · {run.review_date}</p><p className="text-xs text-muted-foreground">{run.provider} / {run.surface} · {cleanup.length} curățare · {growth.length} creștere</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{run.status.replace(/_/g, " ")}</span></div>
              {run.status === "review_ready" && <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {[{ key: "cleanup" as const, title: "Propuneri unfollow / unfriend", icon: UserMinus, rows: cleanup }, { key: "growth" as const, title: "Propuneri follow / cereri", icon: UserRoundPlus, rows: growth }].map((group) => <div key={group.key} className="rounded-lg bg-muted/35 p-3"><p className="flex items-center gap-2 text-xs font-semibold"><group.icon className="size-3.5" />{group.title}</p><div className="mt-2 max-h-56 space-y-2 overflow-y-auto">{group.rows.map((candidate) => <a key={candidate.id} href={candidate.profile_url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border/55 bg-background/70 p-2.5 hover:border-violet-500/40"><div className="flex justify-between gap-2"><span className="text-xs font-medium">{candidate.display_name || candidate.handle || "Profil"}</span><span className="text-[10px]">{candidate.score}/100</span></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{jsonStrings(candidate.reasons_json).join(" · ")}</p></a>)}{group.rows.length === 0 && <p className="text-xs text-muted-foreground">Nicio propunere eligibilă.</p>}</div>{group.rows.length > 0 && permission.canManage && <div className="mt-3 flex gap-2"><Button size="sm" className="h-8" disabled={busy} onClick={() => void reviewAudienceRun(run.id, group.key, "approved")}>Aprobă lista</Button><Button size="sm" className="h-8" variant="ghost" disabled={busy} onClick={() => void reviewAudienceRun(run.id, group.key, "rejected")}>Respinge</Button></div>}</div>)}
              </div>}
              {run.status === "awaiting_connection" && <p className="mt-3 text-xs text-amber-600">Este necesar acces verificat la acest cont. Nu se folosește scraping și nu se execută gesturi automate fragile.</p>}
              {run.status === "awaiting_data" && <p className="mt-3 text-xs text-muted-foreground">Așteaptă snapshotul relațiilor și verificarea conversațiilor, aprecierilor și contactărilor anterioare.</p>}
            </div>;
          })}</div>
          <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Profilurile cu conversații, reacții, Story-uri apreciate, contactări, leaduri, clienți, parteneri sau protecție manuală sunt excluse la selecție și reverificate înainte de aprobarea lotului. Un website existent este doar un semnal, nu un motiv suficient pentru eliminare.</p>
          <p className="mt-2 flex gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />Cererile de prietenie primite nu sunt acceptate sau respinse de agent. Decizia rămâne exclusiv administratorilor contului.</p>
        </Panel>}

        <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-5">
            <Panel title="Strategie configurabilă" description="Direcția după care agenții generează și își calibrează rezultatele." icon={Target}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label htmlFor="ai-objective">Obiectiv principal</Label><select id="ai-objective" className={fieldClass} disabled={!permission.canManage} value={strategy.primaryObjective} onChange={(e) => setStrategy({ ...strategy, primaryObjective: e.target.value as AiObjective })}>{objectives.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div><Label htmlFor="ai-automation">Nivel automatizare</Label><select id="ai-automation" className={fieldClass} disabled={!permission.canManage} value={strategy.automationMode} onChange={(e) => setStrategy({ ...strategy, automationMode: e.target.value })}><option value="manual">Manual</option><option value="approval">Generare cu aprobare</option><option value="automatic">Automat — owner + conexiune verificată</option></select></div>
                <div className="sm:col-span-2"><Label htmlFor="ai-tone">Ton de brand</Label><Input id="ai-tone" disabled={!permission.canManage} value={strategy.brandTone} onChange={(e) => setStrategy({ ...strategy, brandTone: e.target.value })} /></div>
                <div><Label htmlFor="ai-audience">Audiență</Label><Textarea id="ai-audience" rows={3} disabled={!permission.canManage} value={strategy.targetAudience} onChange={(e) => setStrategy({ ...strategy, targetAudience: e.target.value })} /></div>
                <div><Label htmlFor="ai-offer">Ofertă și diferențiatori</Label><Textarea id="ai-offer" rows={3} disabled={!permission.canManage} value={strategy.coreOffer} onChange={(e) => setStrategy({ ...strategy, coreOffer: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label htmlFor="ai-instructions">Reguli pentru agenți</Label><Textarea id="ai-instructions" rows={4} disabled={!permission.canManage} value={strategy.agentInstructions} onChange={(e) => setStrategy({ ...strategy, agentInstructions: e.target.value })} /></div>
                <div><Label htmlFor="ai-limit">Limită generări / 24h</Label><Input id="ai-limit" type="number" min={0} max={100} disabled={!permission.canManage} value={strategy.dailyGenerationLimit} onChange={(e) => setStrategy({ ...strategy, dailyGenerationLimit: Number(e.target.value) })} /></div>
                <div><Label htmlFor="ai-retention">Păstrare materiale (zile)</Label><Input id="ai-retention" type="number" min={7} max={365} disabled={!permission.canManage} value={strategy.contentRetentionDays} onChange={(e) => setStrategy({ ...strategy, contentRetentionDays: Number(e.target.value) })} /></div>
              </div>
              {permission.canManage && <Button className="mt-4" onClick={() => void saveStrategy()} disabled={busy}><Save className="mr-2 size-4" />Salvează strategia</Button>}
            </Panel>

            <Panel title="Studio de conținut" description="Generează ciorne profesionale. Nicio acțiune nu publică sau trimite automat." icon={Sparkles}>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="ai-format">Format</Label><select id="ai-format" className={fieldClass} value={generator.format} onChange={(e) => setGenerator({ ...generator, format: e.target.value as AiContentFormat })}>{formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div><Label htmlFor="ai-channel">Canal</Label><select id="ai-channel" className={fieldClass} value={generator.channel} onChange={(e) => setGenerator({ ...generator, channel: e.target.value as AiChannelProvider })}>{detail.channels.map((channel) => <option key={channel.provider} value={channel.provider}>{providers[channel.provider]}</option>)}</select></div>
                <div><Label htmlFor="ai-gen-objective">Obiectiv</Label><select id="ai-gen-objective" className={fieldClass} value={generator.objective} onChange={(e) => setGenerator({ ...generator, objective: e.target.value as AiObjective })}>{objectives.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div className="sm:col-span-3"><Label htmlFor="ai-topic">Subiect / brief</Label><Input id="ai-topic" placeholder="Ex.: beneficiile unui website rapid pentru afacerile locale" value={generator.topic} onChange={(e) => setGenerator({ ...generator, topic: e.target.value })} /></div>
                <div className="sm:col-span-3"><Label htmlFor="ai-context">Context suplimentar (opțional)</Label><Textarea id="ai-context" rows={3} placeholder="Campanie, ofertă, restricții, informații care trebuie incluse…" value={generator.context} onChange={(e) => setGenerator({ ...generator, context: e.target.value })} /></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={() => void generate()} disabled={busy || !permission.canCreateContent}><Sparkles className="mr-2 size-4" />Generează ciornă</Button>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-emerald-500" /> Human-in-the-loop activ</span>
              </div>

              <div className="mt-6 space-y-3">
                {detail.content.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nu există încă materiale. Prima generare va crea exclusiv o ciornă.</div>}
                {detail.content.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border/70 bg-background/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-mono text-[10px] uppercase tracking-wider text-violet-500">{formats.find((entry) => entry.value === item.format)?.label} · {jsonStrings(item.channels_json).map((channel) => providers[channel as AiChannelProvider] || channel).join(", ")}</p><h3 className="mt-1 font-semibold">{item.title}</h3></div>
                      <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] uppercase">{item.status.replace("_", " ")}</span>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{item.caption}</p>
                    {item.visual_direction && <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs"><strong>Direcție vizuală:</strong> {item.visual_direction}</div>}
                    {item.cta && <p className="mt-3 text-sm"><strong>CTA:</strong> {item.cta}</p>}
                    {jsonStrings(item.hashtags_json).length > 0 && <p className="mt-2 text-xs text-violet-500">{jsonStrings(item.hashtags_json).map((tag) => `#${tag}`).join(" ")}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                      {item.status === "draft" && <Button size="sm" variant="outline" disabled={busy} onClick={() => void changeContentStatus(item, "pending_approval")}><Send className="mr-1.5 size-3.5" />Trimite la aprobare</Button>}
                      {item.status === "pending_approval" && permission.canManage && <Button size="sm" disabled={busy} onClick={() => void changeContentStatus(item, "approved")}><Check className="mr-1.5 size-3.5" />Aprobă</Button>}
                      {!["approved", "rejected"].includes(item.status) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void changeContentStatus(item, "rejected")}><Trash2 className="mr-1.5 size-3.5" />Respinge</Button>}
                      <span className="ml-auto text-[11px] text-muted-foreground">Expiră: {dateLabel(item.expires_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Canale și conturi" description="Starea reflectă conexiuni API reale, nu simulări vizuale." icon={Radio}>
              <div className="space-y-3">
                {detail.channels.map((channel) => {
                  const connectedChannel = channel.connection_status === "connected";
                  const verifying = channel.connection_status === "verifying";
                  return <div key={channel.provider} className="rounded-xl border border-border/65 bg-background/55 p-3">
                    <div className="flex items-center justify-between gap-3"><p className="font-medium">{providers[channel.provider]}</p><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] ${connectedChannel ? "bg-emerald-500/10 text-emerald-600" : verifying ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"}`}>{connectedChannel ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{connectedChannel ? "Conectat" : verifying ? "În verificare" : "Neconectat"}</span></div>
                    <p className="mt-1 text-xs text-muted-foreground">{channel.account_label || "Niciun cont asociat"}</p>
                    {permission.canConnect && !connectedChannel && <div className="mt-3 flex gap-2"><Input aria-label={`Cont ${providers[channel.provider]}`} className="h-9" placeholder="Nume cont / pagină" value={channelLabels[channel.provider] || ""} onChange={(e) => setChannelLabels({ ...channelLabels, [channel.provider]: e.target.value })} /><Button size="sm" variant="outline" disabled={busy || verifying} onClick={() => void verifyChannel(channel.provider)}>{verifying ? "Se verifică" : "Verifică"}</Button></div>}
                  </div>;
                })}
              </div>
              <p className="mt-4 flex gap-2 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" />Starea „Conectat” poate fi acordată doar după OAuth/API valid și verificarea conexiunii în AI OS de către platform owner.</p>
              <div className="mt-4 border-t border-border/60 pt-4"><p className="mb-2 text-xs font-medium">Instrumente externe · free only</p><div className="space-y-2">{detail.socialTools.map((tool) => <div key={`${tool.provider}:${tool.capability}`} className="rounded-lg bg-muted/45 p-2.5"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium">{tool.provider} · {tool.capability.replace(/_/g, " ")}</p><span className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${tool.status === "available" ? "bg-emerald-500/10 text-emerald-600" : tool.status === "blocked_paid" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>{tool.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{tool.notes}</p></div>)}</div></div>
              <div className="mt-4 border-t border-border/60 pt-4"><p className="mb-2 text-xs font-medium">Modele remote · metadata only</p><div className="space-y-2">{detail.socialModelRoutes.map((route) => <div key={`${route.route_key}:${route.model_id}`} className="rounded-lg bg-muted/45 p-2.5"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-medium">{route.route_key.replace(/_/g, " ")}</p><p className="mt-0.5 break-all font-mono text-[9px] text-muted-foreground">{route.model_id}</p></div><span className={`rounded-full px-2 py-0.5 text-[9px] uppercase ${route.status === "available" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{route.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{route.notes}</p><p className="mt-1 text-[9px] text-cyan-600">{route.license_spdx || "licență de verificat"} · {route.execution_mode === "remote_api" ? "cloud remote" : "doar catalog"} · fără greutăți stocate</p></div>)}</div></div>
            </Panel>

            <Panel title="Echipa de agenți" description="Roluri independente, capabilități limitate și stare vizibilă." icon={Bot}>
              <div className="space-y-3">{detail.agents.map((agent) => <div key={agent.agent_slug} className="rounded-xl border border-border/65 bg-background/55 p-3"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: agent.accent }} /><div><p className="text-sm font-medium">{agent.name}</p><p className="text-[11px] text-muted-foreground">{agent.role} · v{agent.current_version}</p></div></div><span className={`rounded-full px-2 py-1 text-[10px] ${agent.status === "ready" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{agent.status === "ready" ? "Pregătit" : "În antrenare"}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{agent.mission}</p><div className="mt-2 flex flex-wrap gap-1">{jsonStrings(agent.capabilities_json).map((capability) => <span key={capability} className="rounded-md bg-muted px-2 py-1 font-mono text-[9px]">{capability}</span>)}</div></div>)}</div>
            </Panel>

            <Panel title="Memorie controlată" description="Sunt păstrate rezumate utile, cu expirare; nu arhive brute nelimitate." icon={BrainCircuit}>
              <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-muted/50 p-3"><Database className="size-4 text-violet-500" /><p className="mt-2 text-lg font-semibold">{detail.memories.length}</p><p className="text-[10px] text-muted-foreground">rezumate active</p></div><div className="rounded-xl bg-muted/50 p-3"><CalendarClock className="size-4 text-cyan-500" /><p className="mt-2 text-lg font-semibold">{strategy.rawDataRetentionDays} zile</p><p className="text-[10px] text-muted-foreground">date brute</p></div></div>
              <div className="mt-3 space-y-2">{detail.memories.slice(0, 5).map((memory) => <div key={memory.id} className="rounded-lg border border-border/60 p-3"><p className="font-mono text-[9px] uppercase text-muted-foreground">{memory.kind} · încredere {Math.round(memory.confidence * 100)}%</p><p className="mt-1 text-xs leading-relaxed">{memory.summary}</p></div>)}{detail.memories.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Memoria se formează numai din surse autorizate și rezultate aprobate.</p>}</div>
            </Panel>

            <Panel title="Inteligență competitivă" description="Analiză locală, națională și internațională, fără afirmații neverificate." icon={Globe2}>
              <div className="space-y-2">{detail.competitors.map((competitor) => <div key={competitor.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"><div><p className="text-sm font-medium">{competitor.name}</p><p className="text-xs text-muted-foreground">{competitor.rationale}</p></div><span className="rounded-full bg-muted px-2 py-1 text-[9px] uppercase">{competitor.scope}</span></div>)}{detail.competitors.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nu sunt încă surse competitive aprobate.</p>}</div>
            </Panel>

            <Panel title="Acces proiect" description="Doar utilizatorii selectați explicit pot vedea proiectul." icon={Users}>
              <div className="space-y-2">{detail.members.map((member) => <div key={member.user_id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/45 p-3"><div><p className="text-sm font-medium">{member.display_name || member.email}</p><p className="text-[11px] text-muted-foreground">{member.email}</p></div><span className="rounded-full border border-border bg-background px-2 py-1 text-[10px]">{member.role}</span></div>)}{detail.members.length === 0 && <p className="text-xs text-muted-foreground">Administrat exclusiv la nivel de platformă.</p>}</div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Eye className="size-3.5" />Vizibilitatea este filtrată server-side pentru fiecare utilizator.</p>
            </Panel>

            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground"><MessageSquareText className="size-4 text-cyan-500" /> Mesaje și outreach</p>
              <p className="mt-2">Pregătite inițial ca ciorne. Trimiterea automată rămâne dezactivată până la conexiuni autorizate, reguli aprobate și activare explicită de către platform owner.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
