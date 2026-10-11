import { Building2, CreditCard, FileCheck2, ReceiptText, ShieldCheck } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

/**
 * Public payment guidance. Provider identities and configuration state belong
 * to authenticated checkout/account surfaces, not to marketing pages.
 */
const PaymentMethods = ({ compact = false }: { compact?: boolean }) => {
  const { lang } = useLang();
  const ro = lang === "ro";

  const methods = [
    {
      icon: CreditCard,
      label: ro ? "Plată cu cardul" : "Card payment",
      hint: ro ? "doar prin checkout securizat" : "secure checkout only",
    },
    {
      icon: Building2,
      label: ro ? "Transfer bancar" : "Bank transfer",
      hint: ro ? "pentru persoane și companii" : "for people and companies",
    },
    {
      icon: ReceiptText,
      label: ro ? "Proformă la cerere" : "Pro forma on request",
      hint: ro ? "înainte de plată" : "before payment",
    },
    {
      icon: FileCheck2,
      label: ro ? "Factură fiscală" : "Tax invoice",
      hint: ro ? "după confirmarea încasării" : "after payment confirmation",
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
              ? "Opțiunile disponibile sunt confirmate înainte de comandă, fără promisiuni despre integrări neactivate."
              : "Available options are confirmed before ordering, without claims about inactive integrations."}
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
          ? "Procesatorul este afișat numai în checkout, dacă este activ pentru comanda respectivă. Avyron nu stochează datele complete ale cardului, iar plățile recurente cer acord explicit."
          : "The processor is shown only in checkout when active for that order. Avyron does not store full card details, and recurring payments require explicit consent."}
      </p>
    </section>
  );
};

export default PaymentMethods;
