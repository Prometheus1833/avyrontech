import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  Hash,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";
import { workspaceApi } from "@/lib/workspaceApi";
import { useAuth } from "@/hooks/useAuth";
import { staffRankLabel, STAFF_MANAGED } from "@/shared/staffAccess";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import "./staffChat.css";
type Member = {
  id: string;
  display_name: string;
  staff_role: string | null;
  rank_id?: string | null;
};
type Message = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
};
type Thread = {
  target: string;
  last_id: string;
  last_content: string;
  last_at: string;
  unread: number;
};
const channels = {
  general: "General",
  dev: "Dezvoltare",
  design: "Design",
  marketing: "Marketing",
  random: "Pauză",
};
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro");
const clock = (s: string) =>
  new Date(s).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
const day = (s: string) =>
  new Date(s).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function lastItem<T>(items: T[]) {
  return items[items.length - 1];
}
export function StaffChatTab() {
  const { user, capabilities } = useAuth(),
    [params, setParams] = useSearchParams();
  const [members, setMembers] = useState<Member[]>([]),
    [threads, setThreads] = useState<Thread[]>([]),
    [messages, setMessages] = useState<Message[]>([]);
  const [target, setTarget] = useState(() =>
      params.get("dm") ? `dm:${params.get("dm")}` : "channel:general",
    ),
    [mobileOpen, setMobileOpen] = useState(() => !!params.get("dm"));
  const [query, setQuery] = useState(""),
    [messageSearch, setMessageSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [emojiOpen, setEmojiOpen] = useState(false);
  const [content, setContent] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [directoryError, setDirectoryError] = useState(""),
    [sendingTarget, setSendingTarget] = useState<string | null>(null),
    [older, setOlder] = useState(false),
    [loadingOlder, setLoadingOlder] = useState(false),
    [tick, setTick] = useState(0),
    [newMessages, setNewMessages] = useState(false);
  const drafts = useRef(new Map<string, string>()),
    attempts = useRef(new Map<string, { content: string; key: string }>()),
    targetRef = useRef(target),
    contentRef = useRef(content),
    listRef = useRef<HTMLDivElement>(null),
    inputRef = useRef<HTMLTextAreaElement>(null),
    keepBottom = useRef(true),
    read = useRef(new Map<string, string>()),
    sendLock = useRef(false),
    sequence = useRef(0),
    loadedTarget = useRef("");
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  targetRef.current = target;
  contentRef.current = content;
  const channel = target.startsWith("channel:") ? target.slice(8) : "general",
    recipient = target.startsWith("dm:") ? target.slice(3) : null;
  const member = members.find((m) => m.id === recipient),
    name = recipient
      ? member?.display_name || "Membru indisponibil"
      : channels[channel as keyof typeof channels] || "Conversație";
  const canSend =
    (!capabilities.includes(STAFF_MANAGED) ||
      capabilities.includes("chat.write")) &&
    (!recipient || !!member);
  const loadDirectory = useCallback(async () => {
    try {
      setMembers((await workspaceApi.list<Member>("staff")).data);
      setDirectoryError("");
    } catch (e) {
      setDirectoryError((e as Error).message);
    }
  }, []);
  const loadThreads = useCallback(async () => {
    try {
      setThreads((await workspaceApi.list<Thread>("chat/conversations")).data);
    } catch {
      /* The selected conversation reports its own network state; keep the last previews. */
    }
  }, []);
  useEffect(() => {
    void loadDirectory();
    void loadThreads();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadThreads();
    }, 30000);
    return () => clearInterval(timer);
  }, [loadDirectory, loadThreads]);
  const markRead = useCallback(
    async (last: Message) => {
      if (
        loadedTarget.current !== targetRef.current ||
        document.visibilityState !== "visible" ||
        !keepBottom.current ||
        read.current.get(targetRef.current) === last.id
      )
        return;
      if (matchMedia("(max-width: 700px)").matches && !mobileOpen) return;
      const key = targetRef.current;
      read.current.set(key, last.id);
      try {
        await workspaceApi.write("chat/read", {
          target: key,
          messageId: last.id,
        });
        setThreads((old) =>
          old.map((t) => (t.target === key ? { ...t, unread: 0 } : t)),
        );
      } catch {
        read.current.delete(key);
      }
    },
    [mobileOpen],
  );
  useEffect(() => {
    const dm = params.get("dm");
    if (dm && targetRef.current !== `dm:${dm}`) {
      drafts.current.set(targetRef.current, contentRef.current);
      const next = `dm:${dm}`;
      setMessages([]);
      setLoading(true);
      loadedTarget.current = "";
      setTarget(next);
      setContent(drafts.current.get(next) || "");
      setMobileOpen(true);
    }
  }, [params]);
  useEffect(() => {
    let active = true;
    const current = ++sequence.current;
    loadedTarget.current = "";
    setMessages([]);
    setLoading(true);
    setError("");
    keepBottom.current = true;
    setNewMessages(false);
    const load = async () => {
      try {
        const q = new URLSearchParams({ channel, limit: "50" });
        if (recipient) q.set("recipient_id", recipient);
        const result = await workspaceApi.list<Message>(`chat?${q}`);
        if (!active || sequence.current !== current) return;
        loadedTarget.current = targetRef.current;
        setMessages((old) => {
          const merged = new Map(old.map((m) => [m.id, m]));
          for (const m of result.data) merged.set(m.id, m);
          return [...merged.values()].sort(
            (a, b) =>
              a.created_at.localeCompare(b.created_at) ||
              a.id.localeCompare(b.id),
          );
        });
        setOlder((old) =>
          messagesRef.current.length > 50 ? old : result.data.length === 50,
        );
        setLoading(false);
        setError("");
        if (
          result.data.length &&
          !keepBottom.current &&
          lastItem(result.data)?.id !== lastItem(messagesRef.current)?.id
        )
          setNewMessages(true);
      } catch (e) {
        if (active && sequence.current === current) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    };
    void load();
    const visible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(visible, 15000);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [channel, recipient, tick]);
  useEffect(() => {
    if (keepBottom.current) {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    }
    const last = lastItem(messages);
    if (last) void markRead(last);
  }, [messages, markRead]);
  const choose = (next: string) => {
    if (next !== target) {
      drafts.current.set(target, content);
      setMessages([]);
      setLoading(true);
      loadedTarget.current = "";
      setTarget(next);
      setContent(drafts.current.get(next) || "");
      setMessageSearch("");
      setSearchOpen(false);
      setEmojiOpen(false);
    }
    setMobileOpen(true);
    const p = new URLSearchParams(params);
    if (next.startsWith("dm:")) p.set("dm", next.slice(3));
    else p.delete("dm");
    setParams(p, { replace: true });
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim(),
      destination = target;
    if (!text || sendLock.current || !canSend) return;
    sendLock.current = true;
    setSendingTarget(destination);
    const previous = attempts.current.get(destination),
      attempt =
        previous?.content === text
          ? previous
          : { content: text, key: crypto.randomUUID() };
    attempts.current.set(destination, attempt);
    try {
      await workspaceApi.write(
        "chat",
        {
          content: text,
          channel: destination.startsWith("channel:")
            ? destination.slice(8)
            : "general",
          recipient_id: destination.startsWith("dm:")
            ? destination.slice(3)
            : null,
        },
        "POST",
        attempt.key,
      );
      if (drafts.current.get(destination)?.trim() === text)
        drafts.current.delete(destination);
      if (
        targetRef.current === destination &&
        contentRef.current.trim() === text
      ) {
        setContent("");
        drafts.current.delete(destination);
      }
      if (targetRef.current === destination) {
        keepBottom.current = true;
        setTick((v) => v + 1);
      }
      void loadThreads();
      attempts.current.delete(destination);
    } catch (e) {
      toast.error(
        (e as Error).message ||
          "Mesajul nu a putut fi trimis. Ciorna a fost păstrată.",
      );
    } finally {
      sendLock.current = false;
      setSendingTarget(null);
      if (targetRef.current === destination) inputRef.current?.focus();
    }
  };
  const loadOlder = async () => {
    const first = messages[0],
      selected = target;
    if (!first || loadingOlder) return;
    setLoadingOlder(true);
    const height = listRef.current?.scrollHeight || 0;
    try {
      const q = new URLSearchParams({
        channel,
        limit: "50",
        before: `${Date.parse(first.created_at)}:${first.id}`,
      });
      if (recipient) q.set("recipient_id", recipient);
      const result = await workspaceApi.list<Message>(`chat?${q}`);
      if (targetRef.current !== selected) return;
      keepBottom.current = false;
      setOlder(result.data.length === 50);
      setMessages((old) =>
        [...result.data, ...old].filter(
          (m, i, a) => a.findIndex((n) => n.id === m.id) === i,
        ),
      );
      requestAnimationFrame(() => {
        if (listRef.current)
          listRef.current.scrollTop = listRef.current.scrollHeight - height;
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  };
  const visible = messages.filter(
    (m) => !messageSearch || fold(m.content).includes(fold(messageSearch)),
  );
  const previews = new Map(threads.map((t) => [t.target, t]));
  const entries = [
    ...Object.entries(channels).map(([id, label]) => ({
      target: `channel:${id}`,
      label,
      rank: "Canal de echipă",
      channel: true,
    })),
    ...members
      .filter((m) => m.id !== user?.id)
      .map((m) => ({
        target: `dm:${m.id}`,
        label: m.display_name,
        rank: staffRankLabel(m.rank_id),
        channel: false,
      })),
    ...threads
      .filter(
        (t) =>
          t.target.startsWith("dm:") &&
          !members.some((m) => `dm:${m.id}` === t.target),
      )
      .map((t) => ({
        target: t.target,
        label: "Membru indisponibil",
        rank: "Istoric autorizat",
        channel: false,
      })),
  ]
    .filter(
      (e) =>
        !query ||
        fold(
          `${e.label} ${e.rank} ${previews.get(e.target)?.last_content || ""}`,
        ).includes(fold(query)),
    )
    .sort(
      (a, b) =>
        (Date.parse(previews.get(b.target)?.last_at || "") || 0) -
        (Date.parse(previews.get(a.target)?.last_at || "") || 0),
    );
  return (
    <section className="agency-chat" aria-label="Chat intern AVYRON">
      <header className="chat-page-heading">
        <div>
          <p>AVYRON OS · ECHIPĂ</p>
          <h1>Chat intern</h1>
        </div>
        <span>
          <MessageCircle size={15} /> Conversațiile agenției
        </span>
      </header>
      <div className={`chat-shell ${mobileOpen ? "chat-show-thread" : ""}`}>
        <aside className="chat-sidebar" aria-label="Lista conversațiilor">
          <div className="chat-sidebar-title">
            <h2>Conversații</h2>
            <button
              className="chat-icon"
              aria-label="Actualizează conversațiile"
              onClick={() => {
                void loadDirectory();
                void loadThreads();
                setTick((v) => v + 1);
              }}
            >
              <RefreshCw size={17} />
            </button>
          </div>
          <label className="chat-search">
            <Search size={17} />
            <input
              aria-label="Caută conversație sau coleg"
              placeholder="Caută un coleg sau o conversație"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Șterge căutarea" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>
          {directoryError && (
            <p className="chat-error" role="alert">
              {directoryError}
              <button onClick={() => void loadDirectory()}>Reîncearcă</button>
            </p>
          )}
          <nav className="chat-conversations" aria-label="Canale și colegi">
            {entries.map((entry) => {
              const t = previews.get(entry.target);
              return (
                <button
                  key={entry.target}
                  className="chat-thread-button"
                  aria-current={target === entry.target ? "page" : undefined}
                  onClick={() => choose(entry.target)}
                  aria-label={`${entry.label}${t?.unread ? ` · ${t.unread} necitite` : ""}`}
                >
                  <span
                    className={`chat-avatar ${entry.channel ? "chat-channel-avatar" : ""}`}
                  >
                    {entry.channel ? (
                      <Hash size={21} />
                    ) : (
                      entry.label.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="chat-thread-copy">
                    <strong>{entry.label}</strong>
                    <small>{t?.last_content || entry.rank}</small>
                  </span>
                  <span className="chat-thread-meta">
                    {t && <time>{clock(t.last_at)}</time>}
                    {!!t?.unread && <b>{t.unread > 99 ? "99+" : t.unread}</b>}
                  </span>
                </button>
              );
            })}
            {!entries.length && (
              <p className="chat-empty-list">
                Nu există conversații pentru această căutare.
              </p>
            )}
          </nav>
          <p className="chat-sidebar-foot">
            <Users size={14} />
            {members.length} membri · acces intern
          </p>
        </aside>
        <section
          className="chat-conversation"
          aria-label={`Conversație · ${name}`}
        >
          <header className="chat-conversation-head">
            <button
              className="chat-icon chat-mobile-back"
              aria-label="Înapoi la conversații"
              onClick={() => setMobileOpen(false)}
            >
              <ArrowLeft size={20} />
            </button>
            <span className="chat-avatar">
              {recipient ? name.slice(0, 2).toUpperCase() : <Hash size={21} />}
            </span>
            <div className="chat-active-title">
              <h2>{name}</h2>
              <p>
                {recipient
                  ? staffRankLabel(member?.rank_id)
                  : "Canal intern al echipei"}
              </p>
            </div>
            <button
              className="chat-icon"
              aria-label="Caută în mesajele încărcate"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search size={19} />
            </button>
            <button
              className="chat-icon"
              aria-label="Actualizează mesajele"
              onClick={() => setTick((v) => v + 1)}
            >
              <RefreshCw size={17} />
            </button>
          </header>
          {searchOpen && (
            <label className="chat-message-search">
              <Search size={16} />
              <input
                autoFocus
                aria-label="Caută în mesajele încărcate"
                placeholder="Caută în mesajele încărcate…"
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
              />
              <button
                className="chat-icon"
                aria-label="Închide căutarea mesajelor"
                onClick={() => {
                  setSearchOpen(false);
                  setMessageSearch("");
                }}
              >
                <X size={17} />
              </button>
            </label>
          )}
          {error && (
            <div className="chat-error" role="alert">
              {error}
              <button onClick={() => setTick((v) => v + 1)}>Reîncearcă</button>
            </div>
          )}
          <div
            className="chat-messages"
            ref={listRef}
            role="log"
            aria-label={recipient ? "Mesaje directe" : "Mesaje de canal"}
            aria-live="polite"
            aria-busy={loading}
            onScroll={(e) => {
              const l = e.currentTarget;
              keepBottom.current =
                l.scrollHeight - l.scrollTop - l.clientHeight < 60;
              if (keepBottom.current) {
                setNewMessages(false);
                const last = lastItem(messages);
                if (last) void markRead(last);
              }
            }}
          >
            {older && !messageSearch && (
              <button
                className="chat-older"
                disabled={loadingOlder}
                onClick={() => void loadOlder()}
              >
                {loadingOlder ? "Se încarcă…" : "Mesaje mai vechi"}
              </button>
            )}
            {loading && (
              <p className="chat-system" role="status">
                Se încarcă mesajele…
              </p>
            )}
            {!loading && !visible.length && !error && (
              <div className="chat-welcome">
                <MessageCircle size={32} />
                <h3>
                  {messageSearch
                    ? "Niciun mesaj pentru căutare"
                    : "Începe conversația"}
                </h3>
                <p>
                  {messageSearch
                    ? "Căutarea se aplică mesajelor încărcate."
                    : "Un mesaj clar, o echipă conectată."}
                </p>
              </div>
            )}
            {visible.map((m, i) => {
              const own = m.author_id === user?.id;
              return (
                <div key={m.id}>
                  {(!i ||
                    day(visible[i - 1].created_at) !== day(m.created_at)) && (
                    <div className="chat-day">
                      <span>{day(m.created_at)}</span>
                    </div>
                  )}
                  <article
                    className={`chat-bubble ${own ? "chat-own" : "chat-other"}`}
                    aria-label={own ? "Mesaj trimis" : "Mesaj primit"}
                  >
                    {!own && !recipient && (
                      <p className="chat-author">
                        {members.find((u) => u.id === m.author_id)
                          ?.display_name || "Membru al agenției"}
                      </p>
                    )}
                    <p className="chat-message-text">{m.content}</p>
                    <footer>
                      <time
                        dateTime={m.created_at}
                        title={new Date(m.created_at).toLocaleString("ro-RO")}
                      >
                        {clock(m.created_at)}
                      </time>
                      {own && (
                        <span title="Salvat pe server" aria-label="Trimis">
                          <Check size={14} />
                        </span>
                      )}
                    </footer>
                  </article>
                </div>
              );
            })}
          </div>
          {newMessages && (
            <button
              className="chat-new"
              onClick={() => {
                keepBottom.current = true;
                setNewMessages(false);
                if (listRef.current)
                  listRef.current.scrollTop = listRef.current.scrollHeight;
                const last = lastItem(messages);
                if (last) void markRead(last);
              }}
            >
              <ArrowDown size={15} /> Mesaje noi
            </button>
          )}
          <form className="chat-composer" onSubmit={send}>
            {emojiOpen && (
              <div
                className="chat-emojis"
                role="group"
                aria-label="Reacții de inserat"
              >
                {["👍", "✅", "😊", "👏", "🎯", "💜"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setContent((c) => c + emoji);
                      setEmojiOpen(false);
                      inputRef.current?.focus();
                    }}
                    aria-label={`Inserează ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <div className="chat-compose-row">
              <button
                type="button"
                className="chat-icon"
                aria-label="Adaugă emoji"
                aria-expanded={emojiOpen}
                disabled={!canSend}
                onClick={() => setEmojiOpen((v) => !v)}
              >
                <Smile size={21} />
              </button>
              <textarea
                ref={inputRef}
                aria-label="Mesaj"
                value={content}
                rows={1}
                onChange={(e) => setContent(e.target.value)}
                disabled={!canSend}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                maxLength={4000}
                placeholder={
                  canSend
                    ? "Scrie un mesaj…"
                    : "Această conversație poate fi doar consultată"
                }
              />
              <button
                className="chat-send"
                aria-label="Trimite"
                disabled={!!sendingTarget || !content.trim() || !canSend}
              >
                <Send size={19} />
              </button>
            </div>
            <div className="chat-compose-foot">
              <span>
                {sendingTarget === target
                  ? "Se trimite…"
                  : "Enter trimite · Shift+Enter adaugă un rând"}
              </span>
              <span>{content.length}/4000</span>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
