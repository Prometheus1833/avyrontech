import { refreshDashboardActivity } from "@/lib/dashboardActivity";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  FolderKanban,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Link from "@/components/site/WorkspaceLink";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import { ChatCopyButton, ChatListFilters, type ChatListFilter } from "./ChatTools";
import "./staffChat.css";
type Room = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  last_content: string | null;
  last_at: number | null;
  unread: number;
};
type Message = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: number;
};
const root = "/api/project-chat";
const fold = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const time = (n: number) =>
  new Date(n).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function ProjectConversations({
  compact = false, inbox = false,
}: {
  compact?: boolean;
  inbox?: boolean;
}) {
  const { user } = useAuth(),
    [params, setParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]),
    [selected, setSelected] = useState<string | null>(
      compact ? null : params.get("chatProject"),
    ),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [canWrite, setCanWrite] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<ChatListFilter>("all");
  const drafts = useRef(new Map<string, string>()),
    attempts = useRef(new Map<string, { text: string; key: string }>()),
    searchRef = useRef<HTMLInputElement>(null),
    workspaceRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState(""),
    focus = compact ? selected || "" : params.get("chatProject") || "";
  useEffect(() => {
    const t = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (!compact && focus) setSelected(focus);
  }, [focus, compact]);
  useEffect(() => {
    let active = true,
      pending = false;
    const controller = new AbortController();
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const r = await cfAuth.request<{ data: Room[]; canWrite: boolean }>(
          root + "/projects?" + new URLSearchParams({ q: search, focus }),
          { signal: controller.signal },
        );
        if (!active) return;
        setRooms(r.data);
        setCanWrite(r.canWrite);
        setError("");
        setSelected((old) => (r.data.some((p) => p.id === old) ? old : null));
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setRooms([]);
          setSelected(null);
        }
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh, user?.id, search, focus]);
  const room = rooms.find((r) => r.id === selected);
  const visibleRooms = rooms.filter(r =>
    (filter === "all" || (filter === "recent" ? r.last_at !== null : r.unread > 0))
    && fold(r.name).includes(fold(query)),
  );
  const choose = (id: string | null) => {
    setSelected(id);
    if (inbox || matchMedia("(max-width: 700px)").matches) {
      requestAnimationFrame(() => {
        const node = id ? workspaceRef.current?.querySelector<HTMLElement>(".chat-conversation") : searchRef.current;
        node?.focus({ preventScroll: true });
      });
    }
    if (!compact)
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          if (id) n.set("chatProject", id);
          else n.delete("chatProject");
          return n;
        },
        { replace: true },
      );
  };
  return (
    <section
      ref={workspaceRef}
      className={"agency-chat " + (compact ? "agency-chat--compact" : "")}
      aria-label="Conversații de proiect"
    >
      {!compact && (
        <header className="chat-page-heading">
          <div>
            <p>AVYRON · COLABORARE</p>
            <h1>Mesaje proiecte</h1>
          </div>
        </header>
      )}
      <div className={"chat-shell " + (room ? "chat-show-thread" : "")}>
        <aside
          className="chat-sidebar"
          aria-label="Conversații cu echipa și clienții"
        >
          <div className="chat-sidebar-title">
            <h2>Proiecte</h2>
            <button
              className="chat-icon"
              aria-label="Actualizează conversațiile de proiect"
              onClick={() => setRefresh((v) => v + 1)}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <label className="chat-search">
            <Search size={17} />
            <input
              ref={searchRef}
              aria-label="Caută proiect sau conversație"
              placeholder="Caută proiectul"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ChatListFilters value={filter} onChange={setFilter} />
          <nav className="chat-conversations" aria-label="Proiecte autorizate">
            {visibleRooms.map((r) => (
                <button
                  className="chat-thread-button"
                  key={r.id}
                  aria-current={selected === r.id ? "page" : undefined}
                  onClick={() => choose(r.id)}
                >
                  <span className="chat-avatar">
                    <FolderKanban size={20} />
                  </span>
                  <span className="chat-thread-copy">
                    <strong>{r.name}</strong>
                    <small>
                      {r.last_content ||
                        "Echipă și client · conversație de proiect"}
                    </small>
                  </span>
                  <span className="chat-thread-meta">
                    {r.last_at && <time>{time(r.last_at)}</time>}
                    {!!r.unread && <b>{r.unread > 99 ? "99+" : r.unread}</b>}
                  </span>
                </button>
              ))}
            {loading && <p className="chat-system">Se încarcă proiectele…</p>}
            {!loading && !visibleRooms.length && !error && (
              <p className="chat-empty-list">
                {query ? "Niciun proiect pentru această căutare." : filter === "unread" ? "Nu ai conversații de proiect necitite." : filter === "recent" ? "Niciun proiect cu mesaje recente." : "Nu ai conversații de proiect disponibile."}
              </p>
            )}
            {error && (
              <p className="chat-error" role="alert">
                {error}
                <button onClick={() => setRefresh((v) => v + 1)}>
                  Reîncearcă
                </button>
              </p>
            )}
          </nav>
          <p className="chat-sidebar-foot">
            <Users size={14} />
            Participanții autorizați ai fiecărui proiect
          </p>
        </aside>
        {room ? (
          <ProjectRoom
            key={room.id}
            room={room}
            canWrite={canWrite}
            inbox={inbox}
            drafts={drafts.current}
            attempts={attempts.current}
            onBack={() => choose(null)}
            onRead={() =>
              setRooms((old) =>
                old.map((r) => (r.id === room.id ? { ...r, unread: 0 } : r)),
              )
            }
          />
        ) : (
          <section className="chat-conversation">
            <div className="chat-welcome">
              <FolderKanban />
              <h2>Alege un proiect</h2>
              <p>
                Discuțiile cu echipa și clientul rămân în contextul proiectului.
              </p>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
function ProjectRoom({
  room,
  canWrite,
  inbox,
  drafts,
  attempts,
  onBack,
  onRead,
}: {
  room: Room;
  canWrite: boolean;
  inbox: boolean;
  drafts: Map<string, string>;
  attempts: Map<string, { text: string; key: string }>;
  onBack: () => void;
  onRead: () => void;
}) {
  const { user } = useAuth(),
    [messages, setMessages] = useState<Message[]>([]),
    [content, setContent] = useState(drafts.get(room.id) || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [older, setOlder] = useState(false),
    [refresh, setRefresh] = useState(0),
    [messageSearch, setMessageSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false);
  const lock = useRef(false),
    alive = useRef(true),
    scroller = useRef<HTMLDivElement>(null),
    read = useRef(""),
    onReadRef = useRef(onRead),
    bottom = useRef(true),
    current = useRef(content);
  onReadRef.current = onRead;
  current.current = content;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true,
      pending = false;
    const controller = new AbortController();
    const load = async () => {
      if (pending) return;
      pending = true;
      try {
        const r = await cfAuth.request<{ data: Message[] }>(
          `${root}/${room.id}/messages`,
          { signal: controller.signal },
        );
        if (!active) return;
        setMessages((old) =>
          Array.from(
            new Map([...old, ...r.data].map((m) => [m.id, m])).values(),
          )
            .sort(
              (a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id),
            )
            .slice(-500),
        );
        setOlder((v) => v || r.data.length === 50);
        setReady(true);
        setError("");
        if (bottom.current)
          requestAnimationFrame(() => {
            if (active)
              scroller.current?.scrollTo({
                top: scroller.current.scrollHeight,
              });
          });
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setMessages([]);
          setReady(false);
        }
      } finally {
        pending = false;
      }
    };
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 10000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [room.id, refresh]);
  const markRead = useCallback(async () => {
    const last = messages[messages.length - 1];
    if (
      !last ||
      read.current === last.id ||
      document.visibilityState !== "visible" ||
      !bottom.current || searchOpen ||
      !scroller.current?.getClientRects().length
    )
      return;
    read.current = last.id;
    try {
      await cfAuth.request(`${root}/${room.id}/read`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ messageId: last.id }),
      });
      if (alive.current) onReadRef.current();
      refreshDashboardActivity();
    } catch {
      read.current = "";
    }
  }, [messages, room.id, searchOpen]);
  useEffect(() => {
    void markRead();
  }, [markRead]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !canWrite || !ready || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const old = attempts.get(room.id),
      attempt = old?.text === text ? old : { text, key: crypto.randomUUID() };
    attempts.set(room.id, attempt);
    try {
      await cfAuth.request(`${root}/${room.id}/messages`, {
        method: "POST",
        headers: { "Idempotency-Key": attempt.key },
        body: JSON.stringify({ content: text }),
      });
      if (drafts.get(room.id)?.trim() === text) drafts.delete(room.id);
      attempts.delete(room.id);
      if (alive.current) {
        if (current.current.trim() === text) setContent("");
        bottom.current = true;
        setRefresh((v) => v + 1);
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const loadOlder = async () => {
    if (!messages[0] || lock.current) return;
    lock.current = true;
    setBusy(true);
    const first = messages[0],
      node = scroller.current,
      height = node?.scrollHeight || 0;
    try {
      const r = await cfAuth.request<{ data: Message[] }>(
        `${root}/${room.id}/messages?before=${encodeURIComponent(JSON.stringify({ at: first.created_at, id: first.id }))}`,
      );
      if (alive.current) {
        setMessages((old) =>
          Array.from(
            new Map([...r.data, ...old].map((m) => [m.id, m])).values(),
          ).slice(0, 500),
        );
        setOlder(r.data.length === 50);
        requestAnimationFrame(() => {
          if (node) node.scrollTop = node.scrollHeight - height;
        });
      }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return (
    <section
      className="chat-conversation"
      tabIndex={-1}
      aria-label={"Conversație proiect · " + room.name}
    >
      <header className="chat-conversation-head">
        <button
          className="chat-icon chat-mobile-back"
          aria-label="Înapoi la proiecte"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <span className="chat-avatar">
          <FolderKanban size={18} />
        </span>
        <div className="chat-active-title">
          <h2>{room.name}</h2>
          <p>Conversație vizibilă echipei și clientului autorizați</p>
        </div>
        <button type="button" className="chat-icon" aria-label="Caută în mesajele proiectului" aria-expanded={searchOpen}
          onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setMessageSearch(""); }}>
          <Search size={18} aria-hidden="true" />
        </button>
        <Link
          className="chat-icon"
          aria-label="Deschide fișa proiectului"
          to={"/intern/projects/" + encodeURIComponent(room.slug)}
          onNavigate={inbox ? onBack : undefined}
        >
          <FolderKanban size={18} />
        </Link>
      </header>
      {searchOpen && <label className="chat-message-search">
        <Search size={16} aria-hidden="true" />
        <input autoFocus aria-label="Caută în mesajele încărcate" placeholder="Caută în mesajele încărcate…" value={messageSearch} onChange={e => setMessageSearch(e.target.value)} />
      </label>}
      {error && (
        <div role="alert" className="chat-error">
          {error}
          <button onClick={() => setRefresh((v) => v + 1)}>Reîncearcă</button>
        </div>
      )}
      <div
        ref={scroller}
        className="chat-messages"
        role="log"
        aria-label="Mesajele proiectului"
        aria-live="polite"
        onScroll={() => {
          const n = scroller.current;
          if (n) {
            bottom.current = n.scrollHeight - n.scrollTop - n.clientHeight < 60;
            if (bottom.current) void markRead();
          }
        }}
      >
        {older && !messageSearch && (
          <button
            className="chat-older"
            disabled={busy || messages.length >= 500}
            onClick={() => void loadOlder()}
          >
            Mesaje anterioare
          </button>
        )}
        {!ready && !error && (
          <p className="chat-system">Se încarcă mesajele…</p>
        )}
        {ready && !messages.length && (
          <p className="chat-system">
            Începe conversația despre acest proiect.
          </p>
        )}
        {ready && messageSearch && !messages.some(m => fold(m.content).includes(fold(messageSearch))) && <p className="chat-system">Niciun rezultat în mesajele încărcate.</p>}
        {messages.filter(m => !messageSearch || fold(m.content).includes(fold(messageSearch))).map((m) => (
          <article
            className={
              "chat-bubble " +
              (m.author_id === user?.id ? "chat-own" : "chat-other")
            }
            key={m.id}
          >
            <p className="chat-author">{m.author_name}</p>
            <p className="chat-message-text">{m.content}</p>
            <footer>
              <ChatCopyButton content={m.content} />
              <time>{time(m.created_at)}</time>
            </footer>
          </article>
        ))}
      </div>
      <form className="chat-composer" onSubmit={send}>
        <div className="chat-compose-row">
          <textarea
            aria-label="Mesaj pentru proiect"
            placeholder={
              canWrite
                ? "Scrie echipei și clientului…"
                : "Ai acces numai de citire"
            }
            value={content}
            maxLength={4000}
            disabled={!canWrite}
            onChange={(e) => {
              setContent(e.target.value);
              drafts.set(room.id, e.target.value);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                !matchMedia("(pointer:coarse)").matches
              ) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="chat-send"
            disabled={busy || !ready || !canWrite || !content.trim()}
            aria-label="Trimite mesaj în proiect"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="chat-compose-foot">
          <span>
            {busy
              ? "Se salvează…"
              : "Mesajele sunt partajate în acest proiect."}
          </span>
          <span>{content.length}/4000</span>
        </div>
      </form>
    </section>
  );
}
