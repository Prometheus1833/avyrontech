import { sectionsFor, type Access, type SectionId } from "./access";
import { DASHBOARD_SECTION_META } from "../components/dashboard/dashboardNavigation";
import { SERVICE_PAGES } from "../shared/servicePagePolicy";
export type DashboardCommand = {
  key: string;
  section: SectionId;
  label: string;
  hint: string;
  group: string;
  search: string;
  params?: Record<string, string>;
};
export const normalizeDashboardSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro");
export function dashboardCommands(access: Access): DashboardCommand[] {
  const sections = sectionsFor(access).filter((s) => s.navigation !== false);
  const commands: DashboardCommand[] = sections.map((s) => {
    const meta = DASHBOARD_SECTION_META[s.id];
    return {
      key: s.id,
      section: s.id,
      label: meta.label,
      hint: meta.hint,
      group: s.group,
      search: normalizeDashboardSearch(
        `${meta.label} ${meta.commandLabel} ${meta.hint} ${s.keywords.join(" ")}`,
      ),
    };
  });
  if (sections.some((s) => s.id === "servicii-avyron"))
    for (const page of SERVICE_PAGES.filter((p) => p.key !== "overview"))
      commands.push({
        key: `service:${page.key}`,
        section: "servicii-avyron",
        label: page.name,
        hint: "Configurarea paginii și ofertei serviciului",
        group: "servicii",
        search: normalizeDashboardSearch(
          `${page.name} serviciu configurare pagina oferta`,
        ),
        params: { service: page.key, serviceGroup: "" },
      });
  return commands;
}
export function rankDashboardCommands(
  commands: DashboardCommand[],
  query: string,
  recent: string[],
  current: SectionId,
) {
  const normalized = normalizeDashboardSearch(query.trim()),
    terms = normalized.split(/\s+/).filter(Boolean);
  const common = [
    "projects",
    "leads",
    "intern",
    "documents",
    "finance",
    "ai-os",
    "clients",
  ];
  const group = commands.find((c) => c.section === current)?.group;
  const score = (c: DashboardCommand) => {
    const title = normalizeDashboardSearch(c.label);
    if (terms.length)
      return (
        (title === normalized ? 1000 : 0) +
        (title.startsWith(normalized) ? 300 : 0) +
        terms.reduce((n, t) => n + (title.includes(t) ? 50 : 10), 0) +
        (recent.includes(c.key) ? 3 : 0)
      );
    const visited = recent.indexOf(c.key),
      preferred = common.indexOf(c.section);
    return (
      (visited >= 0 ? 300 - visited * 10 : 0) +
      (c.group === group ? 20 : 0) +
      (preferred >= 0 ? 100 - preferred * 5 : 0) -
      (c.key === current ? 150 : 0)
    );
  };
  return commands
    .filter((c) => terms.every((t) => c.search.includes(t)))
    .sort((a, b) => score(b) - score(a) || a.label.localeCompare(b.label, "ro"))
    .slice(0, 8);
}
