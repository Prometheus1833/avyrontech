import { test, expect, type Page } from "@playwright/test";
import { staffFixture } from "./staff-fixtures";
import { SKILL_SEEDS } from "../src/shared/skills/catalog";
import { renderSkillPreview, preparedBrief } from "../src/shared/skills/render";
import { blankBrief, type SkillRun } from "../src/shared/skills/model";
async function setup(page: Page, restricted = false) {
  let blockNext = false;
  await staffFixture(page, restricted ? { role: "vibe_dev" } : {});
  let revision = 1,
    version = 1,
    published = 1,
    summary = SKILL_SEEDS[0].summary,
    instructions = SKILL_SEEDS[0].instructions;
  const runs: SkillRun[] = [],
    keys = new Map<string, string>(),
    calls: { path: string; body: unknown; key?: string }[] = [];
  await page.route("**/api/projects?scope=mine", (r) =>
    r.fulfill({
      json: {
        data: [
          {
            id: "project-a",
            name: "Website existent",
            client_name: "Client existent",
          },
        ],
      },
    }),
  );
  await page.route("**/api/skills/**", async (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      path = u.pathname,
      seed =
        SKILL_SEEDS.find((x) => path.includes("/" + x.slug)) || SKILL_SEEDS[0],
      body = req.method() === "POST" ? req.postDataJSON() : null;
    if (req.method() === "POST")
      calls.push({ path, body, key: req.headers()["idempotency-key"] });
    if (path.endsWith("/runs") && req.method() === "POST") {
      const key = req.headers()["idempotency-key"],
        known = keys.get(key);
      if (known) return route.fulfill({ json: { id: known, status: "ready" } });
      const id = "run-" + (runs.length + 1),
        b = { ...blankBrief(), ...body.brief };
      keys.set(key, id);
      runs.unshift({
        id,
        skill_slug: seed.slug,
        skill_version: published,
        created_by: "self",
        project_id: b.projectId,
        lead_id: b.leadId,
        brief_json: JSON.stringify(b),
        mode: body.mode,
        status: blockNext ? "blocked" : "ready",
        output_md: blockNext ? null : preparedBrief(seed.slug, b, ""),
        preview_html: blockNext ? null : renderSkillPreview(seed.slug, b),
        model: null,
        error_code: blockNext ? "ai_role_daily_limit_exceeded" : null,
        revision: 2,
        created_at: Date.now(),
        updated_at: Date.now(),
        started_at: Date.now() - 50,
        completed_at: Date.now(),
        input_characters: 200,
        output_characters: 900,
      });
      blockNext = false;
      return route.fulfill({
        status: 201,
        json: { id, status: runs[0].status },
      });
    }
    if (path.endsWith("/export")) {
      const r = runs.find((x) => path.includes("/" + x.id + "/"))!;
      if(u.searchParams.get("format")==="svg")return route.fulfill({headers:{"content-type":"image/svg+xml","content-disposition":'attachment; filename="concept.svg"'},body:r.preview_html!.match(/<svg\b[\s\S]*?<\/svg>/g)![Number(u.searchParams.get("direction"))]});
      return route.fulfill({
        headers: {
          "content-type": "text/html",
          "content-disposition": 'attachment; filename="mockup.html"',
        },
        body: r.preview_html!,
      });
    }
    if (path.endsWith("/runs")) return route.fulfill({ json: { data: runs } });
    if (path.includes("/runs/"))
      return route.fulfill({
        json: { run: runs.find((x) => path.endsWith(x.id)) },
      });
    if (path.endsWith("/versions")) {
      revision++;
      version++;
      summary = body.summary;
      instructions = body.instructions;
      return route.fulfill({ json: { ok: true } });
    }
    if (path.endsWith("/approve")) {
      published = version;
      revision++;
      return route.fulfill({ json: { ok: true } });
    }
    if (path.endsWith("/skill.md"))
      return route.fulfill({
        headers: {
          "content-type": "text/markdown",
          "content-disposition": 'attachment; filename="SKILL.md"',
        },
        body: "---\nname: avy-site-builder\n---\n" + instructions,
      });
    return route.fulfill({
      json: {
        slug: seed.slug,
        name: seed.name,
        summary: seed.slug === "site-builder" ? summary : seed.summary,
        instructions:
          seed.slug === "site-builder" ? instructions : seed.instructions,
        current_version: version,
        published_version: published,
        revision,
        paused: 0,
        permissions: {
          read: true,
          use: true,
          manage: true,
          approve: true,
          platform: true,
        },
        resources: [],
        uploadBlock: "compliance_blocked",
        stats: { total: runs.length, queued: 0, ready: runs.length, failed: 0 },
        runtime: {
          queueConfigured: true,
          aiConfigured: true,
          textModel: "registered-primary",
          imageModel: "registered-image",
          imageStatus: "configured",
        },
      },
    });
  });
  return {
    runs,
    calls,
    blockNext: () => {
      blockNext = true;
    },
  };
}
for (const width of [320, 390, 1440])
  test(`Site Builder: brief minimal, mockup și export la ${width}px`, async ({
    page,
  }, testInfo) => {
    const state = await setup(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/profil?tab=skill-site-builder");
    await expect(
      page.getByRole("heading", { name: "Site Builder", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Afacere / viitorul client").fill("Studio Aurora");
    await page
      .getByLabel("Activitate", { exact: true })
      .fill("Beauty și wellness");
    await page.getByLabel("Punct de pornire").selectOption("beauty");
    await page
      .getByRole("button", { name: "Pregătește mockupul", exact: true })
      .click();
    const frame = page.frameLocator('iframe[title="Concept Site Builder"]');
    await expect(frame.getByRole("heading", { level: 1 })).toHaveText(
      "Ritualuri de îngrijire, în ritmul tău.",
    );
    await expect(
      frame.locator('aside[aria-label="Contact rapid"] a'),
    ).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      await frame
        .locator("body")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(state.calls[0].key).toBeTruthy();
    expect(state.runs[0].mode).toBe("template");
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Mockup HTML", exact: true })
      .click();
    expect((await download).suggestedFilename()).toMatch(/\.html$/);
    await page.locator('iframe[title="Concept Site Builder"]').scrollIntoViewIfNeeded();
    await expect(frame.getByRole("heading", { level: 1 })).toBeVisible();
    await page.locator('iframe[title="Concept Site Builder"]').screenshot({
      path: testInfo.outputPath(`avy-skills-preview-${width}.png`),
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`avy-skills-${width}.png`),
      fullPage: true,
    });
  });
test("Modificarea instrucțiunilor creează o ciornă și păstrează rezultatele existente", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/profil?tab=skill-site-builder");
  await page.getByLabel("Afacere / viitorul client").fill("Client viitor");
  await page.getByLabel("Activitate", { exact: true }).fill("Arhitectură");
  await page
    .getByRole("button", { name: "Pregătește mockupul", exact: true })
    .click();
  await expect(page.locator("iframe")).toBeVisible();
  const before = state.runs[0].preview_html;
  await page.getByRole("button", { name: "Instrucțiuni", exact: true }).click();
  await page.getByRole("button", { name: "Editează versiunea" }).click();
  await page
    .getByLabel("Instrucțiuni Markdown")
    .fill(
      "Instrucțiuni revizuite pentru o structură modulară adaptată domeniului. ".repeat(
        3,
      ),
    );
  await page
    .getByRole("button", { name: "Salvează versiunea", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aprobă versiunea", exact: true }),
  ).toBeVisible();
  expect(state.runs[0].preview_html).toBe(before);
  await page
    .getByRole("button", { name: "Aprobă versiunea", exact: true })
    .click();
  await expect(page.getByText("v2", { exact: true })).toBeVisible();
});
test("Resursele explică blocarea uploadurilor, iar monitorizarea separă cloud de Codex local", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/profil?tab=skill-site-builder");
  await page.getByRole("button", { name: "Resurse", exact: true }).click();
  await expect(
    page.getByText(/Upload blocat până la verificarea DPA/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adaugă resursă" }).click();
  await expect(
    page.getByLabel("Document sau imagine · maximum 25 MB"),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Monitorizare", exact: true }).click();
  await expect(
    page.getByText(/Coada cloud poate continua fără Mac/),
  ).toBeVisible();
});
test("Un membru fără drepturi nu vede intrările Avy Skills", async ({
  page,
}) => {
  await setup(page, true);
  await page.goto("/profil?tab=skill-site-builder");
  await expect(
    page.locator('[data-os-section="skill-site-builder"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Site Builder", exact: true }),
  ).toHaveCount(0);
});
test("O eroare nu reia AI automat; relansarea explicită păstrează datele originale", async ({
  page,
}) => {
  const state = await setup(page);
  state.blockNext();
  await page.goto("/profil?tab=skill-site-builder");
  await page.getByLabel("Afacere / viitorul client").fill("Client de reluat");
  await page.getByLabel("Activitate", { exact: true }).fill("Arhitectură");
  await page.getByLabel("Cum pregătim").selectOption("ai");
  await page
    .getByRole("button", { name: "Pregătește mockupul", exact: true })
    .click();
  const retry = page.getByRole("button", {
    name: "Reîncearcă pregătirea",
  });
  await expect(retry).toBeVisible();
  expect(state.calls.filter((x) => x.path.endsWith("/runs"))).toHaveLength(1);
  await retry.click();
  await expect(page.locator("iframe")).toBeVisible();
  const requests = state.calls.filter((x) => x.path.endsWith("/runs"));
  expect(requests).toHaveLength(2);
  expect(requests[0].key).not.toBe(requests[1].key);
  expect(requests[0].body).toEqual(requests[1].body);
});
for(const width of [320,1440]){
 test(`Logo Engine personalizează identitatea și descarcă un concept SVG la ${width}px`,async({page},info)=>{
  const state=await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=skill-logo-engine');await page.getByRole('button',{name:'Natural rafinat',exact:true}).click();await page.getByLabel('Afacere / viitorul client').fill('Nord Studio');await page.getByLabel('Activitate',{exact:true}).fill('Wellness');await page.getByLabel('Tip de identitate').selectOption('monogram');await page.getByLabel('Semnătură / tagline (opțional)').fill('Calm. Clar.');await page.getByRole('button',{name:'Pregătește direcția',exact:true}).click();const frame=page.frameLocator('iframe');await expect(frame.getByRole('heading',{name:'Sistem de identitate'})).toBeVisible();expect(state.runs[0].preview_html).toContain('#d6e4c1');await page.frameLocator('iframe').locator('html').evaluate(el=>{el.scrollTop=0});await page.getByRole('region',{name:'Rezultatul pregătirii',exact:true}).screenshot({path:info.outputPath(`logo-concepts-${width}.png`)});const wait=page.waitForEvent('download');await page.getByRole('button',{name:'SVG · Semnătură',exact:true}).click();expect((await wait).suggestedFilename()).toMatch(/\.svg$/);await page.getByRole('button',{name:'Reia brief-ul',exact:true}).click();await expect(page.getByLabel('Tip de identitate')).toHaveValue('monogram');await expect(page.getByLabel('Paletă de explorat')).toHaveValue('sage');expect(state.calls.filter(x=>x.path.endsWith('/runs'))).toHaveLength(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`logo-engine-${width}.png`)});await page.getByRole('button',{name:'Monitorizare',exact:true}).click();await expect(page.getByRole('link',{name:'Deschide simulatorul Logo 2D'})).toHaveAttribute('href','https://avyron.ro/servicii/creare-logo-3d-dinamic-cinematic/creeaza');await expect(page.getByRole('link',{name:'Deschide produsul Logo Studio 3D'})).toHaveAttribute('href','https://avyron.ro/produse/logo/logo-studio-3d');
 });
 test(`Media Generate pregătește promptul și păstrează art direction la ${width}px`,async({page},info)=>{
  const state=await setup(page);await page.setViewportSize({width,height:900});await page.goto('/profil?tab=skill-media-generate');await page.getByRole('button',{name:'Produs în studio',exact:true}).click();await page.getByLabel('Afacere / viitorul client').fill('Atelier Nord');await page.getByLabel('Activitate',{exact:true}).fill('Cosmetice naturale');await page.getByLabel('Subiectul principal').fill('Serum în sticlă mată');await expect(page.getByLabel('Lumină',{exact:true})).toHaveValue('studio');await expect(page.getByLabel('Compoziție',{exact:true})).toHaveValue('center');await page.getByText('Promptul pregătit · fără apel AI',{exact:true}).click();const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Descarcă prompt',exact:true}).click();expect((await wait).suggestedFilename()).toBe('avy-media-prompt.txt');expect(state.calls.filter(x=>x.path.endsWith('/runs'))).toHaveLength(0);await page.getByRole('button',{name:'Pregătește direcția',exact:true}).click();await expect(page.frameLocator('iframe').getByText('Serum în sticlă mată',{exact:true})).toBeVisible();expect(state.runs[0].brief_json).toContain('"purpose":"product"');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:info.outputPath(`media-generate-${width}.png`)});
 });
}
