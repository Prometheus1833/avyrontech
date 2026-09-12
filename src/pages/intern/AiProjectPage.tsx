import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bot, BrainCircuit, CalendarClock, Check, CheckCircle2, CircleDashed,
  Database, Eye, Globe2, LockKeyhole, MessageSquareText, Radio, RefreshCw,
  Save, Send, ShieldCheck, Sparkles, Target, Trash2, Users,
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
  linkedin: "LinkedIn", whatsapp: "WhatsApp", messenger: "Messenger",
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
