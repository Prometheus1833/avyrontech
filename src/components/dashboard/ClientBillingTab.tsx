import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { InvoicesTab } from "./InvoicesTab";
const Settings = lazy(() => import("./BillingSettingsCard"));
export default function ClientBillingTab() {
  const [params, setParams] = useSearchParams(),
    view = params.get("billingView") === "settings" ? "settings" : "invoices";
  return (
    <section className="min-w-0 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Plăți și facturi</h1>
        <p className="mt-1 text-sm text-slate-400">
          Istoricul facturilor, datele de facturare și metodele tale de plată.
        </p>
      </header>
      <nav aria-label="Plăți și facturi" className="flex flex-wrap gap-2">
        {[
          ["invoices", "Istoric facturi"],
          ["settings", "Date și metode de plată"],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={view === value}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${view === value ? "border-violet-400/40 bg-violet-500/15" : "border-white/10"}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("billingView", value);
              setParams(next, { replace: true });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === "invoices" ? (
        <InvoicesTab embedded />
      ) : (
        <Suspense fallback={<p role="status">Se încarcă datele de plată…</p>}>
          <Settings embedded />
        </Suspense>
      )}
    </section>
  );
}
