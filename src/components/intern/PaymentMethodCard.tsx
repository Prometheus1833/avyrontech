import { CreditCard, ShieldCheck, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Card vizual pentru metoda de plată salvată + abonament sincronizat.
 * Momentan doar VIZUAL — nu procesează plăți, nu stochează carduri reale.
 * Placeholder pentru integrarea viitoare Stripe / Netopia.
 */
export const PaymentMethodCard = ({
  planLabel,
  billingNext,
  onChange,
}: {
  planLabel: string | null;
  billingNext: number | null;
  onChange?: () => void;
}) => {
  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-2 text-primary">
            <CreditCard className="size-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Metodă de plată</p>
            <p className="font-mono text-sm mt-0.5">•••• •••• •••• 4242 <span className="ml-1 text-muted-foreground text-xs">Visa</span></p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1 bg-green-500/15 text-green-600 dark:text-green-400">
          <ShieldCheck className="size-3" /> Salvat securizat
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
        <div className="rounded-lg border bg-background/60 p-2.5">
          <p className="text-[11px] text-muted-foreground">Abonament activ</p>
          <p className="font-medium mt-0.5">{planLabel ?? "Fără abonament"}</p>
        </div>
        <div className="rounded-lg border bg-background/60 p-2.5">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Calendar className="size-3" /> Următoarea facturare
          </p>
          <p className="font-medium mt-0.5">
            {billingNext ? new Date(billingNext).toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          🔒 Sincronizat cu abonamentul de mai sus. Momentan preview vizual — plățile reale se integrează în etapa următoare.
        </p>
        {onChange && (
          <Button size="sm" variant="ghost" onClick={onChange}>Schimbă cardul</Button>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodCard;
