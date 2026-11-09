import { createRequire } from "node:module";
import { expect, type Page } from "@playwright/test";
export async function checkWorkspaceAccessibility(
  page: Page,
  selector: string,
) {
  await page.addScriptTag({
    path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  });
  const violations = await page.evaluate(async (selector) => {
    const axe = (window as typeof window & { axe: typeof import("axe-core") })
      .axe;
    const result = await axe.run(document.querySelector(selector)!, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    }));
  }, selector);
  expect(violations).toEqual([]);
}
