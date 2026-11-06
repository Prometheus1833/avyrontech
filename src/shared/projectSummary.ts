import { projectStage, PROJECT_STAGES } from "./projectLifecycle";
export const PROJECT_KIND_LABELS = {
  website_prezentare: "Site Prezentare Profesional",
  prezentare_premium: "Prezentare premium",
  magazin_online: "Magazin online",
  retele_sociale: "Pachet social media",
  blog_profesional: "Blog profesional",
  identitate_completa: "Identitate completă",
  aplicatie: "Aplicație web / mobilă",
  external_asset: "Proiect / produs extern",
} as const;
export type ProjectSummary = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  banner_status?: string | null;
  url: string | null;
  updated_at: number;
  created_at?: number;
  client_id?: string | null;
  client_name?: string | null;
  service_names?: string | null;
  price_ron?: number | null;
  price_eur?: number | null;
  budget_visible?: boolean;
  planned_start_at?: number | null;
  planned_end_at?: number | null;
  member_count?: number;
};
export const projectKindLabel = (kind: string) =>
  PROJECT_KIND_LABELS[kind as keyof typeof PROJECT_KIND_LABELS] ||
  kind ||
  "Tip nespecificat";
export const projectStageLabel = (
  project: Pick<ProjectSummary, "status" | "banner_status">,
) => PROJECT_STAGES.find((s) => s.id === projectStage(project))!.label;
const date = (value: number) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(value);
export function projectPeriod(
  p: Pick<ProjectSummary, "planned_start_at" | "planned_end_at">,
) {
  if (p.planned_start_at != null && p.planned_end_at != null)
    return `${date(p.planned_start_at)} – ${date(p.planned_end_at)}`;
  if (p.planned_start_at != null) return `Din ${date(p.planned_start_at)}`;
  if (p.planned_end_at != null) return `Până la ${date(p.planned_end_at)}`;
  return "Perioadă nestabilită";
}
export function projectBudget(
  p: Pick<ProjectSummary, "price_ron" | "price_eur" | "budget_visible">,
) {
  if (p.budget_visible === false) return "Acces financiar restricționat";
  const values = [
    ["RON", p.price_ron],
    ["EUR", p.price_eur],
  ] as const;
  return (
    values
      .filter(
        ([, value]) => typeof value === "number" && Number.isFinite(value),
      )
      .map(([currency, value]) =>
        new Intl.NumberFormat("ro-RO", {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(value!),
      )
      .join(" · ") || "Buget necompletat"
  );
}
