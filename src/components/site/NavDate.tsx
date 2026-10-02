import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import { formatLocalDateTime } from "@/lib/localDateTime";

/**
 * Doar data, discret, în bara de sus. Ora și locația au fost scoase din hero;
* calendarul rămâne vizibil aici, pe toate paginile care au bara de sus.
 */
const NavDate = () => {
  const { lang } = useLang();
  const [today, setToday] = useState<Date>(() => new Date());

  useEffect(() => {
    // Data se schimbă o dată pe zi; un control pe minut și la revenirea în tab
    // e suficient și nu ține ceasul ocupat.
    const intervalId = window.setInterval(() => setToday(new Date()), 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") setToday(new Date());
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const local = formatLocalDateTime(today, lang);
  const short = new Intl.DateTimeFormat(lang === "ro" ? "ro-RO" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: local.timeZone,
  }).format(today);

  return (
    <time
      dateTime={today.toISOString().slice(0, 10)}
      data-testid="nav-date"
      aria-label={lang === "ro" ? `Astăzi, ${local.date}` : `Today, ${local.date}`}
      title={local.timeZone}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-1.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-foreground/50 transition-colors duration-200 hover:text-foreground/80"
    >
      <CalendarDays className="size-3.5 shrink-0 text-brand/75" aria-hidden="true" focusable="false" />
      <span className="hidden sm:inline whitespace-nowrap tabular-nums">{local.date}</span>
      <span className="sm:hidden whitespace-nowrap tabular-nums">{short}</span>
    </time>
  );
};

export default NavDate;
