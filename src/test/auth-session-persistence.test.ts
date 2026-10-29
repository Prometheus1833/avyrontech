import { describe, expect, it } from "vitest";
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
