import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { staffFixture } from "./staff-fixtures";
import {
  blankCollaborator,
  type Collaborator,
  type CollaboratorFile,
} from "../src/shared/collaborators";
const initial: Collaborator = {
  ...blankCollaborator(),
  id: "partner-a",
  code: "AVP-ABCDEF1234",
  name: "Cabinet juridic sintetic",
  category: "legal",
  relationship: "partner",
  status: "active",
  contactName: "Contact demonstrativ",
  email: "partner@example.test",
  phone: "+40 700 000 000",
  whatsapp: "+40 700 000 000",
  specialization: "Consultanță contractuală",
  summary: "Asistență juridică pentru proiectele agenției.",
  terms: "Responsabilități convenite pentru colaborarea demonstrativă.",
  internalNotes: "NOTĂ INTERNĂ AVYRON",
  clientId: null,
  accountUserId: null,
  revision: 1,
  archivedAt: null,
  createdAt: 1,
  updatedAt: 1,
  fileCount: 0,
  canManage: true,
  canUpload: true,
};
async function setup(page: Page, portal = false, configured = false) {
  await staffFixture(page);
  if (portal) {
    await page.route("**/api/auth/refresh", (r) =>
      r.fulfill({
        json: {
          access_token: "synthetic-local",
          expires_in: 900,
          user: { id: "self", roles: ["user"] },
        },
      }),
    );
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: {
          user: {
            id: "self",
            email: "partner@example.test",
            display_name: "Colaborator sintetic",
            email_verified: 1,
            must_change_password: 0,
          },
          profile: {
            id: "self",
            display_name: "Colaborator sintetic",
            entity_type: "individual",
            language: "ro",
            theme: "dark",
          },
          roles: ["user"],
          capabilities: [],
          superadmin: false,
          hasCollaborations: true,
          isAgencyPartner: true,
        },
      }),
    );
  }
  const rows = [{ ...initial }];
  let files: CollaboratorFile[] = [],
    unavailable = false;
  const mutations: { path: string; body: unknown; key: string | undefined }[] =
    [];
  const own = (c: Collaborator): Collaborator => {
    if (!portal) return c;
    const {
      internalNotes,
      accountUserId,
      accountEmail,
      clientId,
      clientName,
      ...rest
    } = c;
    return { ...rest, canManage: false };
  };
  for (const mask of [
    "**/api/collaborators**",
    "**/api/collaborations/**",
    "**/api/my/collaborations**",
  ])
    await page.route(mask, async (r) => {
      const u = new URL(r.request().url()),
        path = u.pathname,
        m = r.request().method();
      if (unavailable && m === "GET")
        return r.fulfill({
          status: 503,
          json: {
            error: {
              code: "unavailable",
              message: "Date indisponibile temporar",
            },
          },
        });
      if (path.endsWith("/options"))
        return r.fulfill({
          json: {
            clients: [
              {
                id: "client-a",
                name: "Client existent",
                email: "partner@example.test",
                contactName: "Client contact",
                phone: "",
              },
            ],
            accounts: [
              {
                id: "account-a",
                name: "Cont verificat",
                email: "partner@example.test",
              },
            ],
          },
        });
      if (
        (path === "/api/collaborators" && m === "GET") ||
        path === "/api/my/collaborations"
      )
        return r.fulfill({
          json: {
            data: rows
              .filter(
                (c) =>
                  (u.searchParams.get("category") || c.category) ===
                    c.category &&
                  (!u.searchParams.get("q") ||
                    c.name.includes(u.searchParams.get("q")!)),
              )
              .map(own),
            total: rows.length,
            canManage: !portal,
          },
        });
      if (path === "/api/collaborators" && m === "POST") {
        const b = r.request().postDataJSON();
        mutations.push({
          path,
          body: b,
          key: r.request().headers()["idempotency-key"],
        });
        const c = {
          ...initial,
          ...b.input,
          id: "partner-new",
          code: "AVP-NEW1234567",
        };
        rows.push(c);
        return r.fulfill({ status: 201, json: { id: c.id, code: c.code } });
      }
      const id = path.split("/")[3],
        c = rows.find((c) => c.id === id);
      if (!c)
        return r.fulfill({
          status: 404,
          json: { error: { code: "not_found" } },
        });
      if (path.endsWith("/files") && m === "POST") {
        mutations.push({
          path,
          body: {
            visible: u.searchParams.get("visible"),
            bytes: r.request().postDataBuffer()?.length,
          },
          key: r.request().headers()["idempotency-key"],
        });
        files.push({
          id: "file-" + files.length,
          name: r.request().headers()["x-file-name"] || "synthetic.pdf",
          contentType: "application/pdf",
          size: 30,
          visible: portal || u.searchParams.get("visible") === "1",
          createdAt: 1,
          uploadedByMe: true,
          ready: true,
          canRemove: true,
        });
        c.fileCount = files.length;
        c.revision++;
        return r.fulfill({
          status: 201,
          json: { id: files.at(-1)!.id, status: "clean_scanned" },
        });
      }
      if (path.includes("/files/") && m === "GET")
        return r.fulfill({
          body: "%PDF-1.7\nSynthetic fixture",
          headers: { "Content-Type": "application/pdf" },
        });
      if (path.includes("/files/") && m === "PATCH") {
        const b = r.request().postDataJSON();
        mutations.push({
          path,
          body: b,
          key: r.request().headers()["idempotency-key"],
        });
        files = files.filter((f) => f.id !== path.split("/").pop());
        c.fileCount = files.length;
        c.revision++;
        return r.fulfill({ json: { ok: true } });
      }
      if (m === "PATCH") {
        const b = r.request().postDataJSON();
        mutations.push({
          path,
          body: b,
          key: r.request().headers()["idempotency-key"],
        });
        Object.assign(c, b.input, {
          revision: c.revision + 1,
          archivedAt: b.archived ? 1 : null,
        });
        return r.fulfill({ json: { ok: true } });
      }
      return r.fulfill({
        json: {
          collaborator: own(c),
          files,
          uploadBlock: configured ? null : "compliance_blocked",
        },
      });
    });
  return {
    mutations,
    get rows() {
      return rows;
    },
    setUnavailable: (b: boolean) => {
      unavailable = b;
    },
    setFiles: (f: CollaboratorFile[]) => {
      files = f;
      rows[0].fileCount = f.length;
    },
  };
}
test("new directory is the final Principal button, with compact contact cards and safe contact links", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=collaborators");
  await expect(
    page.getByRole("heading", { name: "Colaboratori/Parteneri", exact: true }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", {
    name: "Navigare AVYRON OS",
    exact: true,
  });
  const order = await nav.locator("[data-os-section]").allTextContents();
  expect(order.findIndex((v) => v.trim() === "Colaboratori/Parteneri")).toBe(
    order.findIndex((v) => v.trim() === "Antivirus") + 1,
  );
  const card = page
    .locator("article")
    .filter({ hasText: "Cabinet juridic sintetic" });
  await expect(
    card.getByRole("link", { name: "Apel", exact: true }),
  ).toHaveAttribute("href", "tel:+40700000000");
  await expect(
    card.getByRole("link", { name: "WhatsApp", exact: true }),
  ).toHaveAttribute("href", "https://wa.me/40700000000");
  await expect(
    card.getByRole("link", { name: "E-mail", exact: true }),
  ).toHaveAttribute("href", /^mailto:/);
  await card
    .getByRole("button", { name: "Deschide fișa colaboratorului" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("AVP-ABCDEF1234");
  await expect(
    page
      .getByRole("navigation", { name: "Zone fișă colaborator" })
      .getByRole("button"),
  ).toHaveCount(3);
});
test("creates an informational collaborator without CRM or account and then opens the generated record", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=collaborators");
  await page
    .getByRole("button", { name: "Adaugă colaborator", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d
    .getByLabel("Nume / denumire *", { exact: true })
    .fill("Expert financiar nou");
  await d.getByLabel("Domeniu", { exact: true }).selectOption("financial");
  await d.getByRole("button", { name: "Salvează fișa" }).click();
  await expect(d).toContainText("AVP-NEW1234567");
  expect(f.mutations[0].body).toMatchObject({
    input: {
      name: "Expert financiar nou",
      clientId: null,
      accountUserId: null,
    },
  });
});
test("account association is optional, explicit and confirmed; internal notes are edited only in the staff sheet", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=collaborators");
  await page
    .getByRole("button", { name: "Deschide fișa colaboratorului" })
    .click();
  const d = page.getByRole("dialog");
  await d
    .getByLabel("Caută clientul sau contul", { exact: true })
    .fill("partner@example.test");
  await d
    .getByLabel("Cont AVYRON (opțional)", { exact: true })
    .selectOption("account-a");
  await expect(d.getByRole("button", { name: "Salvează fișa" })).toBeDisabled();
  await d
    .getByRole("checkbox", { name: /Confirm actualizarea accesului/ })
    .check();
  await d.getByRole("button", { name: "Colaborare", exact: true }).click();
  await d
    .getByLabel("Note interne AVYRON", { exact: true })
    .fill("Notă privată actualizată");
  await d.getByRole("button", { name: "Salvează fișa" }).click();
  await expect.poll(() => f.mutations.length).toBe(1);
  expect(f.mutations[0].body).toMatchObject({
    accountConfirmed: true,
    input: {
      accountUserId: "account-a",
      internalNotes: "Notă privată actualizată",
    },
  });
});
test("unconfigured confidential scanning clearly blocks uploads without sending a file", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/profil?tab=collaborators");
  await page
    .getByRole("button", { name: "Deschide fișa colaboratorului" })
    .click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Documente (0/3)", exact: true }).click();
  await expect(d.getByText(/Încărcările sunt blocate/)).toBeVisible();
  await expect(d.getByLabel("Adaugă document", { exact: true })).toBeDisabled();
  expect(f.mutations).toEqual([]);
});
test("partner sees only their shared record, uploads and downloads through the private file endpoint", async ({
  page,
}) => {
  const f = await setup(page, true, true);
  await page.goto("/profil?tab=my-collaborations");
  await expect(
    page.getByRole("heading", { name: "Colaborările mele", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adaugă colaborator", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Deschide fișa colaboratorului" })
    .click();
  const d = page.getByRole("dialog");
  await expect(d.getByRole("button", { name: "Salvează fișa" })).toHaveCount(0);
  await d.getByRole("button", { name: "Colaborare", exact: true }).click();
  await expect(d).not.toContainText("NOTĂ INTERNĂ AVYRON");
  await expect(d.getByLabel("Note interne AVYRON")).toHaveCount(0);
  await d.getByRole("button", { name: "Documente (0/3)", exact: true }).click();
  await d.getByLabel("Adaugă document", { exact: true }).setInputFiles({
    name: "partener.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nSynthetic only"),
  });
  await d.getByRole("button", { name: "Încarcă documentul" }).click();
  await expect(
    d.getByRole("button", { name: "Descarcă", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await d.getByRole("button", { name: "Descarcă", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("partener.pdf");
  expect(f.mutations).toHaveLength(1);
});
test("business partner badge and user-menu entry are derived from server identity, not a product plan", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/profil?tab=profile");
  await expect(
    page.getByRole("link", { name: /Avyron Partener/ }),
  ).toBeVisible();
  await page.goto("/");
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(
    page.getByRole("menuitem", { name: "Colaborările mele", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("menu").getByText("Avyron Partener", { exact: true }),
  ).toBeVisible();
});
for (const width of [320, 390, 1440])
  test(`compact partner page and sheet fit ${width}px with accessible controls`, async ({
    page,
  }, info) => {
    await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=collaborators");
    await expect(
      page.getByRole("heading", {
        name: "Colaboratori/Parteneri",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Deschide fișa colaboratorului" })
      .click();
    await expect(
      page.getByRole("dialog").getByLabel("Nume / denumire *", { exact: true }),
    ).toHaveValue(initial.name);
    await expect
      .poll(async () => {
        const box = await page.getByRole("dialog").boundingBox();
        return !!box && box.x >= -1 && box.x + box.width <= width + 1;
      })
      .toBe(true);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Închide", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1440) {
      await page.addScriptTag({
        path: createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
      });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                root: Element,
                options: unknown,
              ) => Promise<{ violations: unknown[] }>;
            };
          }
        ).axe;
        return (
          await axe.run(document.querySelector('[role="dialog"]')!, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations;
      });
      expect(violations).toEqual([]);
    }
    await page.screenshot({
      path: info.outputPath(`collaborators-${width}.png`),
    });
  });
test("network errors are recoverable and ordinary staff cannot discover the directory", async ({
  page,
}) => {
  const f = await setup(page);
  f.setUnavailable(true);
  await page.goto("/profil?tab=collaborators");
  await expect(page.getByRole("alert")).toContainText("Date indisponibile");
  f.setUnavailable(false);
  await page.getByRole("button", { name: "Reîncearcă", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: initial.name, exact: true }),
  ).toBeVisible();
  await page.unrouteAll();
  await staffFixture(page, { role: "vibe_dev" });
  let requests = 0;
  await page.route("**/api/collaborators**", (r) => {
    requests++;
    return r.fulfill({ status: 403, json: { error: { code: "forbidden" } } });
  });
  await page.goto("/profil?tab=collaborators");
  await expect(
    page.getByRole("heading", { name: "Colaboratori/Parteneri", exact: true }),
  ).toHaveCount(0);
  expect(requests).toBe(0);
});
