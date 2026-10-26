import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, Megaphone, RefreshCw } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { canOpenSection, type Access, type SectionId } from "@/lib/access";

type OperationNotice = { id: string; title: string; body: string; destination: string | null; read_at: number | null; created_at: number };
type Announcement = { id: string; title: string; content: string; priority: string; created_at: string | number };
type FeedItem = { id: string; title: string; body: string; createdAt: number; read: boolean; kind: "operation" | "announcement"; destination: SectionId | null };
type Filter = "all" | "unread" | "announcements";

export default function NotificationCenter({ access, onNavigate, autoOpen = false }: { access: Access; onNavigate: (section: SectionId) => void; autoOpen?: boolean }) {
  const [open, setOpen] = useState(autoOpen);
  const [operations, setOperations] = useState<OperationNotice[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!access.isStaff) return;
    setLoading(true);
    const results = await Promise.allSettled([
      cfAuth.request<{ data: Announcement[] }>("/api/workspace/announcements?limit=50"),
      access.isSuperAdmin ? cfAuth.request<{ data: OperationNotice[] }>("/api/operations/notifications") : Promise.resolve({ data: [] as OperationNotice[] }),
    ]);
    if (results[0].status === "fulfilled") setAnnouncements(results[0].value.data);
    if (results[1].status === "fulfilled") setOperations(results[1].value.data);
    setError(results.some((result) => result.status === "rejected"));
    setLoading(false);
  }, [access.isStaff, access.isSuperAdmin]);

  useEffect(() => {
    if (!access.isStaff) return;
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60_000);
    return () => window.clearInterval(interval);
  }, [access.isStaff, load]);

  const items = useMemo<FeedItem[]>(() => [
    ...(access.isSuperAdmin ? operations : []).map((row): FeedItem => ({
      id: row.id, title: row.title, body: row.body, createdAt: row.created_at,
      read: Boolean(row.read_at), kind: "operation",
      destination: row.destination && canOpenSection(row.destination, access) ? row.destination as SectionId : null,
    })),
    ...announcements.map((row): FeedItem => ({
      id: row.id, title: row.title, body: row.content, createdAt: typeof row.created_at === "string" ? Date.parse(row.created_at) : row.created_at,
      read: true, kind: "announcement", destination: "announcements",
    })),
  ].sort((a, b) => b.createdAt - a.createdAt), [operations, announcements, access]);
  const unread = access.isSuperAdmin ? operations.filter((row) => !row.read_at).length : 0;
  const visible = items.filter((item) => filter === "all" || (filter === "unread" ? !item.read : item.kind === "announcement"));

  const markRead = async (id: string) => {
    try {
      await cfAuth.request(`/api/operations/notifications/${id}/read`, {
        method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() }, body: "{}",
      });
      setOperations((current) => current.map((row) => row.id === id ? { ...row, read_at: Date.now() } : row));
    } catch { setError(true); }
  };
  const navigate = (section: SectionId) => { setOpen(false); onNavigate(section); };
  if (!access.isStaff) return null;

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <button type="button" aria-label={`Notificări${unread ? `, ${unread} necitite` : ""}`} title="Notificări" className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-white/[0.08] text-slate-300 transition hover:border-violet-400/35 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
        <Bell className="size-[18px]" />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-fuchsia-500 px-1 text-[10px] font-bold text-white" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
    </DialogTrigger>
    <DialogContent className="dark flex max-h-[min(85dvh,740px)] max-w-lg flex-col gap-0 overflow-hidden border-white/10 bg-[#0b1120] p-0 text-slate-100 max-sm:left-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-screen max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
      <DialogHeader className="shrink-0 border-b border-white/[0.08] px-5 py-4 pr-12 text-left">
        <div className="flex items-center justify-between gap-3"><div><DialogTitle className="text-base text-white">Notificări și anunțuri</DialogTitle><DialogDescription className="mt-1 text-xs text-slate-400">Evenimentele tale AVYRON OS și noutățile echipei</DialogDescription></div><button type="button" onClick={() => void load()} aria-label="Reîmprospătează notificările" className="grid size-10 place-items-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/[0.07]"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /></button></div>
      </DialogHeader>
      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-white/[0.07] px-4 py-3" role="group" aria-label="Filtrează notificările">
        {([ ["all", "Toate", items.length], ["unread", "Necitite", unread], ["announcements", "Anunțuri", announcements.length] ] as const).map(([key, label, count]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${filter === key ? "border-violet-400/40 bg-violet-500/20 text-white" : "border-white/10 text-slate-400 hover:text-white"}`}>{label} <span className="ml-1 opacity-70">{count}</span></button>)}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {error && <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs text-amber-100">Unele notificări nu s-au încărcat. Verifică sesiunea și autentificarea MFA. <button type="button" onClick={() => navigate("settings")} className="font-semibold underline">Deschide Setări</button></div>}
        {loading && items.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Se încarcă notificările…</p>}
        {!loading && visible.length === 0 && <p className="p-8 text-center text-sm text-slate-400">{filter === "unread" ? "Nu ai notificări necitite." : filter === "announcements" ? "Nu există anunțuri pentru echipă." : "Nu există notificări sau anunțuri recente."}</p>}
        {visible.map((item) => <article key={`${item.kind}-${item.id}`} className={`rounded-xl border p-4 ${item.read ? "border-white/[0.07] bg-white/[0.025]" : "border-violet-400/25 bg-violet-500/[0.09]"}`}>
          <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300">{item.kind === "announcement" ? <Megaphone className="size-4" /> : <Bell className="size-4" />}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-100">{item.title}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{item.body}</p><p className="mt-2 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString("ro-RO")}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2 pl-11">{item.destination && <button type="button" onClick={() => navigate(item.destination!)} className="min-h-9 rounded-lg bg-violet-500/15 px-3 text-xs font-medium text-violet-200 hover:bg-violet-500/25">Deschide secțiunea</button>}{item.kind === "operation" && !item.read && <button type="button" onClick={() => void markRead(item.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/[0.05]"><Check className="size-3.5" /> Marchează citită</button>}</div>
        </article>)}
      </div>
    </DialogContent>
  </Dialog>;
}
