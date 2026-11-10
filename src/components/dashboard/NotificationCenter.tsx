import IconHint from "@/components/ui/icon-hint";
import {
  ACTIVITY_CHANGED,
  NOTIFICATIONS_OPEN_EVENT,
  refreshDashboardActivity,
} from "@/lib/dashboardActivity";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useId,
  useRef,
} from "react";
import {
  Bell,
  Check,
  Megaphone,
  RefreshCw,
  X,
  FolderKanban,
  CalendarClock,
  BookOpen,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";
import { useNavigate } from "react-router-dom";
import { canOpenSection, type Access, type SectionId } from "@/lib/access";
import {
  notificationHref,
  type NotificationItem,
} from "@/shared/notifications";

type Announcement = {
  read_at?: number | null;
  author_id?: string;
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string | number;
};
type FeedItem = NotificationItem & { kind: "operation" | "announcement" };
const banners = {
  project: {
    icon: FolderKanban,
    label: "Proiect",
    en: "Project",
    tone: "from-cyan-500/20 via-sky-500/10 to-transparent text-cyan-200",
  },
  subscription: {
    icon: CalendarClock,
    label: "Abonament",
    en: "Subscription",
    tone: "from-amber-500/20 via-orange-500/10 to-transparent text-amber-200",
  },
  blog: {
    icon: BookOpen,
    label: "Blog AVYRON",
    en: "AVYRON Blog",
    tone: "from-violet-500/20 via-fuchsia-500/10 to-transparent text-violet-200",
  },
  document: {
    icon: FileText,
    label: "Document",
    en: "Document",
    tone: "from-emerald-500/20 via-teal-500/10 to-transparent text-emerald-200",
  },
  activity: {
    icon: Bell,
    label: "Activitate",
    en: "Activity",
    tone: "from-slate-500/20 to-transparent text-slate-200",
  },
};
export default function NotificationCenter({
  access,
  onNavigate,
  autoOpen = false,
  requestedOpen = false,
  onClose,
  embedded = false,
}: {
  access: Access;
  onNavigate: (section: SectionId) => void;
  autoOpen?: boolean;
  requestedOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const titleId = useId(),
    descriptionId = useId();
  const { user, refreshProfile } = useAuth(),
    { lang } = useLang(),
    navigate = useNavigate();
  const en = lang === "en";
  const pending = useRef<AbortController | null>(null);
  const [operations, setOperations] = useState<NotificationItem[]>([]),
    [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState("all"),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false);
  const [blogEnabled, setBlogEnabled] = useState(true),
    [saving, setSaving] = useState(false),
    [reading, setReading] = useState<string | null>(null);
  useEffect(() => {
    if (requestedOpen) setOpen(true);
  }, [requestedOpen]);
  useEffect(() => {
    if (embedded) return;
    const reveal = () => setOpen(true);
    window.addEventListener(NOTIFICATIONS_OPEN_EVENT, reveal);
    return () => window.removeEventListener(NOTIFICATIONS_OPEN_EVENT, reveal);
  }, [embedded]);
  const load = useCallback(async () => {
    if (!user?.id) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    const results = await Promise.allSettled([
      cfAuth.request<{ data: NotificationItem[]; blogEnabled: boolean }>(
        `/api/notifications?lang=${lang}`,
        { signal: controller.signal },
      ),
      canOpenSection("announcements", access)
        ? cfAuth.request<{ data: Announcement[] }>(
            "/api/workspace/announcements?limit=50",
            { signal: controller.signal },
          )
        : Promise.resolve({ data: [] as Announcement[] }),
    ]);
    if (controller.signal.aborted) return;
    const operationData =
      results[0].status === "fulfilled" &&
      Array.isArray(results[0].value.data) &&
      results[0].value.data.every(
        (row) =>
          row &&
          typeof row.id === "string" &&
          typeof row.title === "string" &&
          typeof row.body === "string" &&
          typeof row.created_at === "number" &&
          Number.isFinite(new Date(row.created_at).getTime()) &&
          (typeof row.destination === "string" || row.destination === null) &&
          (row.category === undefined || typeof row.category === "string"),
      )
        ? results[0].value.data
        : null;
    const announcementData =
      results[1].status === "fulfilled" &&
      Array.isArray(results[1].value.data) &&
      results[1].value.data.every(
        (row) =>
          row &&
          typeof row.id === "string" &&
          typeof row.title === "string" &&
          typeof row.content === "string" &&
          (typeof row.created_at === "string" ||
            typeof row.created_at === "number") &&
          Number.isFinite(new Date(row.created_at).getTime()),
      )
        ? results[1].value.data
        : null;
    setOperations(
      operationData?.map((row) => ({
        ...row,
        destination: row.destination || "",
      })) ?? [],
    );
    if (results[0].status === "fulfilled")
      setBlogEnabled(results[0].value.blogEnabled !== false);
    setAnnouncements(announcementData ?? []);
    setError(operationData === null || announcementData === null);
    setLoading(false);
  }, [access, user?.id, lang]);
  useEffect(() => {
    setOperations([]);
    setAnnouncements([]);
    void load();
    const changed = () => {
      if (!document.hidden) void load();
    };
    window.addEventListener(ACTIVITY_CHANGED, changed);
    document.addEventListener("visibilitychange", changed);
    const interval = window.setInterval(changed, 60_000);
    return () => {
      window.removeEventListener(ACTIVITY_CHANGED, changed);
      document.removeEventListener("visibilitychange", changed);
      window.clearInterval(interval);
      pending.current?.abort();
    };
  }, [load]);
  const items = useMemo<FeedItem[]>(
    () =>
      [
        ...operations
          .filter((row) => blogEnabled || row.category !== "blog")
          .map((row) => ({ ...row, kind: "operation" as const })),
        ...announcements.map(
          (row): FeedItem => ({
            id: row.id,
            title: row.title,
            body: row.content,
            created_at:
              typeof row.created_at === "string"
                ? Date.parse(row.created_at)
                : row.created_at,
            read_at: row.read_at || (row.author_id === user?.id ? 1 : null),
            category: "activity",
            priority: row.priority === "urgent" ? "important" : "normal",
            kind: "announcement",
            destination: "announcements",
          }),
        ),
      ].sort((a, b) => b.created_at - a.created_at || b.id.localeCompare(a.id)),
    [operations, announcements, user?.id, blogEnabled],
  );
  const unread = items.filter((item) => !item.read_at).length;
  const visible = items.filter(
    (item) =>
      filter === "all" ||
      (filter === "unread"
        ? !item.read_at
        : filter === "important"
          ? item.priority === "important"
          : item.kind === "announcement"),
  );
  const markRead = async (item: FeedItem) => {
    setReading(item.id);
    try {
      await cfAuth.request(
        item.kind === "announcement"
          ? `/api/workspace/announcements/${encodeURIComponent(item.id)}/read`
          : `/api/notifications/${encodeURIComponent(item.id)}/read`,
        { method: "POST", body: "{}" },
      );
      setOperations((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, read_at: Date.now() } : row,
        ),
      );
      setAnnouncements((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, read_at: Date.now() } : row,
        ),
      );
      refreshDashboardActivity();
    } catch {
      setError(true);
    } finally {
      setReading(null);
    }
  };
  const visit = async (destination: string) => {
    if (destination === "operations") destination = "os-centers";
    const href = notificationHref(destination);
    if (!href) return;
    if(/^\/profil\?tab=future-leads(?:&|$)/.test(href)){
      try{await refreshProfile();}catch{setError(true);return;}
    }
    setOpen(false);
    onClose?.();
    if (canOpenSection(destination, access))
      onNavigate(destination as SectionId);
    else navigate(href);
  };
  const preference = async () => {
    const previous = blogEnabled;
    const next = !previous;
    setBlogEnabled(next);
    setSaving(true);
    try {
      await cfAuth.request("/api/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify({ blogEnabled: next }),
      });
      await load();
      refreshDashboardActivity();
    } catch {
      setBlogEnabled(previous);
      setError(true);
    } finally {
      setSaving(false);
    }
  };
  const content = (
    <>
      <header className="shrink-0 border-b border-white/10 px-4 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2
              id={titleId}
              className="font-display text-base font-semibold text-white"
            >
              {en ? "Your notifications" : "Notificările tale"}
            </h2>
            <p id={descriptionId} className="mt-1 text-xs text-slate-400">
              {en
                ? "Newest first · important updates highlighted"
                : "Cele mai noi întâi · actualizări importante evidențiate"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              aria-label={
                en ? "Refresh notifications" : "Reîmprospătează notificările"
              }
              className="grid size-10 place-items-center rounded-lg hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <RefreshCw
                className={`size-4 ${loading ? "motion-safe:animate-spin" : ""}`}
              />
            </button>
            {!embedded && (
              <button
                type="button"
                aria-label={en ? "Close notifications" : "Închide notificările"}
                onClick={() => {
                  setOpen(false);
                  onClose?.();
                }}
                className="grid size-10 place-items-center rounded-lg hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>
      <div
        className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/10 p-3"
        role="group"
        aria-label={en ? "Notification filters" : "Filtrează notificările"}
      >
        {[
          ["all", en ? "All" : "Toate"],
          ["unread", en ? "Unread" : "Necitite"],
          ["important", en ? "Important" : "Importante"],
          ...(access.isStaff
            ? [["announcements", en ? "Announcements" : "Anunțuri"]]
            : []),
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold ${filter === key ? "border-violet-400/40 bg-violet-500/20 text-white" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
          >
            {label}
            {key === "unread" ? ` · ${unread}` : ""}
          </button>
        ))}
      </div>
      <div
        className={`min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 ${embedded ? "max-h-[70dvh]" : ""}`}
      >
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100"
          >
            {en
              ? "Some notifications are unavailable. Refresh or check your session in Settings."
              : "Unele notificări nu sunt disponibile. Reîncearcă sau verifică sesiunea în Setări."}
          </p>
        )}
        {loading && !items.length && (
          <p role="status" className="p-6 text-center text-sm text-slate-400">
            {en ? "Loading…" : "Se încarcă…"}
          </p>
        )}
        {!loading && !error && !visible.length && (
          <div className="p-6 text-center">
            <Bell className="mx-auto mb-3 size-6 text-violet-300" />
            <p className="text-sm text-slate-300">
              {en ? "You’re up to date." : "Ești la zi."}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {en
                ? "New updates will appear here."
                : "Actualizările noi vor apărea aici."}
            </p>
          </div>
        )}
        {visible.map((item) => {
          const banner = banners[item.category] || banners.activity,
            Icon = item.kind === "announcement" ? Megaphone : banner.icon;
          return (
            <article
              key={`${item.kind}-${item.id}`}
              className={`overflow-hidden rounded-xl border ${item.priority === "important" ? "border-cyan-400/30" : item.read_at ? "border-white/10" : "border-violet-400/30"} bg-white/[0.025]`}
            >
              <div
                className={`flex items-center gap-2 bg-gradient-to-r px-4 py-2 text-[10px] font-semibold uppercase tracking-widest ${banner.tone}`}
              >
                <Icon className="size-4" />
                <span>
                  {item.kind === "announcement"
                    ? en
                      ? "Team"
                      : "Echipă"
                    : en
                      ? banner.en
                      : banner.label}
                </span>
                {item.priority === "important" && (
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[9px]">
                    {en ? "Important" : "Important"}
                  </span>
                )}
                {!item.read_at && (
                  <span
                    aria-label={en ? "Unread" : "Necitită"}
                    className="size-2 rounded-full bg-violet-300"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="break-words text-sm font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-300">
                  {item.body}
                </p>
                <time
                  dateTime={new Date(item.created_at).toISOString()}
                  className="mt-2 block text-[11px] text-slate-400"
                >
                  {new Date(item.created_at).toLocaleString(
                    en ? "en-GB" : "ro-RO",
                  )}
                </time>
                <div className="mt-3 flex flex-wrap gap-2">
                  {notificationHref(item.destination) && (
                    <button
                      type="button"
                      onClick={() => visit(item.destination)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-violet-500/20 px-3 text-xs text-violet-100 hover:bg-violet-500/30"
                    >
                      {en ? "View details" : "Vezi detalii"}
                      <ArrowUpRight className="size-3" />
                    </button>
                  )}
                  {!item.read_at && (
                    <button
                      type="button"
                      disabled={reading === item.id}
                      onClick={() => void markRead(item)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:bg-white/5 disabled:opacity-50"
                    >
                      <Check className="size-3.5" />
                      {en ? "Mark as read" : "Marchează citită"}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <footer className="shrink-0 border-t border-white/10 p-3 text-[11px] text-slate-400">
        {embedded ? (
          <label className="flex min-h-10 items-center gap-2">
            <input
              type="checkbox"
              checked={blogEnabled}
              disabled={saving}
              onChange={() => void preference()}
              className="size-4 accent-violet-500"
            />
            {en ? "Include blog news" : "Include noutățile din blog"}
          </label>
        ) : (
          <button
            type="button"
            onClick={() => visit("notifications")}
            className="min-h-10 w-full rounded-lg text-violet-200 hover:bg-white/5"
          >
            {en
              ? "All notifications and preferences"
              : "Toate notificările și preferințele"}
          </button>
        )}
      </footer>
    </>
  );
  if (embedded)
    return (
      <section
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] text-slate-100"
      >
        {content}
      </section>
    );
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onClose?.();
        else void load();
      }}
      modal={false}
    >
      <IconHint
        label={
          en
            ? "Notifications, announcements and updates to review"
            : "Notificări, anunțuri și activități de verificat"
        }
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${en ? "Notifications" : "Notificări"}${unread ? `, ${unread} ${en ? "unread" : "necitite"}` : ""}`}
            title={en ? "Notifications" : "Notificări"}
            className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 text-current transition hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <Bell className="size-[18px]" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-fuchsia-700 px-1 text-[10px] font-bold text-white"
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        </PopoverTrigger>
      </IconHint>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        collisionPadding={8}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="dark z-[80] flex w-[min(27rem,calc(100vw-1rem))] max-h-[min(680px,var(--radix-popover-content-available-height),calc(100dvh-5rem))] flex-col gap-0 overflow-hidden rounded-2xl border-white/10 bg-[#0b1120] p-0 text-slate-100 shadow-2xl"
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
