import ts from "typescript";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const methods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "all",
  "use",
]);
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(dir, entry.name))
      : [join(dir, entry.name)],
  );
}
/** Inventory is evidence for review, not a claim that static middleware proves authorization. */
export function securityInventory(base = root) {
  const endpoints = [],
    middleware = [];
  for (const path of files(join(base, "cloudflare/workers/api/src")).filter(
    (p) => p.endsWith(".ts") && !p.endsWith(".d.ts"),
  )) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function walk(node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        methods.has(node.expression.name.text)
      ) {
        const [first, ...handlers] = node.arguments;
        if (
          first &&
          ts.isStringLiteral(first) &&
          first.text.startsWith("/api")
        ) {
          const row = {
            method: node.expression.name.text.toUpperCase(),
            path: first.text,
            file: relative(base, path),
            line:
              source.getLineAndCharacterOfPosition(node.getStart(source)).line +
              1,
            handlers: handlers.map((handler) =>
              ts.isIdentifier(handler)
                ? handler.text
                : ts.isCallExpression(handler) &&
                    ts.isIdentifier(handler.expression)
                  ? handler.expression.text
                  : "inline",
            ),
          };
          (row.method === "USE" ? middleware : endpoints).push(row);
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  const panels = [];
  for (const path of files(join(base, "src")).filter((p) =>
    p.endsWith(".tsx"),
  )) {
    const source = ts.createSourceFile(
      path,
      readFileSync(path, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function walk(node) {
      if (
        ts.isJsxAttribute(node) &&
        node.name.getText(source) === "path" &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        /^\/(intern|admin|staff|profil|finance)(\/|$)/.test(
          node.initializer.text,
        )
      )
        panels.push({
          path: node.initializer.text,
          file: relative(base, path),
        });
      ts.forEachChild(node, walk);
    }
    walk(source);
  }
  return {
    schemaVersion: 1,
    endpoints,
    middleware,
    panels,
    limitations: [
      "Dynamic routes and parent mounts require runtime negative tests.",
      "An inventory entry is not proof of protection or provider configuration.",
    ],
  };
}

const hostname = (value) =>
  typeof value === "string" &&
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value);
export function securityPlan(config) {
  if (
    !hostname(config.adminHostname) ||
    !/^[a-z0-9-]+$/.test(config.workerName || "")
  )
    throw Error("Invalid project destination");
  const groups = ["administrators", "staff", "collaborators"];
  const applications = [
    {
      type: "self_hosted",
      name: config.workerName + " administration",
      domain: config.adminHostname,
      session_duration: "8h",
      policies: groups.flatMap((name) => {
        const emails = config.identities?.[name] || [];
        if (
          !Array.isArray(emails) ||
          emails.some(
            (email) =>
              typeof email !== "string" ||
              !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
          )
        )
          throw Error("Invalid explicit identity list");
        return emails.length
          ? [
              {
                name,
                decision: "allow",
                include: emails.map((email) => ({ email: { email } })),
              },
            ]
          : [];
      }),
    },
  ];
  const checks = {
    freePlanVerified: config.validation?.freePlanVerified === true,
    identityPilotVerified: config.validation?.identityPilotVerified === true,
    emergencyRecoveryVerified:
      config.validation?.emergencyRecoveryVerified === true,
    integrationsAndAlternativeUrlsVerified:
      config.validation?.integrationsAndAlternativeUrlsVerified === true,
    accessConfigured:
      /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(
        config.teamDomain || "",
      ) && /^[A-Za-z0-9_-]{16,256}$/.test(config.audience || ""),
    identitiesDefined: applications[0].policies.some(
      (p) => p.name === "administrators",
    ),
  };
  return {
    schemaVersion: 1,
    status: "prepared_not_applied",
    checks,
    readyForEnforce: Object.values(checks).every(Boolean),
    targetWorker: config.workerName,
    applications,
    route: { pattern: config.adminHostname, custom_domain: true },
    vars: {
      SECURITY_BOUNDARY_MODE: "observe",
      ADMIN_HOSTNAME: config.adminHostname,
      SECURITY_ACCESS_TEAM_DOMAIN: config.teamDomain || "",
      SECURITY_ACCESS_AUD: config.audience || "",
    },
    frontend: { VITE_ADMIN_HOSTNAME: config.adminHostname },
    afterValidationOnly: {
      workers_dev: false,
      preview_urls: false,
      SECURITY_BOUNDARY_MODE: "enforce",
    },
    serviceIdentityPolicy:
      "Create separate Service Auth policies with exact token IDs; bind each to a native user account with scoped routes. No admin role is generated.",
    rollback: {
      SECURITY_BOUNDARY_MODE: "off",
      instruction:
        "Restore the previous configuration; no D1 rollback or cookie deletion is necessary.",
    },
    mfa: "preparation_only_no_activation",
    externalEffects: [],
  };
}
export function privateOutput(path, value) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  chmodSync(path, 0o600);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, ...args] = process.argv.slice(2);
  const option = (key) => args[args.indexOf(key) + 1];
  if (args.some((arg) => arg === "--apply" || arg === "--deploy"))
    throw Error(
      "This command only prepares plans; it never changes Cloudflare.",
    );
  const result =
    command === "inventory"
      ? securityInventory()
      : command === "plan" && args.includes("--config")
        ? securityPlan(JSON.parse(readFileSync(option("--config"), "utf8")))
        : null;
  if (!result)
    throw Error(
      "Usage: security-readiness.mjs inventory|plan --config FILE [--output PRIVATE_FILE]",
    );
  if (args.includes("--output")) privateOutput(option("--output"), result);
  // Never echo operator email lists or a private plan into CI logs.
  console.log(
    JSON.stringify(
      command === "inventory"
        ? {
            endpoints: result.endpoints.length,
            middleware: result.middleware.length,
            panels: result.panels.length,
          }
        : {
            status: result.status,
            targetWorker: result.targetWorker,
            checks: result.checks,
            readyForEnforce: result.readyForEnforce,
          },
    ),
  );
}
