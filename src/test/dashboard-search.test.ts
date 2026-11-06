import { describe, it, expect } from "vitest";
import { buildAccess, SECTIONS } from "../lib/access";
import {
  dashboardCommands,
  rankDashboardCommands,
} from "../lib/dashboardSearch";
import {
  simpleConversationReply,
  isConversationFollowup,
} from "../../cloudflare/workers/api/src/publicConversation";
const owner = buildAccess({ roles: ["admin"], superadmin: true });
describe("Dashboard navigation search", () => {
  it("places finance in Principal and the public chatbot directly above reviews", () => {
    expect(SECTIONS.find((s) => s.id === "finance")?.group).toBe("overview");
    expect(SECTIONS.find((s) => s.id === "ai-os")).toMatchObject({
      group: "platform",
    });
    expect(SECTIONS.findIndex((s) => s.id === "reviews")).toBe(
      SECTIONS.findIndex((s) => s.id === "ai-os") + 1,
    );
  });
  it("matches all terms without accents and opens the specific native service configuration", () => {
    const commands = dashboardCommands(owner);
    const match = rankDashboardCommands(
      commands,
      "site prezentare",
      [],
      "overview",
    );
    expect(match[0]).toMatchObject({
      section: "servicii-avyron",
      params: { service: "premium-website" },
    });
    expect(
      rankDashboardCommands(commands, "fINAncIAr", [], "overview")[0].section,
    ).toBe("finance");
    expect(
      rankDashboardCommands(commands, "mentenanta", [], "overview").length,
    ).toBeGreaterThan(0);
    expect(
      rankDashboardCommands(commands, "site inexistent987", [], "overview"),
    ).toEqual([]);
  });
  it("filters suggestions and stale recents by current server-derived access", () => {
    const client = dashboardCommands(buildAccess({ roles: ["user"] }));
    for (const id of ["finance", "ai-os", "reviews", "antivirus", "team-staff"])
      expect(client.some((c) => c.section === id)).toBe(false);
    expect(
      rankDashboardCommands(client, "", ["finance", "ai-os"], "overview").every(
        (c) => client.includes(c),
      ),
    ).toBe(true);
    const accountant = dashboardCommands(
      buildAccess({ roles: ["staff"], capabilities: ["finance.read"] }),
    );
    expect(accountant.some((c) => c.section === "finance")).toBe(true);
    expect(accountant.some((c) => c.section === "ai-os")).toBe(false);
  });
  it("recognizes only standalone social responses and Romanian follow-ups", () => {
    expect(simpleConversationReply("Bună ziua!", "ro")).toContain("Bună");
    expect(simpleConversationReply("Mulțumesc frumos!", "ro")).toContain(
      "Cu plăcere",
    );
    expect(
      simpleConversationReply("Bună, explică fotosinteza", "ro"),
    ).toBeNull();
    expect(isConversationFollowup("Și cât costă?")).toBe(true);
  });
});
