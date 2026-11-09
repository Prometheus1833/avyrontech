import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionsTab } from "./SubscriptionsTab";
const Maintenance = lazy(() => import("./MaintenanceSubscriptions"));
const Collaborations = lazy(() => import("./collaborators/CollaboratorsTab"));
export default function ClientRecurringTab() {
  const [params, setParams] = useSearchParams();
  const activities = params.get("recurringView") === "activities";
  const { hasCollaborations } = useAuth();
  const collaborations =
    hasCollaborations && params.get("recurringView") === "collaborations";
  return (
    <section className="min-w-0 space-y-4">
      <header className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
        <h1 className="text-2xl font-semibold">Mentenanță / Abonamente</h1>
        <p className="mt-2 text-sm text-slate-400">
          Planurile tale active, serviciile incluse și următoarea facturare.
        </p>
      </header>
      {hasCollaborations && (
        <nav
          aria-label="Mentenanță și abonamente"
          className="flex flex-wrap gap-2"
        >
          {[
            ["subscriptions", "Abonamentele mele"],
            ...(hasCollaborations
              ? [["collaborations", "Colaborările mele"]]
              : []),
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={
                (collaborations ? "collaborations" : "subscriptions") === value
              }
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm ${(collaborations ? "collaborations" : "subscriptions") === value ? "border-violet-400/40 bg-violet-500/15 text-violet-100" : "border-white/10 text-slate-300"}`}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (value !== "subscriptions")
                  next.set("recurringView", String(value));
                else next.delete("recurringView");
                setParams(next, { replace: true });
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      {activities && (
        <button
          type="button"
          className="min-h-11 rounded-xl border border-white/10 px-3 text-sm"
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete("recurringView");
            setParams(next, { replace: true });
          }}
        >
          Înapoi la abonamente
        </button>
      )}
      {collaborations ? (
        <Suspense fallback={<p role="status">Se încarcă colaborările…</p>}>
          <Collaborations portal />
        </Suspense>
      ) : activities ? (
        <Suspense fallback={<p role="status">Se încarcă mentenanța…</p>}>
          <Maintenance />
        </Suspense>
      ) : (
        <SubscriptionsTab embedded />
      )}
    </section>
  );
}
