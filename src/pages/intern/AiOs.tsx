import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot, Brain, BarChart3, MessageSquare, Save, Plus, Archive, Sparkles, RefreshCw, Lock, GraduationCap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  aiOsAdmin, type AiAgent, type AiStats, type KnowledgeRow, type LearningRow,
} from "@/lib/aiOsApi";

const TABS = [
  { id: "overview", label: "Panou", icon: BarChart3 },
  { id: "agents", label: "Agenți", icon: Bot },
  { id: "knowledge", label: "Cunoștințe", icon: Brain },
  { id: "learning", label: "Auto-învățare", icon: GraduationCap },
  { id: "conversations", label: "Conversații", icon: MessageSquare },
] as const;
type TabId = (typeof TABS)[number]["id"];

const Card = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-md">
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const field = "w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/** Consola AI OS "AVY". Vizibilă super adminilor, editabilă doar de contul owner. */
const AiOs = ({ embedded = false }: { embedded?: boolean }) => {
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [stats, setStats] = useState<AiStats | null>(null);
  const [agents, setAgents] = useState<AiAgent[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRow[]>([]);
  const [learning, setLearning] = useState<LearningRow[]>([]);
  const [conversations, setConversations] = useState<{ id: string; agent_slug: string; language: string; page: string | null; messages: number; last_at: number }[]>([]);
  const [transcript, setTranscript] = useState<{ role: string; content: string; created_at: number }[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AiAgent>>({});
  const [kbDraft, setKbDraft] = useState<Partial<KnowledgeRow>>({ category: "general", language: "ro", priority: 5 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, k, l, c] = await Promise.all([
        aiOsAdmin.stats(30), aiOsAdmin.agents(), aiOsAdmin.knowledge(), aiOsAdmin.learning(), aiOsAdmin.conversations(),
      ]);
      setStats(s);
      setAgents(a.data);
      setCanEdit(a.canEdit);
      setKnowledge(k.data);
      setLearning(l.data);
      setConversations(c.data);
    } catch {
      setStatus("Nu am putut încărca datele AI OS.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) void load();
  }, [load, authLoading, isSuperAdmin]);

  const active = useMemo(() => agents.find((a) => a.slug === selected) ?? null, [agents, selected]);

  const restricted = !authLoading && !isSuperAdmin;

  const openAgent = (agent: AiAgent) => {
    setSelected(agent.slug);
    setDraft(agent);
  };

  const saveAgent = async () => {
    if (!selected) return;
    try {
      await aiOsAdmin.saveAgent(selected, draft);
      setStatus("Agent salvat.");
      await load();
    } catch {
      setStatus("Salvarea a eșuat.");
    }
  };

  const saveKnowledge = async () => {
    if (!kbDraft.question || !kbDraft.answer) return;
    try {
      await aiOsAdmin.saveKnowledge(kbDraft);
      setKbDraft({ category: "general", language: "ro", priority: 5 });
      setStatus("Cunoștință salvată.");
      const k = await aiOsAdmin.knowledge(search);
      setKnowledge(k.data);
    } catch {
      setStatus("Salvarea a eșuat.");
    }
  };

  const searchKnowledge = async (value: string) => {
    setSearch(value);
    const k = await aiOsAdmin.knowledge(value).catch(() => null);
    if (k) setKnowledge(k.data);
  };

  return (
    <div className={embedded ? "space-y-6" : "min-h-screen bg-secondary/30 px-4 py-8"}>
      <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl space-y-6"}>
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-md">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-5 text-primary" aria-hidden /> AI OS · AVY
            </h1>
            <p className="text-sm text-muted-foreground">
              Agenți, bază de cunoștințe, rapoarte și auto-învățare pentru toată activitatea Avyron.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs">
              <Lock className="size-3" /> {canEdit ? "Control total" : `Doar citire (${user?.email ?? ""})`}
            </span>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-3 py-1.5 text-sm hover:bg-muted">
              <RefreshCw className="size-4" /> Reîmprospătează
            </button>
          </div>
        </header>

        <div className="inline-flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1" role="tablist">
          {TABS.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" /> {item.label}
              </button>
            );
          })}
        </div>

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
        {loading && <div className="h-32 animate-pulse rounded-2xl bg-muted/40" aria-label="Se încarcă" />}

        {!loading && tab === "overview" && stats && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card label="Conversații (30z)" value={stats.totals?.conversations ?? 0} />
              <Card label="Mesaje" value={stats.totals?.messages ?? 0} />
              <Card label="Acoperire medie" value={`${Math.round((stats.quality?.avg_confidence ?? 0) * 100)}%`} hint="cât de bine acoperă baza de cunoștințe" />
              <Card label="Latență medie" value={`${Math.round(stats.quality?.avg_latency ?? 0)} ms`} />
              <Card label="Cunoștințe active" value={`${stats.knowledge?.active ?? 0}/${stats.knowledge?.total ?? 0}`} />
              <Card label="De învățat" value={stats.learning?.pending ?? 0} hint="întrebări fără răspuns bun" />
              <Card label="Feedback pozitiv" value={stats.quality?.up ?? 0} />
              <Card label="Feedback negativ" value={stats.quality?.down ?? 0} />
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <p className="mb-2 text-sm font-medium">Conversații pe agent</p>
              <ul className="space-y-1.5 text-sm">
                {stats.perAgent.length === 0 && <li className="text-muted-foreground">Încă nicio conversație.</li>}
                {stats.perAgent.map((row) => (
                  <li key={row.agent_slug} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 font-mono text-xs">{row.agent_slug}</span>
                    <span className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, row.conversations * 6)}%` }} />
                    <span className="text-xs text-muted-foreground">{row.conversations}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!loading && tab === "agents" && (
          <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
            <ul className="space-y-2">
              {agents.map((agent) => (
                <li key={agent.slug}>
                  <button
                    type="button"
                    onClick={() => openAgent(agent)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      selected === agent.slug ? "border-primary/60 bg-primary/5" : "border-border/60 hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="size-2.5 rounded-full" style={{ background: agent.accent }} aria-hidden />
                      {agent.name}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {agent.channel} · {agent.status} · {agent.autonomy}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
              {!active && <p className="text-sm text-muted-foreground">Alege un agent pentru configurare.</p>}
              {active && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">Nume
                      <input className={field} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={!canEdit} />
                    </label>
                    <label className="text-sm">Canal
                      <select className={field} value={draft.channel ?? "site"} onChange={(e) => setDraft({ ...draft, channel: e.target.value })} disabled={!canEdit}>
                        {["site", "whatsapp", "meta", "email", "intern"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">Stare
                      <select className={field} value={draft.status ?? "draft"} onChange={(e) => setDraft({ ...draft, status: e.target.value })} disabled={!canEdit}>
                        {["draft", "active", "paused"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">Vizibilitate
                      <select className={field} value={draft.visibility ?? "private"} onChange={(e) => setDraft({ ...draft, visibility: e.target.value })} disabled={!canEdit}>
                        {["private", "public"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">Autonomie
                      <select className={field} value={draft.autonomy ?? "assist"} onChange={(e) => setDraft({ ...draft, autonomy: e.target.value })} disabled={!canEdit}>
                        {["assist", "semi", "auto"].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </label>
                    <label className="text-sm">Model
                      <input className={field} value={draft.model ?? ""} onChange={(e) => setDraft({ ...draft, model: e.target.value })} disabled={!canEdit} />
                    </label>
                    <label className="text-sm">Temperatură
                      <input type="number" step="0.1" min="0" max="1" className={field} value={draft.temperature ?? 0.3}
                        onChange={(e) => setDraft({ ...draft, temperature: Number(e.target.value) })} disabled={!canEdit} />
                    </label>
                    <label className="text-sm">Email escaladare
                      <input className={field} value={draft.handoff_email ?? ""} onChange={(e) => setDraft({ ...draft, handoff_email: e.target.value })} disabled={!canEdit} />
                    </label>
                  </div>
                  <label className="block text-sm">Misiune
                    <textarea rows={2} className={field} value={draft.mission ?? ""} onChange={(e) => setDraft({ ...draft, mission: e.target.value })} disabled={!canEdit} />
                  </label>
                  <label className="block text-sm">Instrucțiuni (system prompt)
                    <textarea rows={5} className={field} value={draft.system_prompt ?? ""} onChange={(e) => setDraft({ ...draft, system_prompt: e.target.value })} disabled={!canEdit} />
                  </label>
                  <label className="block text-sm">Reguli de siguranță
                    <textarea rows={3} className={field} value={draft.guardrails ?? ""} onChange={(e) => setDraft({ ...draft, guardrails: e.target.value })} disabled={!canEdit} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">Salut RO
                      <input className={field} value={draft.greeting_ro ?? ""} onChange={(e) => setDraft({ ...draft, greeting_ro: e.target.value })} disabled={!canEdit} />
                    </label>
                    <label className="text-sm">Salut EN
                      <input className={field} value={draft.greeting_en ?? ""} onChange={(e) => setDraft({ ...draft, greeting_en: e.target.value })} disabled={!canEdit} />
                    </label>
                  </div>
                  {canEdit && (
                    <button type="button" onClick={() => void saveAgent()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                      <Save className="size-4" /> Salvează agentul
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "knowledge" && (
          <div className="space-y-4">
            <input className={field} placeholder="Caută în baza de cunoștințe…" value={search} onChange={(e) => void searchKnowledge(e.target.value)} />
            {canEdit && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
                <p className="text-sm font-medium">Adaugă o cunoștință</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select className={field} value={kbDraft.category} onChange={(e) => setKbDraft({ ...kbDraft, category: e.target.value })}>
                    {["general", "agentie", "produse", "preturi", "proces", "contact", "tehnic", "obiectii"].map((v) => <option key={v}>{v}</option>)}
                  </select>
                  <select className={field} value={kbDraft.language} onChange={(e) => setKbDraft({ ...kbDraft, language: e.target.value })}>
                    <option value="ro">ro</option><option value="en">en</option>
                  </select>
                  <input type="number" min={1} max={10} className={field} value={kbDraft.priority ?? 5}
                    onChange={(e) => setKbDraft({ ...kbDraft, priority: Number(e.target.value) })} aria-label="Prioritate" />
                </div>
                <input className={field} placeholder="Întrebare" value={kbDraft.question ?? ""} onChange={(e) => setKbDraft({ ...kbDraft, question: e.target.value })} />
                <textarea rows={3} className={field} placeholder="Răspuns" value={kbDraft.answer ?? ""} onChange={(e) => setKbDraft({ ...kbDraft, answer: e.target.value })} />
                <input className={field} placeholder="Cuvinte cheie (separate prin spațiu)" value={kbDraft.keywords ?? ""} onChange={(e) => setKbDraft({ ...kbDraft, keywords: e.target.value })} />
                <button type="button" onClick={() => void saveKnowledge()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  <Plus className="size-4" /> Salvează
                </button>
              </div>
            )}
            <ul className="space-y-2">
              {knowledge.map((row) => (
                <li key={row.id} className="rounded-xl border border-border/60 bg-card/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{row.question}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{row.answer}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {row.category} · {row.language} · p{row.priority} · {row.source} · {row.hits} folosiri · {row.status}
                      </p>
                    </div>
                    {canEdit && (
                      <button type="button" aria-label="Arhivează" onClick={() => void aiOsAdmin.archiveKnowledge(row.id).then(() => searchKnowledge(search))}
                        className="rounded-lg border border-border/60 p-2 hover:bg-muted">
                        <Archive className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && tab === "learning" && (
          <ul className="space-y-2">
            {learning.length === 0 && <li className="text-sm text-muted-foreground">Nicio întrebare în așteptare — agentul acoperă tot ce a fost întrebat.</li>}
            {learning.map((row) => (
              <LearningItem key={row.id} row={row} canEdit={canEdit} onDone={() => void load()} />
            ))}
          </ul>
        )}

        {!loading && tab === "conversations" && (
          <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
            <ul className="space-y-2">
              {conversations.map((row) => (
                <li key={row.id}>
                  <button type="button" onClick={() => void aiOsAdmin.transcript(row.id).then((r) => setTranscript(r.data))}
                    className="w-full rounded-xl border border-border/60 p-3 text-left text-sm hover:bg-muted/50">
                    <span className="font-medium">{row.agent_slug}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.page || "—"} · {row.messages} mesaje · {new Date(row.last_at * 1000).toLocaleString("ro-RO")}
                    </span>
                  </button>
                </li>
              ))}
              {conversations.length === 0 && <li className="text-sm text-muted-foreground">Încă nicio conversație.</li>}
            </ul>
            <div className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4">
              {!transcript && <p className="text-sm text-muted-foreground">Alege o conversație.</p>}
              {transcript?.map((m, index) => (
                <p key={index} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className="font-mono text-[10px] uppercase">{m.role}</span> — {m.content}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LearningItem = ({ row, canEdit, onDone }: { row: LearningRow; canEdit: boolean; onDone: () => void }) => {
  const [answer, setAnswer] = useState("");
  return (
    <li className="space-y-2 rounded-xl border border-border/60 bg-card/50 p-3">
      <p className="text-sm font-medium">{row.question}</p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {row.agent_slug} · {row.language} · {row.occurrences}x · acoperire {Math.round(row.best_score * 100)}%
      </p>
      {canEdit && (
        <>
          <textarea rows={2} className={field} placeholder="Răspunsul oficial…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" disabled={!answer.trim()}
              onClick={() => void aiOsAdmin.resolveLearning(row.id, { action: "approve", answer }).then(onDone)}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
              Învață
            </button>
            <button type="button" onClick={() => void aiOsAdmin.resolveLearning(row.id, { action: "reject" }).then(onDone)}
              className="rounded-lg border border-border/60 px-3 py-1.5 text-sm">
              Ignoră
            </button>
          </div>
        </>
      )}
    </li>
  );
};

export default AiOs;
