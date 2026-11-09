// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  parseCsv,
  validateEvidence,
} from "../../scripts/audit-security-quality.mjs";
const catalog = JSON.parse(
  readFileSync("docs/audits/asvs-5.0.0-catalog.json", "utf8"),
);
const matrix = parseCsv(
  readFileSync("docs/audits/ASVS_5_0_0_MATRIX.csv", "utf8"),
);
const statuses =
  "PASS FAIL FIXED NOT_APPLICABLE NOT_VERIFIED ACCEPTED_EXCEPTION";
describe("audit reference integrity", () => {
  it("maps all 345 requirements, including the 253 L2 target requirements, without inventing identifiers", () => {
    expect(validateEvidence(catalog, matrix, statuses)).toEqual([]);
    expect(matrix.filter((r) => Number(r.level) <= 2)).toHaveLength(253);
  });
  it("rejects fabricated IDs, invalid statuses and missing evidence", () => {
    for (const patch of [
      { official_id: "V99.9.9" },
      { status: "COMPLIANT" },
      { status: "PASS", evidence: "" },
    ])
      expect(
        validateEvidence(
          catalog,
          [{ ...matrix[0], ...patch }, ...matrix.slice(1)],
          statuses,
        ).length,
      ).toBeGreaterThan(0);
  });
  it("rejects invented requirement links in the report and preserves the MFA exception", () => {
    expect(
      validateEvidence(catalog, matrix, statuses + " v5.0.0-99.1.1").length,
    ).toBeGreaterThan(0);
    expect(matrix.find((r) => r.official_id === "V6.3.3")?.status).toBe(
      "ACCEPTED_EXCEPTION",
    );
  });
  it("parses quoted limitations without dropping columns", () => {
    expect(parseCsv('id,reason\na,"one, two and ""quoted"""\n')).toEqual([
      { id: "a", reason: 'one, two and "quoted"' },
    ]);
  });
});
