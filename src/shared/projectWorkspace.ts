import { projectStage, type ProjectStage } from "./projectLifecycle";
import { projectKindLabel, type ProjectSummary } from "./projectSummary";

export type ProjectFilters = {
  query: string;
  stage: ProjectStage | "all";
  kind: string;
  client: string;
  collection: "current" | "archived";
  sort: "updated" | "name" | "deadline";
};
export const defaultProjectFilters = (): ProjectFilters => ({
  query: "",
  stage: "all",
  kind: "all",
  client: "all",
  collection: "current",
  sort: "updated",
});
export const isArchivedProject = (p: ProjectSummary) =>
  ["archived", "cancelled"].includes(p.status);
const normalized = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro-RO");
export function visibleProjects(
  rows: ProjectSummary[],
  filters: ProjectFilters,
  includeStage = true,
) {
  const words = normalized(filters.query.trim()).split(/\s+/).filter(Boolean);
  return rows
    .filter(
      (p) =>
        isArchivedProject(p) === (filters.collection === "archived") &&
        (!includeStage ||
          filters.stage === "all" ||
          projectStage(p) === filters.stage) &&
        (filters.kind === "all" || p.kind === filters.kind) &&
        (filters.client === "all" ||
          (filters.client === "unassigned"
            ? !p.client_id
            : p.client_id === filters.client)) &&
        words.every((word) =>
          normalized(
            [
              p.name,
              p.slug,
              p.client_name,
              p.service_names,
              projectKindLabel(p.kind),
              p.url,
            ]
              .filter(Boolean)
              .join(" "),
          ).includes(word),
        ),
    )
    .sort((a, b) => {
      const result =
        filters.sort === "name"
          ? a.name.localeCompare(b.name, "ro-RO")
          : filters.sort === "deadline"
            ? (a.planned_end_at ?? Number.MAX_SAFE_INTEGER) -
              (b.planned_end_at ?? Number.MAX_SAFE_INTEGER)
            : b.updated_at - a.updated_at;
      return result || a.id.localeCompare(b.id);
    });
}
