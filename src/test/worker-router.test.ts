import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import worker from "@/worker/index";
import { decide } from "@/worker/router";

/** Minimal ASSETS binding: serves the files the prerender build produces. */
const FILES: Record<string, string> = {
  "/index.html": "<html lang=ro><h1>home</h1>",
  "/costurisiproduse/index.html": "<html lang=ro><h1>pricing</h1>",
  "/404.html": "<html lang=ro><h1>404</h1>",
  "/403.html": "<html lang=ro><h1>403</h1>",
  "/500.html": "<html lang=ro><h1>500</h1>",
  "/mentenanta.html": "<html lang=ro><h1>503</h1>",
  "/_shell.html": "<html lang=ro><div id=root></div>",
  "/assets/app.js": "console.log(1)",
  "/robots.txt": "User-agent: *",
};

let apiCalls = 0;

const env = {
  API: {
    async fetch(req: Request) {
      apiCalls += 1;
      return new Response(JSON.stringify({ ok: true, from: "api", url: req.url }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  },
  ASSETS: {
    async fetch(req: Request) {
      const p = new URL(req.url).pathname;
      const key = FILES[p] !== undefined ? p : `${p.replace(/\/$/, "")}/index.html`;
      if (FILES[key] === undefined) return new Response("not found", { status: 404 });
      return new Response(FILES[key], { status: 200 });
    },
  },
};

const get = (path: string) =>
  worker.fetch(new Request(`https://avyron.ro${path}`), env as never);

describe("worker redirects", () => {
  it.each([
    ["/costuri", "/costurisiproduse"],
    ["/despre", "/despre-si-portofoliu"],
    ["/noutati", "/blog"],
  ])("301 %s -> %s", async (from, to) => {
    const res = await get(from);
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")!).pathname).toBe(to);
  });

  it("preserves the query string and does not loop", async () => {
    const res = await get("/costuri?utm_source=google");
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname + loc.search).toBe("/costurisiproduse?utm_source=google");
    expect((await get(loc.pathname)).status).toBe(200);
  });
});

describe("worker HTTP statuses", () => {
  it("returns a hard 404 for unknown routes (no soft 404)", async () => {
    const res = await get("/pagina-inexistenta");
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("404");
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it.each([
    ["/403", 403],
    ["/500", 500],
    ["/mentenanta", 503],
  ])("%s responds %i", async (path, status) => {
    const res = await get(path);
    expect(res.status).toBe(status);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("serves public pages with 200 and no noindex header", async () => {
    const res = await get("/costurisiproduse");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Robots-Tag")).toBeNull();
  });

  it("marks private/auth routes noindex without breaking them", async () => {
    for (const p of ["/auth", "/profil", "/intern/projects/x"]) {
      const res = await get(p);
      expect(res.status).toBe(200);
      expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    }
  });

  it("passes assets straight through", async () => {
    expect(decide(new URL("https://avyron.ro/assets/app.js")).kind).toBe("asset");
    expect((await get("/robots.txt")).status).toBe(200);
  });
});

describe("/api/* service binding", () => {
  it("forwards /api/health to the API binding, not to ASSETS", async () => {
    expect(decide(new URL("https://avyron.ro/api/health")).kind).toBe("api");
    const before = apiCalls;
    const res = await get("/api/health");
    expect(apiCalls).toBe(before + 1);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, from: "api" });
  });

  it("does not rewrite or duplicate the API path", async () => {
    const res = await get("/api/contact/demo?x=1");
    const body = (await res.json()) as { url: string };
    expect(new URL(body.url).pathname + new URL(body.url).search).toBe("/api/contact/demo?x=1");
  });
});

describe("trailing slash normalisation", () => {
  it("301s /costurisiproduse/ -> /costurisiproduse", async () => {
    const res = await get("/costurisiproduse/");
    expect(res.status).toBe(301);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/costurisiproduse");
  });

  it("never redirects back to the trailing-slash form", async () => {
    const res = await get("/costurisiproduse");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("wrangler worker config", () => {
  const cfg = JSON.parse(
    readFileSync(resolve(process.cwd(), "wrangler.worker.jsonc"), "utf8")
      .replace(/^\s*\/\/.*$/gm, ""),
  );

  it("runs the Worker before the asset server", () => {
    expect(cfg.assets.run_worker_first).toBe(true);
  });

  it("uses drop-trailing-slash html handling and no asset fallback", () => {
    expect(cfg.assets.html_handling).toBe("drop-trailing-slash");
    expect(cfg.assets.not_found_handling).toBe("none");
  });

  it("declares the API service binding", () => {
    expect(cfg.services).toContainEqual({ binding: "API", service: "avyrontech" });
  });
});
