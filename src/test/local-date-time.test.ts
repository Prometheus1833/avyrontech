// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatLocalDateTime } from "@/lib/localDateTime";

describe("landing local date and time", () => {
  const instant = new Date("2026-09-28T11:05:42.000Z");

  it("uses the selected language and the user's time zone without seconds", () => {
    const result = formatLocalDateTime(instant, "ro", "Europe/Bucharest");
    expect(result.time).toBe("14:05");
    expect(result.time).not.toContain("42");
    expect(result.date).toContain("28");
    expect(result.city).toBe("București");
  });

  it("adapts the same instant to another location", () => {
    const result = formatLocalDateTime(instant, "en", "America/New_York");
    expect(result.time).toBe("07:05");
    expect(result.city).toBe("New York");
  });
});
