// @vitest-environment node
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { expect, it } from "vitest";
const run = promisify(execFile);

it("checks the effective catalog and refuses to rewrite a historical migration", async () => {
  const path = "cloudflare/d1/migrations/0033_produse_catalog_seed.sql";
  const before = readFileSync(path, "utf8");
  const checked = await run(process.execPath, ["scripts/produse-catalog-sql.mjs", "--check"]);
  expect(checked.stdout).toContain("catalog D1: la zi");
  await expect(run(process.execPath, ["scripts/produse-catalog-sql.mjs"]))
    .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining("Migrațiile istorice sunt nemodificabile") });
  expect(readFileSync(path, "utf8")).toBe(before);
});
