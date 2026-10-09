import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Bot, Send, X, Sparkles, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/i18n/LanguageContext";
import { avyApi, type ChatReply, type PublicAgent } from "@/lib/aiOsApi";
import { trackEvent } from "@/lib/analytics";
import {
  AVY_PROMPT_DELAY_MS,
  canShowProactivePrompt,
  normalizePromptList,
  selectProactivePrompt,
} from "./avyChatExperience";

type Msg = { id: string; role: "user" | "assistant"; text: string; rated?: boolean };

type StoredChat = { conversationId: string | null; messages: Msg[] };

/** Numărul real de WhatsApp AVYRON (format internațional, fără spații). */
export const AVYRON_WHATSAPP = "40734605055";

const COPY = {
  ro: {
    open: "Discută cu AVY, asistentul Avyron",
    title: "AVY · Asistent Avyron",
    subtitle: "Prețuri, produse, proces — răspuns pe loc",
    placeholder: "Scrie întrebarea ta…",
    send: "Trimite",
    close: "Închide conversația",
    error: "Nu am putut răspunde acum. Scrie-ne la contact@avyron.ro.",
    hello: "Salut! Sunt AVY. Te ajut cu prețuri, produse sau o estimare rapidă.",
    chips: ["Cât costă un site?", "Vreau o ofertă", "Audit gratuit la site-ul meu", "În cât timp e gata?"],
    helpful: "Ți-a fost util?",
    thanks: "Mulțumim!",
    wa: "Continuă pe WhatsApp",
    waHint: "Trimitem conversația cu AVY direct în WhatsApp, la un consultant real.",
    waIntro: "Bună! Am discutat cu AVY pe site și vreau să continuăm aici.",
    waYou: "Eu",
    waPage: "Pagina",
    connected: "Conectat la AVY OS",
    dismissPrompt: "Ascunde invitația",
  },
  en: {
    open: "Chat with AVY, the Avyron assistant",
    title: "AVY · Avyron Assistant",
    subtitle: "Pricing, products, process — instant answers",
    placeholder: "Type your question…",
    send: "Send",
    close: "Close chat",
    error: "I could not answer right now. Write to contact@avyron.ro.",
    hello: "Hi! I am AVY. Ask me about pricing, products or a quick estimate.",
    chips: ["How much is a website?", "I want a quote", "Free audit of my site", "How long does it take?"],
    helpful: "Was this helpful?",
    thanks: "Thank you!",
    wa: "Continue on WhatsApp",
    waHint: "We send your AVY conversation straight to WhatsApp, to a real consultant.",
    waIntro: "Hi! I chatted with AVY on your site and I would like to continue here.",
    waYou: "Me",
    waPage: "Page",
    connected: "Connected to AVY OS",
    dismissPrompt: "Dismiss prompt",
  },
} as const;


const visitorId = () => {
  try {
    const key = "avy_visitor";
    let value = localStorage.getItem(key);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(key, value);
    }
    return value;
  } catch {
    return undefined;
  }
};

const chatStorageKey = (agent: string) => `avy_chat_state:${agent}`;
const promptStorageKey = (agent: string) => `avy_prompt_seen:${agent}`;

const readStoredChat = (agent: string): StoredChat => {
  try {
    const parsed = JSON.parse(localStorage.getItem(chatStorageKey(agent)) || "null") as Partial<StoredChat> | null;
    const conversationId = typeof parsed?.conversationId === "string" && /^conv_[a-z0-9]+$/.test(parsed.conversationId)
      ? parsed.conversationId
      : null;
    const messages = Array.isArray(parsed?.messages)
      ? parsed.messages.filter((message): message is Msg => Boolean(
        message
        && typeof message.id === "string"
        && (message.role === "user" || message.role === "assistant")
        && typeof message.text === "string"
        && message.text.length <= 10_000,
      )).slice(-30)
      : [];
    return { conversationId, messages };
  } catch {
    return { conversationId: null, messages: [] };
  }
};

const writeStoredChat = (agent: string, state: StoredChat) => {
  try {
    localStorage.setItem(chatStorageKey(agent), JSON.stringify({
      conversationId: state.conversationId,
      messages: state.messages.filter((message) => message.id !== "welcome").slice(-30),
    }));
  } catch {
    /* Browser storage may be unavailable. The current chat still works. */
  }
};

/** Buton flotant (stânga, mijloc) + panou de chat conectat la AI OS "AVY". */
const AvyChat = ({ agent = "avy", initiallyOpen = false }: { agent?: string; initiallyOpen?: boolean }) => {
  const { lang } = useLang();
  const { pathname } = useLocation();
  const t = COPY[lang === "en" ? "en" : "ro"];
  const language = lang === "en" ? "en" : "ro";
  const [open, setOpen] = useState(initiallyOpen);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [publicAgent, setPublicAgent] = useState<PublicAgent | null>(null);
  const [connected, setConnected] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [proactivePrompt, setProactivePrompt] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  const greeting = language === "en"
    ? publicAgent?.greeting_en || t.hello
    : publicAgent?.greeting_ro || t.hello;
  const chips = useMemo(
    () => normalizePromptList(publicAgent?.starterQuestions?.[language], t.chips),
    [language, publicAgent, t.chips],
  );
  const proactivePrompts = useMemo(
    () => normalizePromptList(publicAgent?.proactivePrompts?.[language], [
      language === "en" ? "Do you need a website?" : "Ai nevoie de un site?",
    ]),
    [language, publicAgent],
  );

  useEffect(() => {
    const stored = readStoredChat(agent);
    setConversationId(stored.conversationId);
    setMessages(stored.messages);
    setHydrated(true);

    let active = true;
    void avyApi.agents()
      .then((agents) => {
        if (!active) return;
        const configured = agents.find((candidate) => candidate.slug === agent) ?? null;
        setPublicAgent(configured);
        setConnected(Boolean(configured));
      })
      .catch(() => {
        if (active) setConnected(false);
      });
    return () => {
      active = false;
    };
  }, [agent]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredChat(agent, { conversationId, messages });
  }, [agent, conversationId, hydrated, messages]);

  useEffect(() => {
    if (!open || messages.length !== 0) return;
    setMessages([{ id: "welcome", role: "assistant", text: greeting, rated: true }]);
    trackEvent("avy_open", { agent });
  }, [agent, greeting, messages.length, open]);

  useEffect(() => {
    setMessages((current) => current.map((message) => (
      message.id === "welcome" ? { ...message, text: greeting } : message
    )));
  }, [greeting]);

  useEffect(() => {
    if (!hydrated || open || conversationId || messages.some((message) => message.role === "user")) return;
    let lastShown: number | null = null;
    try {
      const stored = Number(localStorage.getItem(promptStorageKey(agent)));
      lastShown = Number.isFinite(stored) && stored > 0 ? stored : null;
    } catch {
      /* A prompt can still appear once without persistence. */
    }
    if (!canShowProactivePrompt(lastShown)) return;

    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const prompt = selectProactivePrompt(proactivePrompts, pathname);
      if (!prompt) return;
      setProactivePrompt(prompt);
      try {
        localStorage.setItem(promptStorageKey(agent), String(Date.now()));
      } catch {
        /* ignore */
      }
      trackEvent("avy_prompt_view", { agent, page: pathname });
    }, AVY_PROMPT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [agent, conversationId, hydrated, messages, open, pathname, proactivePrompts]);

  const clamp = useCallback((x: number, y: number) => {
    const el = bubbleRef.current;
    const w = el?.offsetWidth ?? 56;
    const h = el?.offsetHeight ?? 56;
    const m = 8;
    return {
      x: Math.min(Math.max(x, m), Math.max(m, window.innerWidth - w - m)),
      y: Math.min(Math.max(y, m), Math.max(m, window.innerHeight - h - m)),
    };
  }, []);

  // Poziția salvată (bubble style Messenger) + repoziționare la resize.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("avy_bubble_pos");
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") setPos(clamp(parsed.x, parsed.y));
      }
    } catch {
      /* ignore */
    }
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  const onBubblePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rect = e.currentTarget.getBoundingClientRect();
      dragState.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(true);

      const move = (ev: PointerEvent) => {
        const st = dragState.current;
        if (!st) return;
        const next = clamp(ev.clientX - st.dx, ev.clientY - st.dy);
        if (Math.abs(next.x - rect.left) > 4 || Math.abs(next.y - rect.top) > 4) st.moved = true;
        setPos(next);
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        setDragging(false);
        setPos((p) => {
          if (p) {
            try {
              localStorage.setItem("avy_bubble_pos", JSON.stringify(p));
            } catch {
              /* ignore */
            }
          }
          return p;
        });
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [clamp],
  );

  const onBubbleClick = useCallback(() => {
    if (dragState.current?.moved) {
      dragState.current = null;
      return;
    }
    setProactivePrompt(null);
    setOpen((v) => !v);
  }, []);

  const onBubbleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      const step = e.shiftKey ? 40 : 12;
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = map[e.key];
      if (!delta) return;
      e.preventDefault();
      const rect = bubbleRef.current?.getBoundingClientRect();
      const base = pos ?? { x: rect?.left ?? 12, y: rect?.top ?? 80 };
      const next = clamp(base.x + delta[0], base.y + delta[1]);
      setPos(next);
      try {
        localStorage.setItem("avy_bubble_pos", JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [clamp, pos],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setInput("");
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text, rated: true }]);
      setBusy(true);
      try {
        const reply: ChatReply = await avyApi.chat({
          agent,
          message: text,
          conversationId,
          language,
          page: pathname,
          visitorId: visitorId(),
        });
        setConversationId(reply.conversationId);
        setMessages((prev) => [...prev, { id: reply.messageId, role: "assistant", text: reply.reply }]);
        trackEvent("avy_message", { agent, confidence: reply.confidence });
      } catch {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: t.error, rated: true }]);
      } finally {
        setBusy(false);
      }
    },
    [agent, busy, conversationId, language, pathname, t.error],
  );

  const waHref = useMemo(() => {
    const transcript = messages
      .filter((m) => m.id !== "welcome")
      .slice(-8)
      .map((m) => `${m.role === "user" ? t.waYou : "AVY"}: ${m.text}`)
      .join("\n");
    const page = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";
    const body = [t.waIntro, transcript, page ? `${t.waPage}: ${page}` : ""].filter(Boolean).join("\n\n");
    return `https://wa.me/${AVYRON_WHATSAPP}?text=${encodeURIComponent(body.slice(0, 1500))}`;
  }, [messages, t.waIntro, t.waPage, t.waYou]);

  const rate = (id: string, helpful: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, rated: true } : m)));
    void avyApi.feedback(id, helpful).catch(() => undefined);
  };


  return (
    <>
      {proactivePrompt && !open && (
        <div
          role="status"
          className={`fixed z-40 flex max-w-[min(18rem,calc(100vw-5.5rem))] items-start gap-2 rounded-2xl border border-primary/30 bg-background/92 p-2 pl-3 text-sm shadow-xl backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 ${
            pos ? "" : "left-[4.75rem] top-20"
          }`}
          style={pos ? {
            left: Math.min(pos.x + 64, Math.max(8, window.innerWidth - 288)),
            top: Math.min(pos.y, Math.max(8, window.innerHeight - 96)),
          } : undefined}
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left font-medium leading-5 text-foreground"
            onClick={() => {
              setProactivePrompt(null);
              setOpen(true);
              trackEvent("avy_prompt_open", { agent, page: pathname });
            }}
          >
            <span className="mr-1 text-primary" aria-hidden>✦</span>{proactivePrompt}
          </button>
          <button type="button" onClick={() => setProactivePrompt(null)} aria-label={t.dismissPrompt} className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <button
        ref={bubbleRef}
        type="button"
        onPointerDown={onBubblePointerDown}
        onClick={onBubbleClick}
        onKeyDown={onBubbleKeyDown}
        aria-label={t.open}
        aria-expanded={open}
        style={pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : undefined}
        className={`fixed z-40 touch-none select-none rounded-2xl border border-border/60 bg-background/70 p-3 shadow-lg backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
          pos ? "" : "left-3 top-20"
        } ${dragging ? "scale-105 cursor-grabbing" : "cursor-grab transition hover:scale-105 hover:bg-background/90"}`}
      >
        <span className="relative flex items-center gap-2">
          <span className="absolute -inset-2 -z-10 rounded-2xl bg-primary/20 blur-xl" aria-hidden />
          <Bot className="size-5 text-primary" strokeWidth={2.25} />
          <span className="hidden text-xs font-semibold tracking-wide sm:inline">AVY</span>
        </span>
      </button>


      {open && (
        <div
          role="dialog"
          aria-label={t.title}
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/85 shadow-2xl backdrop-blur-xl sm:inset-auto sm:left-4 sm:top-1/2 sm:h-[560px] sm:w-[380px] sm:-translate-y-1/2"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-r from-primary/10 to-transparent p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" aria-hidden /> {t.title}
              </p>
              <p className="truncate text-xs text-muted-foreground">{t.subtitle}</p>
              {connected && (
                <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-current" aria-hidden /> {t.connected}
                </p>
              )}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="rounded-md p-1 hover:bg-muted">
              <X className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground"
                  }`}
                >
                  {m.text}
                  {m.role === "assistant" && !m.rated && (
                    <span className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {t.helpful}
                      <button type="button" aria-label="👍" onClick={() => rate(m.id, true)} className="rounded p-1 hover:bg-background">
                        <ThumbsUp className="size-3.5" />
                      </button>
                      <button type="button" aria-label="👎" onClick={() => rate(m.id, false)} className="rounded p-1 hover:bg-background">
                        <ThumbsDown className="size-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-xs text-muted-foreground">AVY…</div>}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => void send(chip)}
                    className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-xs transition hover:border-primary/60 hover:text-primary"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-muted/30 px-3 py-2.5">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("cta_click", { type: "whatsapp", source: "avy_chat", agent })}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <MessageCircle className="size-4" aria-hidden /> {t.wa}
            </a>
            <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">{t.waHint}</p>
          </div>



          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border/60 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.placeholder}
              maxLength={800}
              className="min-w-0 flex-1 rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={t.send}
              className="rounded-xl bg-primary p-2.5 text-primary-foreground transition disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AvyChat;
