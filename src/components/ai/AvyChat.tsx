import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, X, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { avyApi, type ChatReply } from "@/lib/aiOsApi";
import { trackEvent } from "@/lib/analytics";

type Msg = { id: string; role: "user" | "assistant"; text: string; rated?: boolean };

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
    chips: ["Cât costă un site?", "Ce include blogul profesional?", "Cum începem?"],
    helpful: "Ți-a fost util?",
    thanks: "Mulțumim!",
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
    chips: ["How much is a website?", "What is in the professional blog?", "How do we start?"],
    helpful: "Was this helpful?",
    thanks: "Thank you!",
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

/** Buton flotant (stânga, mijloc) + panou de chat conectat la AI OS "AVY". */
const AvyChat = ({ agent = "avy" }: { agent?: string }) => {
  const { lang } = useLang();
  const t = COPY[lang === "en" ? "en" : "ro"];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: "welcome", role: "assistant", text: t.hello, rated: true }]);
      trackEvent("avy_open", { agent });
    }
  }, [open, messages.length, t.hello, agent]);

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
          language: lang === "en" ? "en" : "ro",
          page: window.location.pathname,
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
    [agent, busy, conversationId, lang, t.error],
  );

  const rate = (id: string, helpful: boolean) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, rated: true } : m)));
    void avyApi.feedback(id, helpful).catch(() => undefined);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.open}
        aria-expanded={open}
        className="fixed left-3 top-1/2 z-40 -translate-y-1/2 rounded-2xl border border-border/60 bg-background/70 p-3 shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
                {t.chips.map((chip) => (
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
