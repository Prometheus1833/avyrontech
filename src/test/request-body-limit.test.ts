// @vitest-environment node
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppBindings } from "../../cloudflare/workers/api/src/types";
import { apiBodyLimitBytes, enforceApiBodyLimit } from "../../cloudflare/workers/api/src/requestBodyLimit";

describe("API request body limit", () => {
  const app = new Hono<AppBindings>();
  app.use("/api/*", enforceApiBodyLimit);
  app.post("/api/test", async (c) => c.json({ received: (await c.req.text()).length }));

  it("counts streamed bytes even when Content-Length is falsely small", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024 * 1024));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const request = new Request("https://example.test/api/test", {
      method: "POST", headers: { "content-length": "1" }, body, duplex: "half",
    } as RequestInit);
    const response = await app.fetch(request, {} as AppBindings["Bindings"]);
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: { code: "payload_too_large" } });
  });

  it("preserves a legitimate small request", async () => {
    const response = await app.request("/api/test", { method: "POST", body: "hello" }, {} as AppBindings["Bindings"]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: 5 });
  });

  it("reserves explicit limits for upload routes", () => {
    expect(apiBodyLimitBytes("/api/projects/p/media")).toBe(16 * 1024 * 1024);
    expect(apiBodyLimitBytes("/api/contact/demo")).toBe(21 * 1024 * 1024);
    expect(apiBodyLimitBytes("/api/auth/login")).toBe(1024 * 1024);
  });
});
