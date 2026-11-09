import { useState } from "react";
import { Link } from "react-router-dom";
import { Columns3, List, Search, ArrowUpRight, RotateCcw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STAGES, projectStage } from "@/shared/projectLifecycle";
import {
  projectBudget,
  projectPeriod,
  projectKindLabel,
  projectStageLabel,
  type ProjectSummary,
} from "@/shared/projectSummary";
import {
  defaultProjectFilters,
  visibleProjects,
  isArchivedProject,
  type ProjectFilters,
} from "@/shared/projectWorkspace";
import ProjectSummaryCard from "./ProjectSummaryCard";
import { normalizeExternalLink } from "@/shared/externalUrl";

const stageTone = {
  proposed: "border-slate-400/30 bg-slate-400/5",
  in_progress: "border-violet-400/30 bg-violet-400/5",
  testing: "border-cyan-400/30 bg-cyan-400/5",
  completed: "border-emerald-400/30 bg-emerald-400/5",
};
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <span className="mb-1 block text-[11px] text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="min-h-11">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
function ProjectListRow({ project }: { project: ProjectSummary }) {
  const to = `/intern/projects/${encodeURIComponent(project.slug)}`;
  const url = project.url ? normalizeExternalLink(project.url) : null;
  return (
    <article
      aria-label={project.name}
      className="grid min-w-0 items-start gap-3 rounded-xl border border-border/60 bg-card/60 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.2fr)_minmax(100px,.7fr)_minmax(0,1.2fr)_auto]"
    >
      <div className="min-w-0">
        <Link
          className="break-words text-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          to={to}
        >
          {project.name}
        </Link>
        <p className="mt-1 break-words text-xs text-muted-foreground">
          {projectKindLabel(project.kind)}
        </p>
        {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Site proiect: ${project.name}`} className="mt-1 flex min-h-9 min-w-0 items-center gap-1 text-xs text-primary hover:underline"><span className="truncate">{url.replace(/^https?:\/\//, "")}</span><ExternalLink className="size-3 shrink-0" aria-hidden/></a>}
      </div>
      <div className="min-w-0 text-xs">
        <p className="text-[10px] text-muted-foreground">Client / servicii</p>
        <p className="mt-1 break-words font-medium">
          {project.client_name || "Fără client alocat"}
        </p>
        {project.service_names && (
          <p className="mt-1 break-words text-muted-foreground">
            {project.service_names}
          </p>
        )}
      </div>
      <span className="w-fit rounded-lg bg-primary/10 px-2 py-1 text-[11px] text-primary">
        {isArchivedProject(project)
          ? project.status === "archived"
            ? "Arhivat"
            : "Anulat"
          : projectStageLabel(project)}
      </span>
      <dl className="min-w-0 space-y-1 text-xs">
        <div>
          <dt className="text-[10px] text-muted-foreground">Buget</dt>
          <dd className="break-words">{projectBudget(project)}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">
            Perioadă planificată
          </dt>
          <dd className="break-words">{projectPeriod(project)}</dd>
        </div>
      </dl>
      <Link
        to={to}
        className="inline-flex min-h-10 w-fit items-center gap-1 text-xs text-primary hover:underline"
      >
        Deschide proiectul
        <ArrowUpRight className="size-3.5" />
      </Link>
    </article>
  );
}
export default function ProjectsWorkspace({
  rows,
}: {
  rows: ProjectSummary[];
}) {
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [filters, setFilters] = useState(defaultProjectFilters);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const set = <K extends keyof ProjectFilters>(
    key: K,
    value: ProjectFilters[K],
  ) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setExpanded({});
  };
  const scoped = visibleProjects(rows, filters, false),
    filtered = visibleProjects(rows, filters);
  const kinds = [...new Set(rows.map((p) => p.kind))].sort((a, b) =>
    projectKindLabel(a).localeCompare(projectKindLabel(b), "ro-RO"),
  );
  const clients = [
    ...new Map(
      rows
        .filter((p) => p.client_id)
        .map((p) => [p.client_id!, p.client_name || "Client fără denumire"]),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "ro-RO"));
  const activeFilters =
    filters.query ||
    filters.stage !== "all" ||
    filters.kind !== "all" ||
    filters.client !== "all" ||
    filters.collection !== "current" ||
    filters.sort !== "updated";
  const pipeline = view === "pipeline" && filters.collection === "current";
  return (
    <section className="min-w-0 space-y-3" aria-label="Organizare proiecte">
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Portofoliu de proiecte</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Aceleași proiecte în pipeline și listă, inclusiv cele finalizate.
            </p>
          </div>
          <div
            className="flex rounded-xl border border-border/60 p-1"
            aria-label="Afișare proiecte"
          >
            <Button
              type="button"
              size="sm"
              variant={view === "pipeline" ? "default" : "ghost"}
              aria-pressed={view === "pipeline"}
              onClick={() => {
                setView("pipeline");
                if (filters.collection === "archived")
                  set("collection", "current");
              }}
            >
              <Columns3 className="mr-1.5 size-4" />
              Pipeline
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "list" ? "default" : "ghost"}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <List className="mr-1.5 size-4" />
              Listă
            </Button>
          </div>
        </div>
        <label className="relative block">
          <span className="sr-only">Caută proiecte</span>
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            type="search"
            maxLength={160}
            className="min-h-11 pl-9 text-base sm:text-sm"
            placeholder="Proiect, client, serviciu sau adresă web…"
            value={filters.query}
            onChange={(e) => set("query", e.target.value)}
          />
        </label>
        <div className="grid min-w-0 grid-cols-2 gap-2 xl:grid-cols-4">
          <FilterSelect
            label="Tip proiect"
            value={filters.kind}
            onChange={(value) => set("kind", value)}
          >
            <SelectItem value="all">Toate tipurile</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {projectKindLabel(k)}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Beneficiar"
            value={filters.client}
            onChange={(value) => set("client", value)}
          >
            <SelectItem value="all">Toți clienții</SelectItem>
            <SelectItem value="unassigned">Fără client alocat</SelectItem>
            {clients.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Colecție"
            value={filters.collection}
            onChange={(value) => {
              set("collection", value as ProjectFilters["collection"]);
              if (value === "archived") {
                setView("list");
                set("stage", "all");
              }
            }}
          >
            <SelectItem value="current">Curente și finalizate</SelectItem>
            <SelectItem value="archived">Arhivate și anulate</SelectItem>
          </FilterSelect>
          <FilterSelect
            label="Ordonare"
            value={filters.sort}
            onChange={(value) => set("sort", value as ProjectFilters["sort"])}
          >
            <SelectItem value="updated">Actualizate recent</SelectItem>
            <SelectItem value="name">Nume A–Z</SelectItem>
            <SelectItem value="deadline">Termen planificat</SelectItem>
          </FilterSelect>
        </div>
        {filters.collection === "current" && (
          <div className="flex flex-wrap gap-1.5" aria-label="Filtru etapă">
            <Button
              size="sm"
              variant={filters.stage === "all" ? "secondary" : "ghost"}
              aria-pressed={filters.stage === "all"}
              onClick={() => set("stage", "all")}
            >
              Toate · {scoped.length}
            </Button>
            {PROJECT_STAGES.map((stage) => (
              <Button
                key={stage.id}
                size="sm"
                variant={filters.stage === stage.id ? "secondary" : "ghost"}
                aria-pressed={filters.stage === stage.id}
                onClick={() => set("stage", stage.id)}
              >
                {stage.label} ·{" "}
                {scoped.filter((p) => projectStage(p) === stage.id).length}
              </Button>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p role="status">
          {filtered.length}{" "}
          {filtered.length === 1 ? "proiect afișat" : "proiecte afișate"} din{" "}
          {rows.length} încărcate
          {rows.length >= 200
            ? " · API-ul returnează cele mai recente 200; restrânge contextul la proiectele tale dacă este necesar."
            : ""}
        </p>
        {activeFilters && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setFilters(defaultProjectFilters());
              setExpanded({});
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Resetează filtrele
          </Button>
        )}
      </div>
      {pipeline ? (
        <div
          className="grid min-w-0 items-start gap-3 lg:grid-cols-2 2xl:grid-cols-4"
          aria-label="Pipeline proiecte"
        >
          {PROJECT_STAGES.filter(
            (s) => filters.stage === "all" || filters.stage === s.id,
          ).map((stage) => {
            const projects = filtered.filter(
                (p) => projectStage(p) === stage.id,
              ),
              shown = expanded[stage.id] ? projects : projects.slice(0, 5);
            return (
              <details
                open
                key={stage.id}
                aria-label={stage.label}
                className={`min-w-0 self-start rounded-2xl border p-3 ${stageTone[stage.id]}`}
              >
                <summary className="flex min-h-9 cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                  <span>{stage.label}</span>
                  <span className="rounded-md bg-background/60 px-2 py-1 text-xs">
                    {projects.length} ▾
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  {shown.map((p) => (
                    <ProjectSummaryCard key={p.id} project={p} />
                  ))}
                  {!projects.length && (
                    <p className="rounded-xl border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                      Niciun proiect în această etapă
                      {activeFilters ? " pentru filtrele alese" : ""}.
                    </p>
                  )}
                  {projects.length > 5 && (
                    <Button
                      className="w-full"
                      variant="ghost"
                      size="sm"
                      aria-expanded={!!expanded[stage.id]}
                      onClick={() =>
                        setExpanded((v) => ({ ...v, [stage.id]: !v[stage.id] }))
                      }
                    >
                      {expanded[stage.id]
                        ? "Restrânge lista"
                        : `Vezi încă ${projects.length - 5} proiecte`}
                    </Button>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2" aria-label="Lista proiectelor">
          {filtered.map((p) => (
            <ProjectListRow key={p.id} project={p} />
          ))}
        </div>
      )}
      {!filtered.length && (
        <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          Nu există proiecte pentru selecția curentă. Ajustează căutarea sau
          filtrele.
        </div>
      )}
    </section>
  );
}
