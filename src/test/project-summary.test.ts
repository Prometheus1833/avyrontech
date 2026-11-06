import { categoryForProjectKind } from "../data/subscriptionPlans";
import { describe, it, expect } from "vitest";
import {
  projectBudget,
  projectKindLabel,
  projectPeriod,
  projectStageLabel,
} from "../shared/projectSummary";
describe("Compact project facts", () => {
  it("maps native blogs to the existing subscription catalogue", () => {
    expect(categoryForProjectKind("blog_profesional")?.key).toBe("blog");
  });
  it("preserves a zero agreed budget and redacts finance explicitly", () => {
    expect(projectBudget({ price_ron: 0 })).toContain("0");
    expect(projectBudget({ price_ron: 1234, budget_visible: false })).toBe(
      "Acces financiar restricționat",
    );
    expect(projectBudget({})).toBe("Buget necompletat");
  });
  it("keeps planning dates distinct from the real project stage", () => {
    expect(projectPeriod({})).toBe("Perioadă nestabilită");
    expect(projectPeriod({ planned_end_at: 1801000000000 })).toMatch(
      /^Până la/,
    );
    expect(
      projectStageLabel({ status: "in_progress", banner_status: "testing" }),
    ).toBe("Testare");
    expect(projectKindLabel("blog_profesional")).toBe("Blog profesional");
    expect(projectKindLabel("retele_sociale")).toBe("Pachet social media");
  });
});
