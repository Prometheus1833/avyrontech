import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, RefreshCw } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type NotificationRow = { id: string; title: string; body: string; read_at: number | null; created_at: number };

export default function NotificationCenter({ enabled }: { enabled: boolean }) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const result = await cfAuth.request<{ data: NotificationRow[] }>("/api/operations/notifications");
      setRows(result.data.slice(0, 8));
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { if (open) void load(); }, [open, load]);
  const unread = useMemo(() => rows.filter((row) => !row.read_at).length, [rows]);

  const markRead = async (id: string) => {
    try {
      await cfAuth.request(`/api/operations/notifications/${id}/read`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: "{}",
      });
      setRows((current) => current.map((row) => row.id === id ? { ...row, read_at: Date.now() } : row));
    } catch {
      setAvailable(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Deschide notificările" title="Notificări" className="relative rounded-xl p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200">
          <Bell className="size-4" />
          {(unread > 0 || (enabled && rows.length === 0)) && <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-fuchsia-400 ring-2 ring-[#080d1b]" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={10} className="dark w-[min(92vw,380px)] overflow-hidden border-white/[0.09] bg-[#0b1120] p-0 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div><p className="text-sm font-semibold">Notificări</p><p className="text-[10px] text-slate-500">Ultimele evenimente AVYRON OS</p></div>
          <button type="button" onClick={() => void load()} aria-label="Reîmprospătează notificările" className="rounded-lg p-2 text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /></button>
        </div>
        <div className="max-h-[420px] space-y-1 overflow-y-auto p-2 [scrollbar-color:rgba(139,92,246,.35)_transparent] [scrollbar-width:thin]">
          {!enabled && <p className="p-4 text-center text-xs text-slate-500">Notificările operaționale sunt disponibile conturilor administrative.</p>}
          {enabled && !loading && !available && <p className="p-4 text-center text-xs text-slate-500">Centrul de notificări necesită o sesiune administrativă verificată.</p>}
          {available && !loading && rows.length === 0 && <p className="p-4 text-center text-xs text-slate-500">Nu există notificări noi.</p>}
          {rows.map((row) => (
            <article key={row.id} className={`rounded-xl border p-3 ${row.read_at ? "border-white/[0.05] bg-white/[0.02]" : "border-violet-400/15 bg-violet-500/[0.08]"}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><h3 className="text-xs font-semibold text-slate-200">{row.title}</h3><p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-400">{row.body}</p><p className="mt-2 text-[9px] text-slate-600">{new Date(row.created_at).toLocaleString("ro-RO")}</p></div>
                {!row.read_at && <button type="button" onClick={() => void markRead(row.id)} aria-label="Marchează notificarea citită" className="rounded-lg border border-white/[0.07] p-1.5 text-slate-500 hover:text-emerald-300"><Check className="size-3" /></button>}
              </div>
            </article>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
