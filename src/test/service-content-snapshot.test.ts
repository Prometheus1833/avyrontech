// @vitest-environment node
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, expect, it } from "vitest";
import manifest from "../shared/serviceContentManifest.json";
const exec = promisify(execFile);
let server: Server | undefined;
let directory: string | undefined;
afterEach(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => (error ? reject(error) : resolve())),
    );
  server = undefined;
  if (directory) await rm(directory, { recursive: true, force: true });
});
async function fixture(invalid = false) {
  directory = await mkdtemp(join(tmpdir(), "avyron-service-snapshot-"));
  const output = join(directory, "published.json");
  let authorizationSeen = false;
  server = createServer((request, response) => {
    authorizationSeen ||= !!request.headers.authorization;
    response.setHeader("content-type", "application/json");
    const overview = request.url?.endsWith("/overview");
    response.end(
      JSON.stringify({
        revision: overview ? 2 : 0,
        values: overview
          ? invalid
            ? { "unknown.private.field": "invalid" }
            : {
                [Object.keys(manifest.overview.values)[0]]:
                  "Text public verificat",
              }
          : {},
      }),
    );
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw Error("Fixture port unavailable");
  return {
    output,
    authorizationSeen: () => authorizationSeen,
    run: () =>
      exec(process.execPath, ["scripts/snapshot-service-content.mjs"], {
        env: {
          ...process.env,
          SERVICE_CONTENT_SNAPSHOT_API: `http://127.0.0.1:${address.port}`,
          SERVICE_CONTENT_SNAPSHOT_OUTPUT: output,
          SERVICE_CONTENT_SNAPSHOT_SKIP: "0",
        },
      }),
  };
}
it("build snapshot reads public text without credentials and excludes drafts and identities", async () => {
  const f = await fixture();
  await f.run();
  const result = JSON.parse(await readFile(f.output, "utf8"));
  expect(Object.keys(result)).toEqual(["overview"]);
  expect(result.overview.revision).toBe(2);
  expect(JSON.stringify(result)).not.toContain("actor");
  expect(f.authorizationSeen()).toBe(false);
});
it("build snapshot rejects unrecognized fields rather than injecting them into prerender", async () => {
  const f = await fixture(true);
  await expect(f.run()).rejects.toThrow();
  await expect(readFile(f.output, "utf8")).rejects.toThrow();
});
