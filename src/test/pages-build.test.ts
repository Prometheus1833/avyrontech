import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const bundle = resolve(process.cwd(), "dist/_worker.js");
const pagesSuite = existsSync(bundle) ? describe : describe.skip;

pagesSuite("Cloudflare Pages advanced-mode bundle", () => {
  const files: Record<string, string> = {
    "/costurisiproduse/index.html": "<h1>pricing</h1>",
    "/produse/website-prezentare-premium/index.html": "<h1>product</h1>",
    "/404.html": "<h1>404</h1>",
    "/_shell.html": "<div id=root></div>",
  };

  async function get(path: string) {
    const { default: worker } = await import(`${pathToFileURL(bundle).href}?test=pages`);
    const env = {
      ASSETS: {
        async fetch(req: Request) {
          const pathname = new URL(req.url).pathname;
          const key = files[pathname] === undefined
            ? `${pathname.replace(/\/$/, "")}/index.html`
            : pathname;
          return files[key] === undefined
            ? new Response("missing", { status: 404 })
            : new Response(files[key], { status: 200 });
        },
      },
      API: { fetch: async () => new Response("ok") },
    };
    return worker.fetch(new Request(`https://avyron.ro${path}`), env);
  }

  it("contains the same redirect and status semantics used in production", async () => {
    const redirect = await get("/costuri");
    expect(redirect.status).toBe(301);
    expect(new URL(redirect.headers.get("location")!).pathname).toBe("/costurisiproduse");

    expect((await get("/produse/website-prezentare-premium")).status).toBe(200);

    const missing = await get("/pagina-inexistenta");
    expect(missing.status).toBe(404);
    expect(missing.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
