export const PROJECT_STAGES = [
  { id: "proposed", label: "Propus", banner: "proposed", status: "lead" },
  { id: "in_progress", label: "În dezvoltare", banner: "in_progress", status: "in_progress" },
  { id: "testing", label: "Testare", banner: "testing", status: "in_progress" },
  { id: "completed", label: "Finalizat", banner: "online", status: "live" },
] as const;
export type ProjectStage = typeof PROJECT_STAGES[number]["id"];
export function projectStage(project: { banner_status?: string | null; status?: string | null }): ProjectStage {
  const known = PROJECT_STAGES.find(stage => stage.banner === project.banner_status);
  if (known) return known.id;
  if (project.banner_status === "revizuire") return "testing";
  if (["live", "completed", "done"].includes(project.status || "")) return "completed";
  return project.status === "lead" || project.banner_status === "offline" ? "proposed" : "in_progress";
}
