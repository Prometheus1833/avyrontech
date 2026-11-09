/** Repeatable offline inventory and evidence/reference validation. Never deploys,
 * authenticates, activates providers, changes resources, or asserts compliance. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { securityInventory } from "./security-readiness.mjs";
import { checkTrackedSecrets } from "./check-secret-hygiene.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8");
export const STATUSES = new Set([
  "PASS",
  "FAIL",
  "FIXED",
  "NOT_APPLICABLE",
  "NOT_VERIFIED",
  "ACCEPTED_EXCEPTION",
]);
export function parseCsv(text) {
  const rows = [];
  let row = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(value);
      value = "";
    } else if (c === "\n" && !quoted) {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw Error("Unclosed CSV value");
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [keys, ...data] = rows;
  return data
    .filter((r) => r.length > 1)
    .map((values) =>
      Object.fromEntries(keys.map((key, i) => [key, values[i] || ""])),
    );
}
export function validateEvidence(catalog, matrix, report) {
  const ids = new Map(catalog.requirements.map((r) => [r.id, r]));
  const seen = new Set();
  const errors = [];
  if (
    catalog.standard !== "OWASP ASVS 5.0.0" ||
    ids.size !== 345 ||
    !/^[a-f0-9]{64}$/.test(catalog.source_sha256)
  )
    errors.push("Invalid official ASVS catalog");
  for (const row of matrix) {
    const requirement = ids.get(row.official_id);
    if (
      !requirement ||
      row.requirement_id !== `v5.0.0-${row.official_id.slice(1)}` ||
      Number(row.level) !== requirement.level ||
      seen.has(row.official_id) ||
      !STATUSES.has(row.status)
    )
      errors.push(`Invalid matrix row: ${row.official_id}`);
    seen.add(row.official_id);
    if (["PASS", "FIXED"].includes(row.status) && !row.evidence)
      errors.push(`Missing evidence: ${row.official_id}`);
  }
  if (seen.size !== ids.size) errors.push("Incomplete ASVS matrix");
  for (const match of report.matchAll(/v5\.0\.0-(\d+\.\d+\.\d+)/g))
    if (!ids.has("V" + match[1]))
      errors.push(`Unknown ASVS requirement: ${match[0]}`);
  for (const status of STATUSES)
    if (!report.includes(status))
      errors.push(`Missing status definition: ${status}`);
  return errors;
}
export function auditSnapshot() {
  const catalog = JSON.parse(read("docs/audits/asvs-5.0.0-catalog.json"));
  const matrix = parseCsv(read("docs/audits/ASVS_5_0_0_MATRIX.csv"));
  const report = read("docs/audits/AVYRON_SECURITY_AUDIT.md");
  const inventory = securityInventory(root);
  const configs = [
    "wrangler.jsonc",
    "wrangler.worker.jsonc",
    "cloudflare/workers/email/wrangler.jsonc",
  ].map((path) => {
    const config = ts.parseConfigFileTextToJson(path, read(path)).config;
    const names = (field, key) => config[field]?.map((row) => row[key]) || [];
    return {
      path,
      name: config.name,
      compatibilityDate: config.compatibility_date,
      workersDev: config.workers_dev ?? "provider default",
      routes:
        config.routes?.map((r) => (typeof r === "string" ? r : r.pattern)) ||
        [],
      d1: names("d1_databases", "database_name"),
      r2: names("r2_buckets", "bucket_name"),
      kvBindings: names("kv_namespaces", "binding"),
      services: names("services", "service"),
      durableObjects:
        config.durable_objects?.bindings?.map((r) => r.class_name) || [],
      queues: config.queues?.consumers?.map((r) => r.queue) || [],
      workflows: names("workflows", "name"),
      aiBinding: Boolean(config.ai),
      securityFlags: Object.fromEntries(
        [
          "APP_ENV",
          "MFA_AUTH_ENABLED",
          "ADMIN_MFA_POLICY",
          "BACKUP_JOBS_ENABLED",
          "PAID_AI_ENABLED",
          "ALLOW_AI_OVERAGE",
          "SECURITY_BOUNDARY_MODE",
        ]
          .filter((k) => k in (config.vars || {}))
          .map((k) => [k, config.vars[k]]),
      ),
    };
  });
  const unpinnedActions = [];
  for (const file of [
    ".github/workflows/verify.yml",
    ".github/workflows/security.yml",
    ".github/workflows/cabinet-avocatura.yml",
  ])
    for (const match of read(file).matchAll(/uses:\s*([^\s#]+)/g))
      if (!/@[a-f0-9]{40}$/.test(match[1]))
        unpinnedActions.push({
          file,
          action: match[1],
          scope: file.includes("cabinet-")
            ? "separate project; no modification"
            : "AVYRON",
        });
  const statuses = Object.fromEntries(
    [...STATUSES].map((s) => [
      s,
      matrix.filter((row) => row.status === s).length,
    ]),
  );
  return {
    format: "avyron-security-quality-audit/v1",
    generatedAt: new Date().toISOString(),
    assurance:
      "inventory and reference integrity only; not compliance certification",
    errors: validateEvidence(catalog, matrix, report),
    secretFindings: checkTrackedSecrets(root),
    asvs: {
      version: "5.0.0",
      requirements: matrix.length,
      l2Target: matrix.filter((row) => Number(row.level) <= 2).length,
      statuses,
    },
    configs,
    unpinnedActions,
    inventory,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (
    args.length &&
    !(
      args.length === 2 &&
      args[0] === "--output" &&
      args[1] &&
      !args[1].startsWith("--")
    )
  )
    throw Error("Only --output FILE is supported; no remote/apply/deploy mode");
  const result = auditSnapshot();
  const index = process.argv.indexOf("--output");
  if (index >= 0) {
    const path = resolve(process.argv[index + 1]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(result, null, 2) + "\n", {
      mode: 0o600,
    });
  }
  console.log(
    JSON.stringify({
      format: result.format,
      errors: result.errors,
      secretFindings: result.secretFindings,
      asvs: result.asvs,
      endpoints: result.inventory.endpoints.length,
      panels: result.inventory.panels.length,
      unpinnedActions: result.unpinnedActions,
    }),
  );
  if (result.errors.length || result.secretFindings.length)
    process.exitCode = 1;
}
