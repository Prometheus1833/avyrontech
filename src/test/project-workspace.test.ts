import { describe, it, expect } from "vitest";
import {
  defaultProjectFilters,
  visibleProjects,
} from "../shared/projectWorkspace";
import { projectStage } from "../shared/projectLifecycle";
import type { ProjectSummary } from "../shared/projectSummary";
const row = (
  id: string,
  extra: Partial<ProjectSummary> = {},
): ProjectSummary => ({
  id,
  slug: id,
  name: id,
  kind: "website_prezentare",
  status: "in_progress",
  url: null,
  updated_at: 1,
  ...extra,
});
const rows = [
  row("a", {
    name: "Șantier Nord",
    client_id: "c1",
    client_name: "Beneficiar Unu",
    service_names: "SEO tehnic",
    banner_status: "testing",
    updated_at: 4,
  }),
  row("b", {
    name: "Blog finalizat",
    kind: "blog_profesional",
    status: "completed",
    banner_status: "online",
    updated_at: 5,
  }),
  row("c", { status: "archived", banner_status: "online" }),
  row("d", { status: "cancelled" }),
  row("e", { status: "lead", planned_end_at: 9 }),
];
describe("Project workspace source shared by pipeline and list", () => {
  it("keeps completed projects in both views and isolates archived/cancelled projects", () => {
    const filtered = visibleProjects(rows, defaultProjectFilters());
    expect(filtered.map((p) => p.id)).toEqual(["b", "a", "e"]);
    expect(
      filtered.filter((p) => projectStage(p) === "completed").map((p) => p.id),
    ).toEqual(["b"]);
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        collection: "archived",
      }).map((p) => p.id),
    ).toEqual(["c", "d"]);
  });
  it("combines accent-insensitive search with exact client/type/stage constraints", () => {
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        query: "santier SEO",
        client: "c1",
        stage: "testing",
      }).map((p) => p.id),
    ).toEqual(["a"]);
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        query: "santier SEO",
        client: "c1",
        stage: "completed",
      }),
    ).toEqual([]);
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        kind: "blog_profesional",
      }).map((p) => p.id),
    ).toEqual(["b"]);
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        client: "unassigned",
      }).map((p) => p.id),
    ).toEqual(["b", "e"]);
  });
  it("keeps stage counts within other filters and sorts missing deadlines last without mutating input", () => {
    const before = rows.map((p) => p.id);
    expect(
      visibleProjects(rows, {
        ...defaultProjectFilters(),
        sort: "deadline",
      }).map((p) => p.id),
    ).toEqual(["e", "a", "b"]);
    expect(
      visibleProjects(
        rows,
        { ...defaultProjectFilters(), client: "c1", stage: "completed" },
        false,
      ).map((p) => p.id),
    ).toEqual(["a"]);
    expect(rows.map((p) => p.id)).toEqual(before);
  });
});
