import { expect, it } from "vitest";
import { accountDisplayName } from "@/lib/accountDisplayName";

const user = { display_name: null, username: null, email: "ana@example.test" };
const profile = { display_name: "Ana Popescu", company_name: null, entity_type: "individual" as const, phone: null };
it("uses the account name without adding a client role or duplicating contact data", () => {
  expect(accountDisplayName(user, profile, "Contul meu")).toBe("Ana Popescu");
});
it.each(["srl", "pfa", "ii", "other"] as const)("identifies a %s account by its existing company name", entity_type => {
  expect(accountDisplayName(user, { ...profile, entity_type, company_name: "Studio Exemplu" }, "Contul meu")).toBe("Studio Exemplu");
});
it("keeps the staff member's name ahead of company information", () => {
  expect(accountDisplayName(user, { ...profile, entity_type: "srl", company_name: "AVYRON" }, "Contul meu", true)).toBe("Ana Popescu");
});
it.each(["Client", " Client… ", "Cont client", "Client AVYRON", "Customer", "Utilizator"])("replaces the generic label %s with the account email", display_name => {
  expect(accountDisplayName(user, { ...profile, display_name }, "Contul meu")).toBe(user.email);
});
it("removes a role prefix while retaining the actual name", () => {
  expect(accountDisplayName(user, { ...profile, display_name: "Client: Ana Popescu" }, "Contul meu")).toBe("Ana Popescu");
});
it("preserves Client when it is part of an actual company name", () => {
  expect(accountDisplayName(user, { ...profile, entity_type: "srl", company_name: "Client Solutions S.R.L." }, "Contul meu")).toBe("Client Solutions S.R.L.");
});
it("supports the existing account name and username while the profile is incomplete", () => {
  expect(accountDisplayName({ ...user, display_name: "Anișoara" }, null, "Contul meu")).toBe("Anișoara");
  expect(accountDisplayName({ ...user, username: "avyrontech" }, null, "Contul meu")).toBe("avyrontech");
});
it("falls back to phone and a neutral label only when no other identity exists", () => {
  expect(accountDisplayName({ ...user, email: "" }, { ...profile, display_name: "Client", phone: "+40 712 345 678" }, "Contul meu")).toBe("+40 712 345 678");
  expect(accountDisplayName({ ...user, email: "" }, null, "My account")).toBe("My account");
});
