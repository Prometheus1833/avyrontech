import { describe, it, expect } from "vitest";
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

const env = {
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

  it("passes assets and /api/* straight through", async () => {
    expect(decide(new URL("https://avyron.ro/api/contact/demo")).kind).toBe("api");
    expect(decide(new URL("https://avyron.ro/assets/app.js")).kind).toBe("asset");
    expect((await get("/robots.txt")).status).toBe(200);
  });
});
