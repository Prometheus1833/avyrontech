import { useEffect, useState } from "react";
import type { Project } from "@/lib/internApi";
import { internApi } from "@/lib/internApi";
import { Button } from "@/components/ui/button";
import { ProjectFacts } from "./ProjectSummaryCard";
import { ChevronDown, Layers3 } from "lucide-react";
const day = (value: number | null | undefined) =>
  value == null ? "" : new Date(value).toISOString().slice(0, 10);
export default function ProjectOverviewFields({
  project,
  canWrite,
  onChanged,
}: {
  project: Project;
  canWrite: boolean;
  onChanged: () => Promise<void>;
}) {
  const [start, setStart] = useState(day(project.planned_start_at)),
    [end, setEnd] = useState(day(project.planned_end_at)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    setStart(day(project.planned_start_at));
    setEnd(day(project.planned_end_at));
  }, [project.id, project.planned_start_at, project.planned_end_at]);
  return (
    <section id="rezumat" className="project-panel project-section p-4 sm:p-5" aria-labelledby="project-summary-title">
      <h2 id="project-summary-title" className="project-heading"><Layers3 aria-hidden="true" />Rezumatul proiectului</h2>
      <ProjectFacts project={project} />
      {canWrite && (
        <details className="project-disclosure mt-3">
          <summary>
            Planifică perioada proiectului
            <ChevronDown aria-hidden="true" />
          </summary>
          <form
            className="mt-3 grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setError("");
              setNotice("");
              if (start && end && start > end) {
                setError("Data de final trebuie să fie după început.");
                return;
              }
              setBusy(true);
              try {
                await internApi.updateProject(project.id, {
                  planned_start_at: start
                    ? Date.parse(`${start}T00:00:00Z`)
                    : null,
                  planned_end_at: end ? Date.parse(`${end}T00:00:00Z`) : null,
                });
                await onChanged();
                setNotice("Perioada a fost salvată.");
              } catch {
                setError(
                  "Perioada nu s-a salvat. Datele introduse sunt păstrate.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="grid gap-1 text-xs">
              Început planificat
              <input
                aria-label="Început planificat"
                type="date"
                className="min-w-0 w-full rounded-lg border bg-background p-2 text-sm"
                value={start}
                disabled={busy}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Final planificat
              <input
                aria-label="Final planificat"
                type="date"
                min={start || undefined}
                className="min-w-0 w-full rounded-lg border bg-background p-2 text-sm"
                value={end}
                disabled={busy}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Date opționale. Etapa și perioada planificată sunt afișate separat
              de facturare.
            </p>
            <Button disabled={busy} className="justify-self-start">
              {busy ? "Se salvează…" : "Salvează perioada"}
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-sm text-amber-500">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-2 text-sm text-emerald-500">
              {notice}
            </p>
          )}
        </details>
      )}
    </section>
  );
}
