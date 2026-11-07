import { useEffect, useState } from "react";
import { Bell, ArrowUpRight } from "lucide-react";
import {
  loadNotificationAdmin,
  type NotificationAdminData as AdminData,
} from "@/lib/notificationAdmin";
export default function NotificationSummary({
  onOpen,
}: {
  onOpen: () => void;
}) {
  const [data, setData] = useState<AdminData | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void loadNotificationAdmin(controller.signal)
      .then(setData)
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, []);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/10 via-cyan-500/5 to-transparent p-4 text-left transition hover:border-violet-300/50 focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-200">
        <Bell className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          Sistem de notificări
        </span>
        <span className="mt-1 block text-xs text-slate-400">
          {error
            ? "Starea notificărilor nu este disponibilă"
            : data
              ? `${data.counts.reduce((sum, row) => sum + row.total, 0)} notificări în 30 de zile · mesaje pentru vizitatori ${data.config.guest.enabled ? "active" : "oprite"}`
              : "Se verifică starea…"}
        </span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-violet-300" />
    </button>
  );
}
