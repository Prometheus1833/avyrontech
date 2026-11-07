import { useEffect, useState } from "react";
import { apiUrl } from "./apiBase";
import {
  notificationSettingsSchema,
  type NotificationSettings,
} from "@/shared/notifications";
export const GUEST_NOTICE_STATE_KEY = "avyron-context-notice-v1";
let cached: { until: number; data: NotificationSettings["guest"] } | null =
  null;
let pending: Promise<NotificationSettings["guest"] | null> | null = null;
export function fetchGuestNotificationConfig() {
  if (cached && cached.until > Date.now()) return Promise.resolve(cached.data);
  if (!pending)
    pending = fetch(apiUrl("/api/notifications/config"), {
      headers: { accept: "application/json" },
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const body = (await r.json()) as { data?: unknown };
        const result = notificationSettingsSchema.shape.guest.safeParse(
          body.data,
        );
        if (!result.success) return null;
        cached = { until: Date.now() + 60_000, data: result.data };
        return result.data;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  return pending;
}
export function useGuestNotificationConfig(enabled: boolean) {
  const [config, setConfig] = useState<NotificationSettings["guest"] | null>(
    null,
  );
  useEffect(() => {
    if (!enabled) {
      setConfig(null);
      return;
    }
    let active = true;
    const load = () => {
      if (document.hidden) return;
      void fetchGuestNotificationConfig().then((next) => {
        if (active)
          setConfig((current) =>
            JSON.stringify(current) === JSON.stringify(next) ? current : next,
          );
      });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [enabled]);
  return config;
}
/** Cap each sample so suspension/background throttling cannot fast-forward the timer. */
export function engagedTime(elapsed: number, delta: number, eligible: boolean) {
  return elapsed + (eligible ? Math.max(0, Math.min(delta, 1500)) : 0);
}
