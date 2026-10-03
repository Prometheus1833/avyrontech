import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argumentIndex = process.argv.indexOf("--out");
const outputRoot = argumentIndex >= 0 && process.argv[argumentIndex + 1]
  ? resolve(process.argv[argumentIndex + 1])
  : join(repositoryRoot, ".backups", "avyron-social-studio");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDirectory = join(outputRoot, timestamp);
const skillRoot = join(homedir(), ".codex", "skills", "avyron-social-studio");

const sources = [
  join(repositoryRoot, "config", "avyron-social-studio.json"),
  join(repositoryRoot, "docs", "AVYRON_SOCIAL_STUDIO_BACKUP.md"),
  join(repositoryRoot, "cloudflare", "d1", "migrations", "0035_avyron_social_orchestration.sql"),
  join(repositoryRoot, "cloudflare", "d1", "migrations", "0036_social_studio_free_credit_policy.sql"),
  join(repositoryRoot, "cloudflare", "d1", "migrations", "0037_social_audience_optimizer.sql"),
  join(repositoryRoot, "cloudflare", "d1", "migrations", "0038_social_studio_library_backup.sql"),
  join(repositoryRoot, "cloudflare", "d1", "migrations", "0039_social_facebook_canonical_links.sql"),
  join(repositoryRoot, "cloudflare", "workers", "api", "src", "aiProjects.ts"),
  join(repositoryRoot, "cloudflare", "workers", "api", "src", "socialStudioScheduler.ts"),
  join(repositoryRoot, "cloudflare", "workers", "api", "src", "socialStudioBackup.ts"),
  join(repositoryRoot, "cloudflare", "workers", "api", "src", "socialAudienceOptimizer.ts"),
  join(repositoryRoot, "src", "lib", "aiProjectsApi.ts"),
  join(repositoryRoot, "src", "pages", "intern", "AiProjectPage.tsx"),
  join(repositoryRoot, "src", "test", "social-studio-scheduler.test.ts"),
  join(repositoryRoot, "src", "test", "social-studio-backup.test.ts"),
  join(repositoryRoot, "src", "test", "social-audience-optimizer.test.ts"),
  join(skillRoot, "SKILL.md"),
  join(skillRoot, "references", "platform-playbook.md"),
  join(skillRoot, "references", "avyron-os-integration.md"),
];

const destinationFor = (source) => source.startsWith(skillRoot)
  ? join(outputDirectory, "codex-skill", relative(skillRoot, source))
  : join(outputDirectory, "repository", relative(repositoryRoot, source));

await mkdir(outputDirectory, { recursive: true });
const files = [];
for (const source of sources) {
  const destination = destinationFor(source);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination);
  const bytes = await readFile(destination);
  files.push({
    path: relative(outputDirectory, destination),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

const git = (...args) => spawnSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).stdout.trim();
const manifest = {
  format: "avyron-social-studio-local-backup",
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  repository: basename(repositoryRoot),
  git: { head: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"), dirty: Boolean(git("status", "--porcelain")) },
  exclusions: ["access tokens", "refresh tokens", "cookies", "browser sessions", "connector secrets", "private messages"],
  files,
};
await writeFile(join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
await writeFile(
  join(outputDirectory, "checksums.sha256"),
  `${files.map((file) => `${file.sha256}  ${file.path}`).join("\n")}\n`,
  { mode: 0o600 },
);

process.stdout.write(`${outputDirectory}\n`);
