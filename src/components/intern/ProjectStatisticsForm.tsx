import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { workspaceApi } from "@/lib/workspaceApi";
import { Button } from "@/components/ui/button";

const labels = {
  period_start: "Început interval",
  period_end: "Sfârșit interval",
  visits: "Vizite",
  unique_visitors: "Vizitatori unici",
  uptime_percent: "Disponibilitate (%)",
  avg_response_ms: "Răspuns mediu (ms)",
  source: "Sursa raportului",
};
const numberOrNull = (value: string) => value === "" ? null : Number(value);

export function ProjectStatisticsForm({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    period_start: "", period_end: "", visits: "", unique_visitors: "",
    uptime_percent: "", avg_response_ms: "", source: "",
  });

  return (
    <details className="project-disclosure mt-4">
      <summary>Înregistrează un raport de performanță<ChevronDown aria-hidden="true" /></summary>
      <p className="my-2 text-xs text-muted-foreground">Folosește valorile din raportul sursă. Raportul este vizibil persoanelor cu acces la proiect.</p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          await workspaceApi.write(`statistics/${projectId}`, {
            source: form.source,
            period_start: new Date(form.period_start).getTime(),
            period_end: new Date(form.period_end).getTime(),
            visits: numberOrNull(form.visits),
            unique_visitors: numberOrNull(form.unique_visitors),
            uptime_percent: numberOrNull(form.uptime_percent),
            avg_response_ms: numberOrNull(form.avg_response_ms),
          });
          toast.success("Raport înregistrat.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Raportul nu poate fi salvat.");
        } finally { setBusy(false); }
      }}>
        {(Object.keys(labels) as (keyof typeof labels)[]).map((key) => {
          const period = key === "period_start" || key === "period_end";
          const source = key === "source";
          return (
            <label key={key} className="grid min-w-0 gap-1 text-sm">
              {labels[key]}
              <input
                required={period || source}
                type={period ? "datetime-local" : source ? "text" : "number"}
                min={period || source ? undefined : 0}
                max={key === "uptime_percent" ? 100 : undefined}
                step={key === "uptime_percent" ? 0.01 : undefined}
                maxLength={source ? 200 : undefined}
                value={form[key]}
                onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
                className="w-full min-w-0 rounded-lg border bg-background p-2"
              />
            </label>
          );
        })}
        <Button disabled={busy} className="justify-self-start">{busy ? "Se salvează…" : "Salvează raportul"}</Button>
      </form>
    </details>
  );
}
