import { describe, it, expect, vi } from "vitest";
import { buildAccess, canOpenSection, sectionsFor } from "../lib/access";
import { dashboardCommands } from "../lib/dashboardSearch";
import { dashboardSectionMeta } from "../components/dashboard/dashboardNavigation";
const client = buildAccess({ roles: ["user"] });
describe("Client portal boundary and navigation", () => {
  it("keeps only one recurring entry with a compact client section order", () => {
    const sections = sectionsFor(client);
    expect(
      sections.filter((s) => s.group === "projects").map((s) => s.id),
    ).toEqual([
      "projects",
      "catalog",
      "subscriptions",
      "payments",
      "documents",
      "collection",
    ]);
    expect(sections.some((s) => s.id === "client-maintenance")).toBe(false);
    for (const id of [
      "maintenance",
      "library",
      "resources",
      "clients",
      "antivirus",
      "ai-os",
      "staff-tickets",
    ])
      expect(canOpenSection(id, client)).toBe(false);
    expect(dashboardSectionMeta("subscriptions", true).label).toBe(
      "Mentenanță / Abonamente",
    );
    expect(dashboardSectionMeta("documents", true).hint).not.toContain(
      "Agenție",
    );
  });
  it("never suggests the internal libraries or AVY Core to normal clients", () => {
    const commands = dashboardCommands(client);
    expect(
      commands.some(
        (c) =>
          c.section === "maintenance" || c.section === "client-maintenance",
      ),
    ).toBe(false);
    expect(
      commands.map((c) => `${c.label} ${c.hint} ${c.search}`).join(" "),
    ).not.toMatch(
      /bibliotecă agenție|avy core|tipizate|generator|documente staff/i,
    );
  });
  it("preserves staff and owner internal section access", () => {
    const owner = buildAccess({ roles: ["admin"], superadmin: true });
    expect(canOpenSection("maintenance", owner)).toBe(true);
    expect(sectionsFor(owner).some((s) => s.id === "client-maintenance")).toBe(
      true,
    );
    expect(dashboardSectionMeta("documents", false).hint).toContain(
      "Bibliotecă Agenție",
    );
  });
});
vi.mock("../lib/internApi", () => ({ internApi: { listProjects: vi.fn() } }));
vi.mock("../lib/documentsApi", () => ({ documentsApi: { list: vi.fn() } }));
import { internApi } from "../lib/internApi";
import { documentsApi } from "../lib/documentsApi";
import { clientPortalSearch } from "../lib/clientPortalSearch";
describe("Authorized client search", () => {
  it("uses personal project scope and server-filtered documents, with safe internal navigation", async () => {
    vi.mocked(internApi.listProjects).mockResolvedValue({
      data: [
        {
          id: "p",
          slug: "project/a",
          name: "Proiect Cafenea",
          kind: "website_prezentare",
          status: "active",
          url: null,
          updated_at: 1,
        },
      ],
    });
    vi.mocked(documentsApi.list).mockResolvedValue({
      data: [{ id: "doc", title: "Contract cafenea", number: "D-1" }] as never,
      total: 1,
      nextOffset: null,
    });
    const result = await clientPortalSearch("cafenea");
    expect(internApi.listProjects).toHaveBeenCalledWith(true);
    expect(result.commands[0].href).toBe("/intern/projects/project%2Fa");
    expect(result.commands[1]).toMatchObject({
      section: "documents",
      params: { document: "doc" },
    });
    expect(result.partial).toBe(false);
  });
  it("retains accessible results and reports partial failure without inventing documents", async () => {
    vi.mocked(internApi.listProjects).mockResolvedValue({ data: [] });
    vi.mocked(documentsApi.list).mockRejectedValue(new Error("unavailable"));
    const result = await clientPortalSearch("cafenea");
    expect(result).toEqual({ commands: [], partial: true });
  });
});
