import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  LoaderCircle,
  RefreshCw,
  Send,
  Save,
  Settings2,
  MessageSquare,
  Activity,
} from "lucide-react";
import {
  aiOsAdmin,
  avyApi,
  type AiAgent,
  type AvyRuntimeStatus,
} from "@/lib/aiOsApi";
import { registerServicePageGuard } from "@/lib/servicePageNavigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
type Conversation = {
  id: string;
  agent_slug: string;
  language: string;
  page: string | null;
  messages: number;
  last_at: number;
};
type Message = {
  role: string;
  content: string;
  created_at?: number;
  source?: string;
};
type Tab = "test" | "configuration" | "conversations";
const field =
  "w-full rounded-xl border border-white/15 bg-[#0b1120] px-3 py-2 text-base text-slate-100 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 md:text-sm";
const blockers: Record<string, string> = {
  agent_inactive: "Agentul este inactiv sau nepublic",
  version_unapproved: "Versiunea curentă nu este aprobată",
  ai_binding_unavailable: "Conexiunea Workers AI lipsește",
  model_unavailable: "Modelul nu este disponibil",
  provider_policy_inactive:
    "Permisiunea furnizorului pentru AVY nu este activă",
  provider_quota_unavailable: "Cota furnizorului nu este configurată",
  provider_quota_exhausted: "Cota gratuită este epuizată",
  paused: "Agentul este oprit prin politica platformei",
  budget_exhausted: "Bugetul agentului este epuizat",
};
const editable = [
  "name",
  "mission",
  "status",
  "greeting_ro",
  "greeting_en",
  "system_prompt",
  "guardrails",
  "temperature",
  "max_tokens",
  "starter_questions_ro",
  "starter_questions_en",
  "proactive_prompts_ro",
  "proactive_prompts_en",
] as const;
const settings = (agent: AiAgent) =>
  Object.fromEntries(editable.map((k) => [k, agent[k]])) as Partial<AiAgent>;
export default function AvyChatbotTab() {
  const [agent, setAgent] = useState<AiAgent | null>(null),
    [draft, setDraft] = useState<Partial<AiAgent>>({}),
    [canEdit, setCanEdit] = useState(false),
    [runtime, setRuntime] = useState<AvyRuntimeStatus | null>(null),
    [conversations, setConversations] = useState<Conversation[]>([]),
    [tab, setTab] = useState<Tab>("test"),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const baseline = useRef("{}"),
    loadEpoch = useRef(0),
    transcriptEpoch = useRef(0),
    visitor = useRef(crypto.randomUUID()),
    log = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [conversationId, setConversationId] = useState<string | null>(null),
    [sending, setSending] = useState(false),
    [chatError, setChatError] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [transcript, setTranscript] = useState<Message[] | null>(null),
    [transcriptError, setTranscriptError] = useState("");
  const dirty = JSON.stringify(draft) !== baseline.current;
  const load = useCallback(async () => {
    const epoch = ++loadEpoch.current;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      aiOsAdmin.agents(),
      aiOsAdmin.runtime(),
      aiOsAdmin.conversations("avy"),
    ]);
    if (epoch !== loadEpoch.current) return;
    const agents = results[0],
      status = results[1],
      rows = results[2];
    if (agents.status === "fulfilled") {
      const current = agents.value.data.find((a) => a.slug === "avy") || null;
      setAgent(current);
      setCanEdit(agents.value.canEdit);
      const next = current ? settings(current) : {};
      baseline.current = JSON.stringify(next);
      setDraft(next);
      setConfirmed(false);
    }
    if (status.status === "fulfilled") setRuntime(status.value);
    else setRuntime(null);
    if (rows.status === "fulfilled") setConversations(rows.value.data);
    if (results.some((r) => r.status === "rejected"))
      setError(
        "Unele date nu s-au încărcat. Verifică sesiunea și reîncearcă; starea modelului nu este presupusă.",
      );
    setLoading(false);
  }, []);
  useEffect(() => {
    const loadingRef = loadEpoch,
      transcriptRef = transcriptEpoch;
    void load();
    return () => {
      loadingRef.current++;
      transcriptRef.current++;
    };
  }, [load]);
  // The existing dashboard edit guard is shared with platform configuration surfaces.
  useEffect(
    () =>
      registerServicePageGuard(
        async () =>
          !dirty ||
          window.confirm("Ai modificări nesalvate la chatbot. Renunți la ele?"),
      ),
    [dirty],
  );
  useEffect(() => {
    const leaving = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leaving);
    return () => window.removeEventListener("beforeunload", leaving);
  }, [dirty]);
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [messages, sending]);
  const change = (key: keyof AiAgent, value: string | number) => {
    setDraft((old) => ({ ...old, [key]: value }));
    setConfirmed(false);
    setNotice("");
  };
  const save = async () => {
    if (!agent || !canEdit || !confirmed || saving) return;
    setSaving(true);
    setError("");
    try {
      const result = await aiOsAdmin.saveAgent("avy", {
        ...draft,
        expectedVersion: agent.current_version,
      });
      await load();
      setNotice(
        `Configurație salvată și aprobată · versiunea ${result.version}.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Configurația nu s-a salvat. Modificările sunt păstrate.",
      );
    } finally {
      setSaving(false);
    }
  };
  const send = async () => {
    const text = input.trim();
    if (text.length < 2 || sending || !agent) return;
    setSending(true);
    setChatError("");
    setInput("");
    setMessages((old) => [...old, { role: "user", content: text }]);
    try {
      const reply = await avyApi.chat({
        agent: "avy",
        message: text,
        conversationId,
        visitorId: visitor.current,
        language: "ro",
        page: "/profil?tab=ai-os&chatbot-test=1",
      });
      setConversationId(reply.conversationId);
      setMessages((old) => [
        ...old,
        { role: "assistant", content: reply.reply, source: reply.answerSource },
      ]);
    } catch (e) {
      setInput((old) => old || text);
      setChatError(
        e instanceof Error && e.message.includes("429")
          ? "Limita de conversație a fost atinsă. Textul este păstrat; reîncearcă ulterior."
          : "Răspunsul nu a putut fi obținut. Textul este păstrat pentru reîncercare.",
      );
    } finally {
      setSending(false);
    }
  };
  const openTranscript = async (id: string) => {
    const epoch = ++transcriptEpoch.current;
    setSelected(id);
    setTranscript(null);
    setTranscriptError("");
    try {
      const result = await aiOsAdmin.transcript(id);
      if (epoch === transcriptEpoch.current) setTranscript(result.data);
    } catch {
      if (epoch === transcriptEpoch.current)
        setTranscriptError("Conversația nu a putut fi încărcată.");
    }
  };
  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[10px] uppercase tracking-[.2em] text-violet-300">
              Platformă · Asistentul public AVYRON
            </p>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold">
              <Bot size={24} />
              AVY ChatBot AI
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Conversații generale, explicații și ajutor practic. Informațiile
              despre AVYRON folosesc sursele publice aprobate; documentele
              interne nu sunt accesibile chatbotului.
            </p>
          </div>
          <Button
            variant="outline"
            disabled={loading || saving}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(
                  "Reîncarci și renunți la modificările nesalvate?",
                )
              )
                void load();
            }}
          >
            <RefreshCw size={15} />
            Actualizează
          </Button>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-amber-400/25 p-3 text-sm text-amber-200"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-300">
          {notice}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Status
          title="Agent public"
          value={
            agent
              ? `${agent.name} · ${agent.status}`
              : loading
                ? "Se verifică…"
                : "Neîncărcat"
          }
        />
        <Status
          title="Conversație generativă"
          value={
            runtime
              ? runtime.mode === "model_ready"
                ? "Configurată pentru generare"
                : "Limitată la surse și răspunsuri locale"
              : "Stare neverificată"
          }
        />
        <Status
          title="Cotă furnizor"
          value={
            runtime?.quota
              ? `${runtime.quota.used} / ${runtime.quota.total ?? "neconfigurată"} · ${runtime.quota.hardStopBeforePaid ? "oprire înainte de costuri" : "verifică politica de cost"}`
              : "Neconfigurată / neverificată"
          }
        />
      </div>
      {runtime && runtime.blockers.length > 0 && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-sm text-amber-100">
          <p>Generarea nu este încă disponibilă:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {runtime.blockers.map((reason) => (
              <li key={reason}>{blockers[reason] || reason}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            <a className="underline" href="/profil?tab=finance">
              Financiar: verifică permisiunea și cota existente
            </a>
            . Actualizarea agentului nu activează furnizori și nu mărește
            bugete.
          </p>
        </div>
      )}
      <nav aria-label="Administrare chatbot" className="flex flex-wrap gap-2">
        {(
          [
            ["test", "Conversație de test", MessageSquare],
            ["configuration", "Configurare", Settings2],
            ["conversations", "Conversații recente", Activity],
          ] as const
        ).map(([key, label, Icon]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            <Icon size={15} />
            {label}
          </Button>
        ))}
      </nav>
      {tab === "test" && (
        <section
          aria-label="Test chatbot public"
          className="rounded-2xl border p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Testează o conversație cu AVY</h2>
            <Button
              size="sm"
              variant="outline"
              disabled={sending}
              onClick={() => {
                visitor.current = crypto.randomUUID();
                setConversationId(null);
                setMessages([]);
                setInput("");
                setChatError("");
              }}
            >
              Conversație nouă
            </Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Același flux ca pe site, cu surse publice. Folosește date de test;
            mesajele apar în istoricul chatbotului.
          </p>
          <div
            ref={log}
            role="log"
            aria-label="Mesaje de test"
            aria-live="polite"
            className="my-3 max-h-[350px] min-h-40 space-y-3 overflow-y-auto rounded-xl bg-black/15 p-3"
          >
            {!messages.length && (
              <p className="text-sm text-slate-400">
                {agent?.greeting_ro || "Bună! Cu ce te pot ajuta?"}
              </p>
            )}
            {messages.map((message, index) => (
              <article
                key={index}
                className={`max-w-[94%] rounded-xl border p-3 text-sm ${message.role === "user" ? "ml-auto border-violet-400/25 bg-violet-500/10" : "border-white/10 bg-white/[.025]"}`}
              >
                <b className="text-xs text-violet-200">
                  {message.role === "user" ? "Tu" : "AVY"}
                </b>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                {message.source && (
                  <p className="mt-2 text-[10px] text-slate-400">
                    {
                      (
                        {
                          conversation: "Răspuns conversațional local",
                          knowledge: "Surse publice verificate",
                          model: "Răspuns generat cu AI",
                          unavailable: "Mod generativ indisponibil",
                        } as Record<string, string>
                      )[message.source]
                    }
                  </p>
                )}
              </article>
            ))}
            {sending && (
              <p role="status" className="text-xs text-slate-400">
                AVY pregătește răspunsul…
              </p>
            )}
          </div>
          {chatError && (
            <p role="alert" className="mb-2 text-sm text-amber-200">
              {chatError}
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <label className="min-w-0 flex-1 text-xs">
              Mesaj de test
              <textarea
                aria-label="Mesaj de test"
                rows={2}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className={`${field} mt-1`}
                placeholder="O întrebare, o idee sau o continuare…"
              />
            </label>
            <Button
              aria-label="Trimite mesajul de test"
              disabled={
                sending ||
                input.trim().length < 2 ||
                !agent ||
                agent.status !== "active" ||
                agent.visibility !== "public"
              }
            >
              {sending ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <Send size={17} />
              )}
            </Button>
          </form>
        </section>
      )}
      {tab === "configuration" && (
        <section className="space-y-4 rounded-2xl border p-4">
          <div>
            <h2 className="font-semibold">Configurarea agentului de pe site</h2>
            <p className="mt-1 text-xs text-slate-400">
              {canEdit
                ? "Revizuiește schimbările înainte de a salva o versiune aprobată."
                : "Consultare conform permisiunilor AI existente. Modificările sunt rezervate operatorului autorizat."}
            </p>
          </div>
          {agent ? (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    ["name", "Nume afișat", 100],
                    ["mission", "Rol și misiune", 1000],
                    ["greeting_ro", "Salut în română", 1000],
                    ["greeting_en", "Salut în engleză", 1000],
                    ["system_prompt", "Instrucțiunile agentului", 6000],
                    ["guardrails", "Reguli și limite", 3000],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key} className="space-y-1 text-xs">
                    {label}
                    <textarea
                      aria-label={label}
                      className={field}
                      rows={
                        key === "system_prompt" || key === "guardrails" ? 5 : 2
                      }
                      maxLength={max}
                      disabled={!canEdit || saving}
                      value={String(draft[key] || "")}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  </label>
                ))}
                <label className="space-y-1 text-xs">
                  Stare
                  <select
                    className={field}
                    disabled={!canEdit || saving}
                    value={draft.status || "paused"}
                    onChange={(e) => change("status", e.target.value)}
                  >
                    <option value="active">Activ</option>
                    <option value="paused">În pauză</option>
                    <option value="draft">Ciornă</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs">
                  Lungimea maximă a răspunsului
                  <input
                    type="number"
                    min={64}
                    max={800}
                    className={field}
                    disabled={!canEdit || saving}
                    value={draft.max_tokens ?? 600}
                    onChange={(e) =>
                      change("max_tokens", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400">
                Conversația generală respectă instrucțiunile aprobate, cotele și
                politica platformei. Nu activează acces la date interne sau
                acțiuni automate.
              </p>
              {canEdit && (
                <>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={saving}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Am revizuit conținutul și aprob aplicarea acestei
                    configurații publice.
                  </label>
                  <Button
                    disabled={!dirty || !confirmed || saving || sending}
                    onClick={() => void save()}
                  >
                    <Save size={15} />
                    {saving ? "Se salvează…" : "Salvează configurația aprobată"}
                  </Button>
                </>
              )}
              <a
                className="block text-xs text-violet-200 underline"
                href="/intern/ai-os?ai_panel=agents"
              >
                Cunoștințe, surse, întrebări sugerate și administrare avansată
              </a>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              Agentul AVY nu a fost încărcat. Reîncearcă fără a crea un agent
              paralel.
            </p>
          )}
        </section>
      )}
      {tab === "conversations" && (
        <section className="space-y-3 rounded-2xl border p-4">
          <h2 className="font-semibold">Conversațiile chatbotului public</h2>
          <p className="text-xs text-slate-400">
            Cele mai recente 50 de conversații ale agentului AVY, inclusiv
            testele efectuate din consolă.
          </p>
          {conversations.length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {conversations.map((row) => (
                <article key={row.id} className="min-w-0 rounded-xl border p-3">
                  <p className="text-sm">
                    {row.language.toUpperCase()} · {row.messages} mesaje
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-400">
                    {new Date(row.last_at).toLocaleString("ro-RO")} ·{" "}
                    {row.page?.includes("chatbot-test=1")
                      ? "Context de test"
                      : row.page || "Site public"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => void openTranscript(row.id)}
                  >
                    Deschide conversația
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {loading
                ? "Se încarcă…"
                : error
                  ? "Istoricul nu a putut fi verificat."
                  : "Nu există conversații în lista curentă."}
            </p>
          )}
        </section>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            transcriptEpoch.current++;
            setSelected(null);
          }
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Conversație AVY</DialogTitle>
            <DialogDescription>
              Istoric autorizat al chatbotului public
            </DialogDescription>
          </DialogHeader>
          {transcriptError ? (
            <p role="alert">{transcriptError}</p>
          ) : !transcript ? (
            <p role="status">Se încarcă…</p>
          ) : (
            transcript.map((message, index) => (
              <article key={index} className="rounded-xl border p-3">
                <b className="text-xs">
                  {message.role === "user" ? "Vizitator" : "AVY"}
                </b>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </p>
              </article>
            ))
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
function Status({ title, value }: { title: string; value: string }) {
  return (
    <article className="min-w-0 rounded-xl border bg-white/[.02] p-3">
      <h2 className="text-xs text-slate-400">{title}</h2>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </article>
  );
}
