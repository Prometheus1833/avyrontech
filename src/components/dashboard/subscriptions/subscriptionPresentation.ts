import type { BillingDetails } from "@/shared/subscriptionOperations";
export const inputClass =
  "mt-1 w-full min-w-0 rounded-xl border border-white/15 bg-[#080d1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-300";
export const panelClass =
  "min-w-0 rounded-2xl border border-white/10 bg-[#10162a]/90 p-4";
export const statusNames: Record<string, string> = {
  active: "Activ",
  paused: "În pauză",
  cancelled: "Anulat",
  free: "Gratuit",
  trial: "Test",
  expired: "Expirat",
  needs_configuration: "De completat",
  payment_due: "De plată",
  overdue: "Restant",
  draft: "Ciornă",
  paid: "Plătit",
  sent: "Trimis",
  invoiced: "Facturat",
  partially_paid: "Plătit parțial",
  incomplete: "În așteptare",
  past_due: "Restant",
};
export const cycleNames: Record<string, string> = {
  monthly: "Lunar",
  quarterly: "Trimestrial",
  yearly: "Anual",
  one_time: "Unic",
};
export const money = (minor: number | null | undefined, currency = "RON") =>
  minor == null
    ? "De completat"
    : new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(
        minor / 100,
      );
export const date = (stamp: number | null | undefined) =>
  stamp == null ? "De completat" : new Date(stamp).toLocaleDateString("ro-RO");
export const blankBilling = (): BillingDetails => ({
  entityType: "company",
  legalName: "",
  taxId: "",
  address: "",
  invoiceEmail: "",
  paymentTermsDays: 0,
});
