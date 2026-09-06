import { ArrowRightLeft, DatabaseZap } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { useCurrency, type DisplayCurrency } from "@/hooks/useCurrency";

type CurrencySwitchProps = {
  accent?: "cyan" | "emerald";
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
};

export default function CurrencySwitch({
  accent = "cyan",
  className = "",
  compact = false,
  showDetails = true,
}: CurrencySwitchProps) {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { currency, setCurrency, rate, referenceDate, rateStatus } = useCurrency(ro ? "ro-RO" : "en-IE");
  const selectedClass = accent === "emerald"
    ? "bg-emerald-400 text-slate-950 shadow-[0_0_22px_rgba(52,211,153,0.24)]"
    : "bg-cyan-400 text-slate-950 shadow-[0_0_22px_rgba(34,211,238,0.24)]";

  const sourceLabel = rateStatus === "loading"
    ? (ro ? "se încarcă din Cloudflare" : "loading from Cloudflare")
    : rateStatus === "fallback"
    ? (ro ? "estimare de rezervă" : "fallback estimate")
    : rateStatus === "stale"
      ? (ro ? "ultimul curs BCE valid" : "latest valid ECB rate")
      : "BCE / ECB";
  const formattedDate = referenceDate && rateStatus !== "fallback"
    ? new Intl.DateTimeFormat(ro ? "ro-RO" : "en-GB", { day: "2-digit", month: "short", timeZone: "UTC" })
      .format(new Date(`${referenceDate}T00:00:00Z`))
    : "";

  const other: DisplayCurrency = currency === "EUR" ? "RON" : "EUR";

  return (
    <div
      data-testid="currency-switch"
      /* The active currency, readable without depending on localised button copy. */
      data-currency={currency}
      className={`inline-flex flex-col items-center ${className}`}
    >
      {compact ? (
        // Minimal single-pill toggle (same style as LangSwitch): shows only the
        // active currency; clicking switches to the other one.
        <button
          type="button"
          onClick={() => setCurrency(other)}
          aria-label={ro ? `Schimbă moneda (activă: ${currency})` : `Switch currency (active: ${currency})`}
          title={ro ? `Monedă: ${currency} — apasă pentru ${other}` : `Currency: ${currency} — click for ${other}`}
          className="px-2 py-0.5 rounded-full bg-muted/70 text-[10px] font-bold uppercase text-foreground transition-all duration-200 ease-out hover:bg-muted hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {currency}
        </button>
      ) : (
        <div className="inline-flex items-center rounded-full border border-foreground/15 bg-background/75 p-1 shadow-sm backdrop-blur-sm gap-0.5">
          <span aria-hidden className="grid place-items-center rounded-full text-foreground/55 size-8">
            <ArrowRightLeft className="size-3.5" />
          </span>
          {(["EUR", "RON"] as DisplayCurrency[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCurrency(option)}
              aria-pressed={currency === option}
              aria-label={ro ? `Afișează prețurile în ${option}` : `Show prices in ${option}`}
              className={`rounded-full font-mono font-bold tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 px-4 py-1.5 text-xs ${
                currency === option ? selectedClass : "text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      {showDetails && (
        <p className="mt-2 inline-flex max-w-full items-center gap-1.5 text-center font-mono text-[9px] uppercase tracking-[0.11em] text-foreground/45 sm:text-[10px]" aria-live="polite">
          <DatabaseZap className="size-3 shrink-0" aria-hidden />
          <span>
            {sourceLabel} · 1 EUR = {rateStatus === "loading" ? "…" : rate.toFixed(4)} RON{formattedDate ? ` · ${formattedDate}` : ""}
          </span>
        </p>
      )}
    </div>
  );
}
