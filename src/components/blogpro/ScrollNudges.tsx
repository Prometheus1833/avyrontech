import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

/**
 * Subtle, scroll-triggered conversion nudges for the Blog Profesional page.
 * One message at a time, appears once per anchor section, auto-dismisses.
 */

type Nudge = { id: string; anchor: string; ro: string; en: string; cta?: string };

const NUDGES: Nudge[] = [
  { id: "journey", anchor: "content-journey", ro: "Un articol bun lucrează pentru tine ani la rând.", en: "One good article keeps working for years." },
  { id: "cms", anchor: "cms", ro: "Publici în 2 minute, fără cunoștințe tehnice.", en: "Publish in 2 minutes, no tech skills needed." },
  { id: "seo", anchor: "seo", ro: "SEO tehnic inclus din prima zi.", en: "Technical SEO included from day one." },
  { id: "conversie", anchor: "conversie", ro: "Cititorii devin clienți prin pași clari.", en: "Readers turn into clients through clear steps." },
  { id: "pret", anchor: "configurator-blog", ro: "Configurează în 60 de secunde și vezi prețul.", en: "Configure in 60 seconds and see your price.", cta: "#configurator-blog" },
];

const ScrollNudges = () => {
  const { lang } = useLang();
  const [active, setActive] = useState<Nudge | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new Set<string>();
    let hideTimer: number | undefined;
    let clearTimer: number | undefined;

    const show = (nudge: Nudge) => {
      seen.add(nudge.id);
      setActive(nudge);
      setVisible(true);
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
      hideTimer = window.setTimeout(() => setVisible(false), 5200);
      clearTimer = window.setTimeout(() => setActive(null), 5900);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const nudge = NUDGES.find((n) => n.anchor === entry.target.id);
          if (nudge && !seen.has(nudge.id)) show(nudge);
        }
      },
      { threshold: 0.35 },
    );

    for (const n of NUDGES) {
      const el = document.getElementById(n.anchor);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [dismissed]);

  if (!active || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-3 bottom-4 z-40 flex justify-center sm:inset-x-auto sm:left-6 sm:justify-start ${
        visible ? "animate-nudge-in" : "animate-nudge-out"
      }`}
    >
      <div className="pointer-events-auto flex max-w-[22rem] items-center gap-2.5 rounded-full border border-border/70 bg-card/85 py-2 pl-3 pr-2 text-xs font-medium shadow-soft backdrop-blur-xl">
        <Sparkles className="size-3.5 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0">{lang === "ro" ? active.ro : active.en}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={lang === "ro" ? "Închide notificarea" : "Dismiss notification"}
          className="ml-auto grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default ScrollNudges;
