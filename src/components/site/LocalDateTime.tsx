import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/i18n/LanguageContext";
import { formatLocalDateTime } from "@/lib/localDateTime";

const LocalDateTime = () => {
  const { lang } = useLang();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let intervalId = 0;
    const update = () => setNow(new Date());
    update();

    // Align updates to the user's minute boundary; seconds are intentionally
    // neither displayed nor announced.
    const timeoutId = window.setTimeout(() => {
      update();
      intervalId = window.setInterval(update, 60_000);
    }, 60_000 - (Date.now() % 60_000) + 50);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  if (!now) {
    return (
      <div
        className="mb-5 h-9 w-[17.5rem] max-w-[calc(100vw-2rem)] rounded-full border border-foreground/10 bg-background/40"
        aria-hidden="true"
      />
    );
  }

  const local = formatLocalDateTime(now, lang);
  const ariaLabel = lang === "ro"
    ? `${local.date}, ora locală ${local.time}, ${local.city}`
    : `${local.date}, local time ${local.time}, ${local.city}`;

  return (
    <time
      dateTime={now.toISOString()}
      data-testid="local-date-time"
      aria-label={ariaLabel}
      title={local.timeZone}
      className="mb-5 inline-flex min-h-9 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-foreground/10 bg-background/55 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-foreground/65 shadow-soft backdrop-blur-xl sm:gap-2.5 sm:text-[11px]"
    >
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <CalendarDays className="size-3.5 text-brand" aria-hidden="true" />
        {local.date}
      </span>
      <span className="h-3.5 w-px bg-foreground/15" aria-hidden="true" />
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-foreground/85 tabular-nums">
        <Clock3 className="size-3.5 text-brand" aria-hidden="true" />
        {local.time}
      </span>
      <span className="h-3.5 w-px bg-foreground/15" aria-hidden="true" />
      <span className="inline-flex min-w-0 items-center gap-1 whitespace-nowrap normal-case tracking-normal">
        <MapPin className="size-3 shrink-0 text-brand" aria-hidden="true" />
        <span className="truncate">{local.city}</span>
      </span>
    </time>
  );
};

export default LocalDateTime;
