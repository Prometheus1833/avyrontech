import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { SubscriptionsTab } from "./SubscriptionsTab";
const Maintenance = lazy(() => import("./MaintenanceSubscriptions"));
export default function ClientRecurringTab() {
  const [params, setParams] = useSearchParams(),
    activities = params.get("recurringView") === "activities";
  return (
    <section className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <h1 className="text-2xl font-semibold">Mentenanță / Abonamente</h1>
        <p className="mt-2 text-sm text-slate-400">
          Planurile tale, următoarea facturare și activitățile proiectelor,
          într-un singur loc.
        </p>
      </header>
      <nav
        aria-label="Mentenanță și abonamente"
        className="flex flex-wrap gap-2"
      >
        {[
          [false, "Abonamentele mele"],
          [true, "Activități și materiale"],
        ].map(([value, label]) => (
          <button
            key={String(value)}
            type="button"
            aria-pressed={activities === value}
            className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${activities === value ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-white/10 text-slate-300"}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              if (value) next.set("recurringView", "activities");
              else next.delete("recurringView");
              setParams(next, { replace: true });
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {activities ? (
        <Suspense fallback={<p role="status">Se încarcă activitățile…</p>}>
          <Maintenance />
        </Suspense>
      ) : (
        <SubscriptionsTab embedded />
      )}
    </section>
  );
}
