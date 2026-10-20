import { describe, expect, it } from "vitest";
import { normalizeLoginPhone, uniqueStaffPhoneMatch } from "../../cloudflare/workers/api/src/authPolicy";

describe("staff phone identifiers", () => {
  it("treats Romanian local and international formats as the same number", () => {
    expect(normalizeLoginPhone("0722 123 456")).toBe("40722123456");
    expect(normalizeLoginPhone("+40 (722) 123-456")).toBe("40722123456");
    expect(normalizeLoginPhone("0040 722 123 456")).toBe("40722123456");
    expect(normalizeLoginPhone("0044 20 7946 0958")).toBe("442079460958");
  });

  it("rejects malformed input and ambiguous account matches", () => {
    expect(normalizeLoginPhone("admin@example.com")).toBeNull();
    expect(normalizeLoginPhone("123")).toBeNull();
    expect(normalizeLoginPhone("++40722123456")).toBeNull();
    const candidates = [{ id: "first", phone: "+40 722 123 456" }, { id: "second", phone: "0722 123 456" }];
    expect(uniqueStaffPhoneMatch(candidates, "0040722123456")).toBeNull();
    expect(uniqueStaffPhoneMatch(candidates.slice(0, 1), "0722 123 456")?.id).toBe("first");
  });
});
