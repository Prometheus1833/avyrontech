import { Building2, CreditCard, FileText, Link2, ShieldCheck } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

/**
 * Compact, SEO-friendly payment methods strip.
 * Used on the pricing page and on every individual product page.
 */
const PaymentMethods = ({ compact = false }: { compact?: boolean }) => {
  const { lang } = useLang();
  const ro = lang === "ro";

  const methods = [
    {
      icon: CreditCard,
      label: ro ? "Card bancar" : "Bank card",
      hint: ro ? "rapid & securizat" : "fast & secure",
    },
    {
      icon: Building2,
      label: ro ? "Transfer bancar" : "Bank transfer",
      hint: ro ? "pe bază de factură" : "against invoice",
    },
    {
      icon: Link2,
      label: ro ? "Link de plată" : "Payment link",
      hint: ro ? "servicii & abonamente" : "services & subscriptions",
    },
    {
      icon: FileText,
      label: ro ? "Factură & OP" : "Invoice & PO",
      hint: ro ? "clienți business" : "business clients",
    },
  ];

  return (
    <section
      aria-label={ro ? "Modalități de plată acceptate" : "Accepted payment methods"}
      className={
        compact
          ? "rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-4 sm:px-5 backdrop-blur"
          : "rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-6 sm:px-6 backdrop-blur"
      }
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
          <ShieldCheck className="size-3.5" aria-hidden />
          {ro ? "Plăți sigure" : "Secure payments"}
        </span>
        <h2 className="w-full font-display text-base font-bold sm:text-lg">
          {ro ? "Modalități de plată flexibile" : "Flexible payment methods"}
        </h2>
        {!compact && (
          <p className="w-full text-xs text-foreground/60">
            {ro
              ? "Metode rapide și sigure, pentru persoane fizice și companii."
              : "Fast, secure methods for individuals and companies."}
          </p>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {methods.map((m) => (
          <li
            key={m.label}
            className="group flex items-center gap-2.5 rounded-xl border border-foreground/10 bg-background/40 px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-foreground/[0.05]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-white">
              <m.icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 text-left">
              <span className="block truncate text-xs font-bold leading-tight">{m.label}</span>
              <span className="block truncate text-[10px] text-foreground/55">{m.hint}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-center text-[10px] leading-relaxed text-foreground/50">
        {ro
          ? "Facturile se emit în RON la cursul BNR din ziua emiterii sau al plății. În curând: plată direct din contul de client pe platformă."
          : "Invoices are issued in RON at the BNR rate on the day of issue or payment. Coming soon: pay directly from your client account on the platform."}
      </p>
    </section>
  );
};

export default PaymentMethods;
