import { describe, expect, it } from "vitest";
import { authBaseForHost, apiBaseForHost } from "@/lib/apiBase";
import { sessionLifetimeSeconds } from "../../cloudflare/workers/api/src/authPolicy";

describe("persistent AVYRON sessions", () => {
  it("persists an opted-in staff or admin session across browser restarts for seven days", () => {
    expect(sessionLifetimeSeconds(["user", "staff"], true)).toBe(7 * 24 * 60 * 60);
    expect(sessionLifetimeSeconds(["user", "admin"], true)).toBe(7 * 24 * 60 * 60);
    expect(sessionLifetimeSeconds(["user"], true, true)).toBe(7 * 24 * 60 * 60);
  });

  it("honors opt-out and keeps normal customer persistence separate", () => {
    expect(sessionLifetimeSeconds(["staff"], false)).toBe(12 * 60 * 60);
    expect(sessionLifetimeSeconds(["user"], true)).toBe(30 * 24 * 60 * 60);
  });
});

describe("first-party navigation session", () => {
  it("uses one host-only refresh cookie service across public, www and account while retaining same-origin business routes", () => {
    for (const host of ["avyron.ro", "www.avyron.ro", "app.avyron.ro"]) {
      expect(authBaseForHost(host)).toBe("https://api.avyron.ro");
      expect(apiBaseForHost(host)).toBe("");
    }
    expect(authBaseForHost("localhost", "http://localhost:8787/")).toBe("http://localhost:8787");
    expect(authBaseForHost("worker.avyrontech.workers.dev")).toBe("");
  });
});
