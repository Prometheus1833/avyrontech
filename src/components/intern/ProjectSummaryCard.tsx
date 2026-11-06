import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import {
  projectBudget,
  projectKindLabel,
  projectPeriod,
  projectStageLabel,
  type ProjectSummary,
} from "@/shared/projectSummary";
import { normalizeExternalLink } from "@/shared/externalUrl";
export function ProjectFacts({ project }: { project: ProjectSummary }) {
  return (
    <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {(
        [
          ["Client", project.client_name || "Fără client alocat"],
          ["Buget", projectBudget(project)],
          ["Perioadă planificată", projectPeriod(project)],
        ] as const
      ).map(([label, value]) => (
        <div
          key={label}
          className={`min-w-0 ${label === "Client" ? "col-span-2" : ""}`}
        >
          <dt className="text-[10px] text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 break-words font-medium">{value}</dd>
        </div>
      ))}
      {project.service_names && (
        <div className="min-w-0 col-span-2">
          <dt className="text-[10px] text-muted-foreground">Servicii</dt>
          <dd className="mt-0.5 break-words">{project.service_names}</dd>
        </div>
      )}
    </dl>
  );
}
export default function ProjectSummaryCard({
  project,
}: {
  project: ProjectSummary;
}) {
  const url = project.url ? normalizeExternalLink(project.url) : null;
  return (
    <article
      aria-label={project.name}
      className="min-w-0 rounded-xl border border-border/60 bg-card p-3 transition hover:border-primary/50"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/intern/projects/${encodeURIComponent(project.slug)}`}
          className="min-w-0 break-words text-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {project.name}
        </Link>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
          {projectKindLabel(project.kind)}
        </span>
        <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">
          {projectStageLabel(project)}
        </span>
      </div>
      <a
        aria-label={`Site proiect: ${project.name}`}
        href={url || undefined}
        target={url ? "_blank" : undefined}
        rel={url ? "noopener noreferrer" : undefined}
        className={`mt-2 flex min-w-0 items-center gap-1 text-xs ${url ? "text-violet-400 hover:underline" : "text-muted-foreground"}`}
      >
        {url ? (
          <>
            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="size-3 shrink-0" aria-hidden />
          </>
        ) : (
          "Site necompletat"
        )}
      </a>
      <ProjectFacts project={project} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
        <span>
          {project.updated_at
            ? `Actualizat ${new Date(project.updated_at).toLocaleDateString("ro-RO")}`
            : "Actualizare nedatată"}
        </span>
        <Link
          className="inline-flex min-h-9 items-center text-xs text-violet-400 hover:underline"
          to={`/intern/projects/${encodeURIComponent(project.slug)}`}
        >
          Deschide proiectul
        </Link>
      </div>
    </article>
  );
}
