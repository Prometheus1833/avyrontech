import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { readCookieConsent } from "@/lib/cookieConsent";
import { publicSiteHref } from "@/lib/appHost";
import {
  engagedTime,
  GUEST_NOTICE_STATE_KEY,
  useGuestNotificationConfig,
} from "@/lib/guestNotifications";
import { guestContext } from "@/shared/notifications";

export default function ContextualNotificationPrompt() {
  const { user, loading } = useAuth(),
    { pathname } = useLocation();
  const context = guestContext(pathname),
    en = pathname === "/en" || pathname.startsWith("/en/");
  const config = useGuestNotificationConfig(
    !loading && !user && Boolean(context),
  );
  const shownInMemory = useRef(false);
  const [visible, setVisible] = useState(false),
    [sessionShown, setSessionShown] = useState(false);
  useEffect(() => {
    setVisible(false);
    if (
      loading ||
      user ||
      !context ||
      !config?.enabled ||
      sessionShown ||
      shownInMemory.current
    )
      return;
    let elapsed = 0,
      last = performance.now(),
      shown = false;
    try {
      const state = JSON.parse(
        localStorage.getItem(GUEST_NOTICE_STATE_KEY) || "{}",
      );
      if (
        state.lastShownAt &&
        Date.now() - state.lastShownAt < config.cooldownHours * 3600000
      )
        return;
      if (sessionStorage.getItem(GUEST_NOTICE_STATE_KEY)) return;
    } catch {
      /* Storage disabled: in-memory single-session limit still applies. */
    }
    const timer = window.setInterval(() => {
      if (!readCookieConsent()?.marketing) {
        last = performance.now();
        setVisible(false);
        return;
      }
      if (
        document
          .querySelector<HTMLMetaElement>('meta[name="robots"]')
          ?.content.includes("noindex")
      ) {
        last = performance.now();
        setVisible(false);
        return;
      }
      const now = performance.now(),
        focused = document.activeElement;
      const formActive =
        focused instanceof HTMLElement &&
        (focused.matches("input,textarea,select,[contenteditable=true]") ||
          Boolean(focused.closest('[role="dialog"]')));
      if (
        shown &&
        formActive &&
        !(
          focused instanceof HTMLElement &&
          focused.closest("[data-context-notice]")
        )
      )
        setVisible(false);
      elapsed = engagedTime(
        elapsed,
        now - last,
        !document.hidden && document.hasFocus() && !formActive,
      );
      last = now;
      if (!shown && elapsed >= config.delaySeconds * 1000) {
        shown = true;
        shownInMemory.current = true;
        setVisible(true);
        try {
          sessionStorage.setItem(GUEST_NOTICE_STATE_KEY, "1");
          localStorage.setItem(
            GUEST_NOTICE_STATE_KEY,
            JSON.stringify({ lastShownAt: Date.now() }),
          );
        } catch {
          /* No persistent tracking fallback. */
        }
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, user, context, config, pathname, sessionShown]);
  const dismiss = () => {
    setVisible(false);
    setSessionShown(true);
  };
  if (!visible || loading || user || !config || !context) return null;
  const copy = config.messages[context],
    language = en ? "en" : "ro";
  return (
    <aside
      data-context-notice
      aria-label={
        en ? "A suggestion for your project" : "O sugestie pentru proiectul tău"
      }
      role="status"
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-40 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-violet-300/25 bg-[#0b1120]/95 text-slate-100 shadow-[0_20px_65px_-20px_rgba(99,102,241,.4)] backdrop-blur-xl sm:bottom-6 sm:left-6"
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-violet-500/15 to-cyan-500/5 py-2 pl-4 pr-2">
        <MessageCircle className="size-4 text-violet-300" />
        <span className="font-mono text-[10px] uppercase tracking-[.2em] text-violet-200">
          AVYRON · {en ? "Let’s talk" : "Hai să discutăm"}
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label={en ? "Dismiss suggestion" : "Închide sugestia"}
          className="ml-auto grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-3 p-4">
        <h2 className="break-words font-display text-base font-semibold text-white">
          {copy.title[language]}
        </h2>
        <p className="break-words text-sm leading-relaxed text-slate-300">
          {copy.body[language]}
        </p>
        <a
          onClick={dismiss}
          href={publicSiteHref(en ? "/en#cta" : "/#cta")}
          className="inline-flex min-h-11 max-w-full [overflow-wrap:anywhere] items-center gap-2 rounded-xl border border-violet-300/25 bg-violet-500/20 px-3 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/30 focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          {copy.cta[language]}
          <ArrowUpRight className="size-4 shrink-0" />
        </a>
      </div>
    </aside>
  );
}
