// @vitest-environment node
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  securityPlan,
  securityInventory,
} from "../../scripts/security-readiness.mjs";
import { secretFindings } from "../../scripts/check-secret-hygiene.mjs";
it("prepares only the chosen existing Worker, without enabling MFA or granting broad access", () => {
  const config = JSON.parse(
    readFileSync("docs/security/security.config.example.json", "utf8"),
  );
  const plan = securityPlan(config);
  expect(plan.status).toBe("prepared_not_applied");
  expect(plan.readyForEnforce).toBe(false);
  expect(plan.externalEffects).toEqual([]);
  expect(plan.applications[0].policies).toEqual([]);
  expect(plan.mfa).toBe("preparation_only_no_activation");
  expect(JSON.stringify(plan)).not.toContain('"everyone"');
  expect(plan.vars.SECURITY_BOUNDARY_MODE).toBe("observe");
  expect(() =>
    securityPlan({ ...config, adminHostname: "https://attacker.test/path" }),
  ).toThrow();
});
it("records literal endpoints, middleware and private panel entries without pretending this proves authorization", () => {
  const inventory = securityInventory();
  expect(
    inventory.endpoints.some((r) => r.path === "/api/auth/logout-all"),
  ).toBe(true);
  expect(
    inventory.middleware.some((r) => r.handlers.includes("requireAuth")),
  ).toBe(true);
  expect(inventory.panels.some((p) => p.path.startsWith("/intern"))).toBe(true);
  expect(inventory.limitations.length).toBeGreaterThan(0);
}, 30000);
it("reports credential locations only and catches modern service-token and private-key formats", () => {
  const value = ["cfast_", "a".repeat(48)].join("");
  const findings = secretFindings("first line\n" + value);
  expect(findings).toEqual([{ kind: "cloudflare_service_secret", line: 2 }]);
  expect(JSON.stringify(findings)).not.toContain(value);
  expect(
    secretFindings(["-----BEGIN ", "PRIVATE KEY-----"].join("")),
  ).toHaveLength(1);
  expect(secretFindings("synthetic-token-placeholder")).toEqual([]);
});
