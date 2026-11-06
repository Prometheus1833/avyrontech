import { ACTIVITY_CHANGED,refreshDashboardActivity } from "@/lib/dashboardActivity";
import { useCallback, useEffect, useMemo, useState, useId, useRef } from "react";
import { Bell, Check, Megaphone, RefreshCw, X } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { canOpenSection, type Access, type SectionId } from "@/lib/access";

type OperationNotice = { id: string; title: string; body: string; destination: string | null; read_at: number | null; created_at: number };
type Announcement = { read_at?: number | null; author_id?: string; id: string; title: string; content: string; priority: string; created_at: string | number };
type FeedItem = { id: string; title: string; body: string; createdAt: number; read: boolean; kind: "operation" | "announcement"; destination: SectionId | null };
type Filter = "all" | "unread" | "announcements";

export default function NotificationCenter({ access, onNavigate, autoOpen = false }: { access: Access; onNavigate: (section: SectionId) => void; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const titleId = useId(), descriptionId = useId();
  const { user } = useAuth();
  const pending = useRef<AbortController | null>(null);
  const [operations, setOperations] = useState<OperationNotice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true);
    const results = await Promise.allSettled([
      canOpenSection("announcements", access) ? cfAuth.request<{ data: Announcement[] }>("/api/workspace/announcements?limit=50", { signal: controller.signal }) : Promise.resolve({data: [] as Announcement[]}),
      access.isSuperAdmin ? cfAuth.request<{ data: OperationNotice[] }>("/api/operations/notifications", { signal: controller.signal }) : canOpenSection("documents", access) ? cfAuth.request<{ data: OperationNotice[] }>("/api/documents/notices", { signal: controller.signal }) : Promise.resolve({ data: [] as OperationNotice[] }),
    ]);
    if (controller.signal.aborted) return;
    if (results[0].status === "fulfilled") setAnnouncements(results[0].value.data);
    if (results[1].status === "fulfilled") setOperations(results[1].value.data);
    setError(results.some((result) => result.status === "rejected"));
    setLoading(false);
  }, [access, user?.id]);

  useEffect(() => {
    setOperations([]); setAnnouncements([]);
    void load();
    const changed=()=>void load();window.addEventListener(ACTIVITY_CHANGED,changed);
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    return () => { window.removeEventListener(ACTIVITY_CHANGED,changed);window.clearInterval(interval); pending.current?.abort(); };
  }, [access.isStaff, load]);

  const items = useMemo<FeedItem[]>(() => [
    ...operations.map((row): FeedItem => ({
      id: row.id, title: row.title, body: row.body, createdAt: row.created_at,
      read: Boolean(row.read_at), kind: "operation",
      destination: row.destination && canOpenSection(row.destination, access) ? row.destination as SectionId : null,
    })),
    ...announcements.map((row): FeedItem => ({
      id: row.id, title: row.title, body: row.content, createdAt: typeof row.created_at === "string" ? Date.parse(row.created_at) : row.created_at,
      read: Boolean(row.read_at) || row.author_id === user?.id, kind: "announcement", destination: "announcements",
    })),
  ].sort((a, b) => b.createdAt - a.createdAt), [operations, announcements, access, user?.id]);
  const unread = items.filter(item=>!item.read).length;
  const visible = items.filter((item) => filter === "all" || (filter === "unread" ? !item.read : item.kind === "announcement"));

  const markRead = async (id: string, kind: FeedItem["kind"]) => {
    try {
      await cfAuth.request(kind === "announcement" ? `/api/workspace/announcements/${encodeURIComponent(id)}/read` : access.isSuperAdmin ? `/api/operations/notifications/${id}/read` : `/api/documents/notices/${id}/read`, {
        method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: "{}",
      });
      if(kind === "announcement") setAnnouncements(current=>current.map(row=>row.id===id?{...row,read_at:Date.now()}:row));
      refreshDashboardActivity();
      setOperations((current) => current.map((row) => row.id === id ? { ...row, read_at: Date.now() } : row));
    } catch { setError(true); }
  };
  const navigate = (section: SectionId) => { setOpen(false); onNavigate(section); };

  return <Popover open={open} onOpenChange={setOpen} modal={false}>
    <PopoverTrigger asChild>
      <button type="button" aria-label={`Notificări${unread ? `, ${unread} necitite` : ""}`} title="Notificări" className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-slate-300 transition hover:border-violet-400/35 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-fuchsia-700 px-1 text-[10px] font-bold text-white" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={8} aria-labelledby={titleId} aria-describedby={descriptionId} className="dark flex w-[min(26rem,calc(100vw-1rem))] max-h-[min(620px,var(--radix-popover-content-available-height),calc(100dvh-5rem))] flex-col gap-0 overflow-hidden rounded-2xl border-white/10 bg-[#0b1120] p-0 text-slate-100 shadow-2xl">
      <header className="shrink-0 border-b border-white/[0.08] px-4 py-3 text-left">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 id={titleId} className="text-sm font-semibold text-white">Notificări și anunțuri</h2><p id={descriptionId} className="mt-1 text-xs text-slate-400">Evenimentele tale și noutățile echipei</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => void load()} disabled={loading} aria-label="Reîmprospătează notificările" className="grid size-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.07]"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" aria-label="Închide notificările" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.07]"><X className="size-4" /></button></div></div>
      </header>
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/[0.07] px-4 py-3" role="group" aria-label="Filtrează notificările">
        {([ ["all", "Toate", items.length], ["unread", "Necitite", unread], ["announcements", "Anunțuri", announcements.length] ] as const).map(([key, label, count]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${filter === key ? "border-violet-400/40 bg-violet-500/20 text-white" : "border-white/10 text-slate-400 hover:text-white"}`}>{label} <span className="ml-1 opacity-70">{count}</span></button>)}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">Unele notificări nu s-au încărcat. Verifică sesiunea și autentificarea MFA. <button type="button" onClick={() => navigate("settings")} className="font-semibold underline">Deschide Setări</button></div>}
        {loading && items.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Se încarcă notificările…</p>}
        {!loading && !error && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-400">{filter === "unread" ? "Nu ai notificări necitite." : filter === "announcements" ? "Nu există anunțuri pentru echipă." : "Nu există notificări sau anunțuri recente."}</p>}
        {visible.map((item) => <article key={`${item.kind}-${item.id}`} className={`rounded-xl border p-4 ${item.read ? "border-white/[0.07] bg-white/[0.025]" : "border-violet-400/25 bg-violet-500/[0.09]"}`}>
          <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300">{item.kind === "announcement" ? <Megaphone className="size-4" /> : <Bell className="size-4" />}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-100">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.body}</p><p className="mt-2 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString("ro-RO")}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2 pl-11">{item.destination && <button type="button" onClick={() => navigate(item.destination!)} className="min-h-9 rounded-lg bg-violet-500/15 px-3 text-xs font-medium text-violet-200 hover:bg-violet-500/25">Deschide secțiunea</button>}{!item.read && <button type="button" onClick={() => void markRead(item.id,item.kind)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/[0.05]"><Check className="size-3.5" /> Marchează citită</button>}</div>
        </article>)}
      </div>
    </PopoverContent>
  </Popover>;
}
