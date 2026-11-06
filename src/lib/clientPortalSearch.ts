import { internApi } from "./internApi";
import { documentsApi } from "./documentsApi";
import {
  normalizeDashboardSearch,
  type DashboardCommand,
} from "./dashboardSearch";
export async function clientPortalSearch(query: string) {
  const terms = normalizeDashboardSearch(query.trim())
    .split(/\s+/)
    .filter(Boolean);
  const results = await Promise.allSettled([
    internApi.listProjects(true),
    documentsApi.list(new URLSearchParams({ q: query.trim(), sort: "recent" })),
  ]);
  const commands: DashboardCommand[] = [];
  if (results[0].status === "fulfilled")
    for (const p of results[0].value.data
      .filter((p) =>
        terms.every((t) =>
          normalizeDashboardSearch(
            `${p.name} ${p.client_name || ""} ${p.service_names || ""}`,
          ).includes(t),
        ),
      )
      .slice(0, 4))
      commands.push({
        key: `project:${p.id}`,
        section: "projects",
        label: p.name,
        hint: `Proiect · ${p.client_name || "Contul tău"}`,
        group: "projects",
        search: normalizeDashboardSearch(p.name),
        href: `/intern/projects/${encodeURIComponent(p.slug)}`,
      });
  if (results[1].status === "fulfilled")
    for (const d of results[1].value.data.slice(0, 4))
      commands.push({
        key: `document:${d.id}`,
        section: "documents",
        label: d.title,
        hint: `Document · ${d.number}`,
        group: "projects",
        search: normalizeDashboardSearch(d.title),
        params: { document: d.id },
      });
  return { commands, partial: results.some((r) => r.status === "rejected") };
}
