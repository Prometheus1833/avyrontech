import { describe, expect, it } from "vitest";
import { PORTFOLIO } from "@/data/portfolio";

const requestedProjects = new Map([
  ["Lumina Botez", "https://demo1.avyron.eu"],
  ["VERDIA", "https://demo2.avyron.eu"],
  ["PungiPlast", "https://exemplu1.avyron.eu"],
  ["Detectiv ICM", "https://detectiv-icm.avyron.eu"],
  ["Crăița Dinulescu", "https://dinulescu-craita-consultant-financiar.avyron.eu"],
  ["Tipografia UMC", "https://umc.avyron.eu"],
]);

describe("portfolio carousel", () => {
  it("links every requested project to its live website", () => {
    for (const [name, href] of requestedProjects) {
      expect(PORTFOLIO).toContainEqual(expect.objectContaining({ name, href, external: true }));
    }
  });

  it("presents projects as real businesses, without demo or hosting labels", () => {
    for (const project of PORTFOLIO) {
      expect(`${project.tag.ro} ${project.tag.en} ${project.desc.ro} ${project.desc.en}`)
        .not.toMatch(/\b(?:avyron|demo|exemplu|example)\b/i);
    }
  });
});
