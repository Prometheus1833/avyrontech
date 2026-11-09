import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rules = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  [
    "github_token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  ],
  ["stripe_live_key", /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g],
  ["cloudflare_service_secret", /\bcfast_[A-Za-z0-9]{48}\b/g],
  ["aws_access_key", /\bAKIA[A-Z0-9]{16}\b/g],
];
export function secretFindings(text) {
  return rules.flatMap(([kind, expression]) =>
    [...text.matchAll(expression)].map((match) => ({
      kind,
      line: text.slice(0, match.index).split("\n").length,
    })),
  );
}
export function checkTrackedSecrets(base = process.cwd()) {
  const files = execFileSync("git", ["ls-files", "-z"], {
    cwd: base,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const findings = [];
  for (const file of files) {
    if (
      /(^|\/)(?:\.env|\.dev\.vars)(?:\.|$)/.test(file) &&
      !/\.(example|sample|template)$/.test(file)
    )
      findings.push({ file, kind: "tracked_environment_file", line: 1 });
    let buffer;
    try {
      buffer = readFileSync(resolve(base, file));
    } catch {
      continue;
    }
    if (buffer.includes(0)) continue;
    for (const finding of secretFindings(buffer.toString("utf8")))
      findings.push({ file, ...finding });
  }
  return findings;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const findings = checkTrackedSecrets();
  // Report locations and classes only, never credential values or source lines.
  console.log(JSON.stringify({ findings }));
  if (findings.length) process.exitCode = 1;
}
