import { describe, it, expect } from "vitest";
import { engagedTime } from "./guestNotifications";
describe("Visible visitor engagement clock", () => {
  it("does not accumulate hidden, unfocused or form-entry time", () => {
    expect(engagedTime(12000, 60000, false)).toBe(12000);
  });
  it("cannot fast-forward after computer sleep or a clock jump", () => {
    expect(engagedTime(12000, 3600000, true)).toBe(13500);
    expect(engagedTime(12000, -1000, true)).toBe(12000);
  });
  it("accumulates normal foreground samples", () => {
    expect(engagedTime(12000, 1000, true)).toBe(13000);
  });
});
