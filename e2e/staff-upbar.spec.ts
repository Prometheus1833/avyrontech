import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { staffFixture } from "./staff-fixtures";
async function setup(
  page: Page,
  role: "platform_owner" | "vibe_dev" | "avy_contabil" = "platform_owner",
  client = false,
) {
  await staffFixture(page, { role });
  if (client)
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        json: {
          user: {
            id: "self",
            email: "client@example.test",
            display_name: "Client A",
            must_change_password: 0,
          },
          profile: { display_name: "Client A", theme: "dark" },
          roles: ["user"],
          superadmin: false,
          capabilities: [],
        },
      }),
    );
  const writes: {
      path: string;
      body: Record<string, unknown>;
      key?: string;
    }[] = [],
    reads: string[] = [];
  let fail = false;
  const projects = [
    {
      id: "pa",
      slug: "project-a",
      name: "Proiect A",
      kind: "website_prezentare",
      status: "active",
      member_count: 2,
      banner_status: "in_progress",
      updated_at: 1,
      url: null,
      favicon_url: null,
    },
    {
      id: "pb",
      slug: "project-b",
      name: "Proiect B",
      kind: "aplicatie",
      status: "active",
      member_count: 1,
      banner_status: "testing",
      updated_at: 2,
      url: null,
      favicon_url: null,
    },
  ];
  const messages: Record<string, Record<string, unknown>[]> = {
    pa: [
      {
        id: "ma",
        author_id: "peer",
        author_name: "Anișoara Test",
        content: "Bun venit în proiectul A",
        created_at: 1000,
      },
    ],
    pb: [
      {
        id: "mb",
        author_id: "client-b",
        author_name: "Client B",
        content: "Mesajul proiectului B",
        created_at: 2000,
      },
    ],
  };
  await page.route("**/api/projects*", (r) => {
    const u = new URL(r.request().url());
    reads.push(u.pathname + u.search);
    return r.fulfill({
      json: { data: projects.slice(0, 1), sales: [], purchases: [] },
    });
  });
  await page.route("**/api/project-chat/**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    reads.push(path);
    if (path.endsWith("/projects"))
      return r.fulfill({
        json: {
          data: projects.slice(0, client ? 1 : 2).map((p) => ({
            ...p,
            last_content: null,
            last_at: null,
            unread: 1,
          })),
          canWrite: true,
        },
      });
    const id = path.split("/")[3];
    if (r.request().method() === "POST") {
      const body = r.request().postDataJSON();
      writes.push({
        path,
        body,
        key: r.request().headers()["idempotency-key"],
      });
      if (fail && path.endsWith("/messages")) {
        fail = false;
        return r.fulfill({
          status: 503,
          json: {
            error: { code: "unavailable", message: "Rețea indisponibilă" },
          },
        });
      }
      if (path.endsWith("/messages"))
        messages[id].push({
          id: crypto.randomUUID(),
          author_id: "self",
          author_name: "Eu",
          content: body.content,
          created_at: Date.now(),
        });
      return r.fulfill({ json: { id: "saved" } });
    }
    return r.fulfill({ json: { data: messages[id] || [] } });
  });
  return {
    writes,
    reads,
    setFailure: () => {
      fail = true;
    },
  };
}
test("staff gets direct INTERN OS and a focused personal menu without marketing or duplicated shortcuts", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/");
  const header = page.locator("header").first();
  await expect(
    header.getByRole("link", { name: "Deschide INTERN OS" }),
  ).toHaveAttribute("href", "/profil?tab=overview");
  await expect(
    header.getByRole("button", { name: /accesul rapid AVYRON OS/ }),
  ).toHaveCount(0);
  expect(f.reads.filter((p) => p.startsWith("/api/project-chat"))).toEqual([]);
  await header.getByRole("button", { name: "Profil", exact: true }).click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "Proiecte AI", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Financiar", exact: true }),
  ).toHaveAttribute("href", "/profil?tab=finance");
  for (const route of [
    "/servicii",
    "/despre-noi",
    "/cariere",
    "/profil?tab=intern",
    "/profil?tab=maintenance",
    "/profil?tab=client-maintenance",
    "/profil?tab=projects",
    "/profil?tab=resources",
  ])
    expect(await menu.locator(`a[href="${route}"]`).count()).toBe(0);
  await page.keyboard.press("Escape");
  await header.getByRole("link", { name: "Deschide INTERN OS" }).click();
  await expect(page).toHaveURL(/tab=overview/);
});
test("finance and AI shortcuts follow granular rank permissions", async ({
  page,
}) => {
  await setup(page, "avy_contabil");
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Deschide INTERN OS" }),
  ).toHaveAttribute("href", "/profil?tab=finance");
  await expect(
    page.getByRole("button", { name: "Deschide mesaje", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Proiectele mele", exact: true }),
  ).toHaveCount(0);
  await page
    .locator("header")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  const menu = page.getByRole("menu");
  await expect(
    menu.getByRole("menuitem", { name: "Financiar", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("menuitem", { name: "Proiecte AI", exact: true }),
  ).toHaveCount(0);
});
test("My Projects requests only involvement scope and opens the native pipeline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const f = await setup(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Proiectele mele", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Proiectele mele" });
  await expect(d.getByRole("link", { name: /Proiect A/ })).toBeVisible();
  await expect(d.getByRole("link", { name: /Proiect B/ })).toHaveCount(0);
  expect(f.reads).toContain("/api/projects?scope=mine");
  await d.getByLabel("Caută în proiectele mele").fill("neexistent");
  await expect(d.getByText(/Nu există proiecte alocate/)).toBeVisible();
  await d.getByRole("link", { name: /pipeline/ }).click();
  await expect(page).toHaveURL(/tab=projects&scope=mine/);
  await expect
    .poll(() => f.reads.filter((p) => p === "/api/projects?scope=mine").length)
    .toBeGreaterThan(1);
  await expect(
    page.getByRole("heading", { name: "Proiectele mele", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Vezi toate proiectele autorizate" })
    .click();
  await expect(page).not.toHaveURL(/scope=mine/);
  await expect.poll(() => f.reads.includes("/api/projects")).toBe(true);
});
test("resources are differentiated links to canonical libraries and templates", async ({
  page,
}) => {
  await setup(page, "vibe_dev");
  await page.goto("/");
  await page.getByRole("button", { name: "Resurse și template-uri" }).click();
  const d = page.getByRole("dialog");
  await expect(d.getByRole("link", { name: /Tipizate/ })).toHaveAttribute(
    "href",
    "/profil?tab=documents&documentView=templates",
  );
  await expect(d.getByRole("link", { name: /Documente STAFF/ })).toBeVisible();
  await expect(d.getByRole("link", { name: /Documente SC/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(d).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Resurse și template-uri" }),
  ).toBeFocused();
});
test("messenger panel supports team DM and project clients with explicit shared context", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Deschide mesaje", exact: true })
    .click();
  const d = page.getByRole("dialog", { name: "Mesaje" });
  await d.getByRole("button", { name: /Anișoara Test/ }).click();
  await d.getByLabel("Mesaj", { exact: true }).fill("Mesaj coleg");
  await d.getByRole("button", { name: "Trimite", exact: true }).click();
  await expect(d).toBeVisible();
  await d
    .getByRole("button", { name: "Proiecte și clienți", exact: true })
    .click();
  await d
    .getByRole("navigation", { name: "Proiecte autorizate" })
    .getByRole("button", { name: /Proiect A/ })
    .click();
  await expect(d.getByText("Bun venit în proiectul A")).toBeVisible();
  await d.getByLabel("Mesaj pentru proiect").fill("Mesaj pentru client");
  await d.getByRole("button", { name: "Trimite mesaj în proiect" }).click();
  await expect(
    d.getByText("Mesaj pentru client", { exact: true }),
  ).toBeVisible();
  expect(
    f.writes.find((w) => w.path === "/api/project-chat/pa/messages"),
  ).toMatchObject({ body: { content: "Mesaj pentru client" } });
  expect(
    f.writes.find((w) => w.path === "/api/project-chat/pa/messages")?.key,
  ).toBeTruthy();
  await expect(page).not.toHaveURL(/dm=/);
});
test("failed send keeps text and idempotency key; project switching isolates drafts and messages", async ({
  page,
}) => {
  const f = await setup(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Deschide mesaje", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d
    .getByRole("button", { name: "Proiecte și clienți", exact: true })
    .click();
  const projects = d.getByRole("navigation", { name: "Proiecte autorizate" });
  await projects.getByRole("button", { name: /Proiect A/ }).click();
  await expect(d.getByText("Bun venit în proiectul A")).toBeVisible();
  await d.getByLabel("Mesaj pentru proiect").fill("Ciornă A");
  await projects.getByRole("button", { name: /Proiect B/ }).click();
  await expect(d.getByText("Mesajul proiectului B")).toBeVisible();
  await expect(d.getByText("Bun venit în proiectul A")).toHaveCount(0);
  await expect(d.getByLabel("Mesaj pentru proiect")).toHaveValue("");
  await projects.getByRole("button", { name: /Proiect A/ }).click();
  await expect(d.getByLabel("Mesaj pentru proiect")).toHaveValue("Ciornă A");
  await expect(d.getByText("Bun venit în proiectul A")).toBeVisible();
  f.setFailure();
  await d.getByRole("button", { name: "Trimite mesaj în proiect" }).click();
  await expect(d.getByRole("alert")).toContainText("Rețea indisponibilă");
  await expect(d.getByLabel("Mesaj pentru proiect")).toHaveValue("Ciornă A");
  await d.getByRole("button", { name: "Trimite mesaj în proiect" }).click();
  await expect(d.getByLabel("Mesaj pentru proiect")).toHaveValue("");
  const sent = f.writes.filter(
    (w) => w.path === "/api/project-chat/pa/messages",
  );
  expect(sent).toHaveLength(2);
  expect(sent[0].key).toBe(sent[1].key);
});
test("client gets project chat without staff directory or team channel requests", async ({
  page,
}) => {
  const f = await setup(page, "platform_owner", true),
    requested: string[] = [];
  page.on("request", (r) => requested.push(new URL(r.url()).pathname));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Deschide INTERN OS" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Deschide mesaje proiecte" }).click();
  const d = page.getByRole("dialog");
  await expect(
    d.getByRole("button", { name: "Echipă", exact: true }),
  ).toHaveCount(0);
  await d
    .getByRole("navigation", { name: "Proiecte autorizate" })
    .getByRole("button", { name: /Proiect A/ })
    .click();
  await expect(d.getByText("Bun venit în proiectul A")).toBeVisible();
  await d.getByLabel("Mesaj pentru proiect").fill("Confirmare client");
  await d.getByRole("button", { name: "Trimite mesaj în proiect" }).click();
  await expect(d.getByText("Confirmare client", { exact: true })).toBeVisible();
  expect(requested.filter((p) => p.startsWith("/api/workspace/chat"))).toEqual(
    [],
  );
  expect(f.reads).toContain("/api/project-chat/projects");
  await d.getByRole("link", { name: /centrul de mesaje/ }).click();
  await expect(
    page.getByRole("heading", { name: "Mesaje proiecte", exact: true }),
  ).toBeVisible();
});
for (const width of [320, 390, 768, 1024, 1440])
  test(`staff header and mini dashboard fit ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    for (const path of ["/", "/en", "/profil?tab=profile"]) {
      await page.goto(path);
      if (path.includes("profil")) {
        await expect(
          page.getByRole("heading", { name: /Profilul meu|My profile/ }),
        ).toBeVisible();
      } else
        await expect(
          page.getByRole("link", { name: "Deschide INTERN OS" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const trigger = page.getByRole("button", {
        name: "Deschide mesaje",
        exact: true,
      });
      await expect(trigger).toBeVisible();
      const box = (await trigger.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await trigger.click();
      const d = page.getByRole("dialog", { name: "Mesaje" });
      await expect(d).toBeVisible();
      const b = (await d.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
      expect(b.height).toBeLessThan(900);
      await d
        .getByRole("button", { name: "Proiecte și clienți", exact: true })
        .click();
      await d
        .getByRole("navigation", { name: "Proiecte autorizate" })
        .getByRole("button", { name: /Proiect A/ })
        .click();
      await expect(d.getByText("Bun venit în proiectul A")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(
          `${path.includes("profil") ? "dashboard" : path === "/en" ? "en" : "web"}-${width}.png`,
        ),
      });
      if (width === 1440 && path === "/") {
        const require = createRequire(import.meta.url);
        await page.addScriptTag({
          content: readFileSync(require.resolve("axe-core/axe.min.js"), "utf8"),
        });
        const serious = await page.evaluate(async () => {
          const { violations } = await (
            window as unknown as {
              axe: {
                run: (
                  scope: unknown,
                ) => Promise<{ violations: { id: string; impact: string }[] }>;
              };
            }
          ).axe.run(document.querySelector("[role=dialog]"));
          return violations
            .filter((v) => ["serious", "critical"].includes(v.impact))
            .map((v) => v.id);
        });
        expect(serious).toEqual([]);
      }
      await page.keyboard.press("Escape");
      await expect(d).toBeHidden();
    }
  });
