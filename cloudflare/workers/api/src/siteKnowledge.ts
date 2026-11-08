import type { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "./types";
import { sha256 } from "./security";
import { selectedSkillReferences, referenceMarkdown } from "./skillPolicy";
import {
  carouselConfigSchema,
  DEFAULT_EXAMPLE_CAROUSEL,
} from "../../../../src/shared/exampleCarousels";
import {
  SITE_KNOWLEDGE_VERSION,
  SITE_DOMAIN_PLAYBOOKS,
  SITE_FEATURES,
  SITE_CASES,
  SITE_MARKET_SOURCES,
  siteAgentMarkdown,
  siteQualityContext,
  type SiteAgent,
} from "../../../../src/shared/skills/siteKnowledge";
import { LIBRARY_SECTIONS } from "../../../../src/data/bibliotecaCatalog";
const root = "/api/skills/site-builder";
export async function publishedSiteExamples(db: D1Database) {
  const rows = await db
    .prepare(
      "SELECT c.page_key,c.published_revision,v.content_json FROM example_carousel_configs c JOIN example_carousel_versions v ON v.page_key=c.page_key AND v.revision=c.published_revision ORDER BY c.page_key",
    )
    .all<{
      page_key: string;
      published_revision: number;
      content_json: string;
    }>();
  const published = rows.results.map((row) => ({
    ...row,
    config: carouselConfigSchema.safeParse(JSON.parse(row.content_json)),
  }));
  if (!rows.results.some((r) => r.page_key === "premium-website"))
    published.push({
      page_key: "premium-website",
      published_revision: 0,
      content_json: "",
      config: { success: true, data: DEFAULT_EXAMPLE_CAROUSEL },
    });
  return published.flatMap((row) =>
    row.config.success && row.config.data.enabled
      ? row.config.data.items
          .filter((i) => i.visibility === "visible")
          .map((i) => ({
            key: `${row.page_key}:${i.key}`,
            name: i.name,
            url: new URL(i.href, "https://avyron.ro").href,
            description: i.desc.ro,
            page: row.page_key,
            revision: row.published_revision,
            domain: SITE_CASES.find((c) => c.id === i.key)?.domain || "general",
            kind:
              i.href.startsWith("/examples/") || i.href.startsWith("/exemple/")
                ? "mockup"
                : "portfolio",
          }))
      : [],
  );
}
export function siteBuilderRoutes(router: Hono<AppBindings>) {
  router.get(root + "/knowledge", async (c) => {
    const p = c.get("skillAccess")!;
    const [examples, domains, bindings] = await Promise.all([
      publishedSiteExamples(c.env.DB),
      c.env.DB.prepare(
        `SELECT domain,count(*) total,SUM(status='approved') approved FROM avy_skill_resources WHERE skill_slug='site-builder' AND status!='archived' ${p.manage || p.approve ? "" : "AND status='approved'"} GROUP BY domain ORDER BY domain`,
      ).all(),
      c.env.DB.prepare(
        `SELECT b.agent_slug,b.status,a.status agent_status,count(*) bindings FROM agent_operator_bindings b JOIN ai_agents a ON a.slug=b.agent_slug JOIN ai_project_members m ON m.user_id=b.user_id AND m.project_id=b.project_id AND m.status='active' JOIN users u ON u.id=b.user_id AND u.disabled_at IS NULL WHERE b.agent_slug IN('leads','ai-prod-content') ${p.platform ? "" : "AND b.user_id=?"} GROUP BY b.agent_slug,b.status,a.status`,
      )
        .bind(...(p.platform ? [] : [c.get("userId")]))
        .all(),
    ]);
    return c.json({
      version: SITE_KNOWLEDGE_VERSION,
      quality: siteQualityContext("general"),
      domains: SITE_DOMAIN_PLAYBOOKS,
      resourceDomains: domains.results,
      features: SITE_FEATURES,
      examples,
      marketSources: SITE_MARKET_SOURCES,
      library: LIBRARY_SECTIONS.map((s) => ({
        id: s.id,
        name: s.name.ro,
        effects: s.effects.map((e) => ({
          code: e.code,
          name: e.name.ro,
          description: e.desc.ro,
          demo: e.demo || null,
          webgl: !!e.webgl,
          state: e.demo ? "demo" : "catalogue",
        })),
      })),
      agents: bindings.results,
      generatedAt: Date.now(),
    });
  });
  router.get(root + "/agents/:agent", async (c) => {
    const parsed = z
      .enum(["codex.md", "claude.md", "lovable.md"])
      .safeParse(c.req.param("agent"));
    if (!parsed.success)
      return c.json({ error: { code: "invalid_agent" } }, 400);
    const domain = (c.req.query("domain") || "general").slice(0, 80);
    const v = await c.env.DB.prepare(
      "SELECT s.published_version,v.instructions FROM avy_skills s JOIN avy_skill_versions v ON v.skill_slug=s.slug AND v.version=s.published_version WHERE s.slug='site-builder'",
    ).first<{ published_version: number; instructions: string }>();
    if (!v) return c.json({ error: { code: "skill_missing" } }, 404);
    const refs = await selectedSkillReferences(
        c.env.DB,
        "site-builder",
        domain,
      ),
      text = siteAgentMarkdown(
        parsed.data.replace(".md", "") as SiteAgent,
        domain,
        v.instructions,
        v.published_version,
        referenceMarkdown(refs),
      );
    c.header("Content-Type", "text/markdown; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="AVYRON-Site-Builder-${parsed.data}"`,
    );
    c.header("ETag", `"${await sha256(text)}"`);
    c.header("X-Avy-Knowledge-Version", SITE_KNOWLEDGE_VERSION);
    return c.body(text);
  });
  router.post(root + "/sources/sync", async (c) => {
    if (!c.get("skillAccess")?.manage)
      return c.json({ error: { code: "forbidden" } }, 403);
    const t = Date.now(),
      ids: string[] = [];
    const signatureSql =
      "COALESCE((SELECT group_concat(page_key||':'||published_revision,'|') FROM (SELECT page_key,published_revision FROM example_carousel_configs WHERE published_revision IS NOT NULL ORDER BY page_key)), '')";
    const snapshot = await c.env.DB.prepare(
      `SELECT ${signatureSql} signature`,
    ).first<{ signature: string }>();
    const examples = await publishedSiteExamples(c.env.DB);
    const statements: D1PreparedStatement[] = [
      c.env.DB.prepare(
        `INSERT INTO avy_skill_events(id,skill_slug,actor_id,action,detail_json,created_at) VALUES(?,'site-builder',?,'sources.synced',CASE WHEN ${signatureSql}=? THEN ? ELSE NULL END,?)`,
      ).bind(
        crypto.randomUUID(),
        c.get("userId"),
        snapshot?.signature || "",
        JSON.stringify({
          references: examples.length,
          version: SITE_KNOWLEDGE_VERSION,
        }),
        t,
      ),
    ];
    for (const item of examples) {
      const body = `Referință publicată în catalogul AVYRON: ${item.name}. Tip: ${item.kind === "mockup" ? "mockup demonstrativ, nu proiect client dovedit live" : "referință de portofoliu; funcțiile live necesită verificare separată"}. ${item.description} Reutilizează numai tiparul și structura, cu identitate proprie și drepturi confirmate. Revizia caruselului: ${item.revision}.`,
        id = "site_source_" + (await sha256(JSON.stringify(item))).slice(0, 32);
      ids.push(id);
      statements.push(
        c.env.DB.prepare(
          "INSERT OR IGNORE INTO avy_skill_resources(id,skill_slug,title,domain,body,source_url,status,created_by,created_at,updated_at,source_kind,source_key,source_revision) VALUES(?,'site-builder',?,?,?,?,'draft',?,?,?,'carousel',?,?)",
        ).bind(
          id,
          item.name,
          item.domain,
          body,
          item.url,
          c.get("userId"),
          t,
          t,
          item.key,
          String(item.revision),
        ),
      );
    }
    statements.push(
      c.env.DB.prepare(
        "UPDATE avy_skill_resources SET status='archived',revision=revision+1,updated_at=? WHERE skill_slug='site-builder' AND source_kind='carousel' AND status!='archived' AND id NOT IN(SELECT value FROM json_each(?))",
      ).bind(t, JSON.stringify(ids)),
    );
    const results = await c.env.DB.batch(statements).catch((error) => {
      if (
        String(error).includes(
          "NOT NULL constraint failed: avy_skill_events.detail_json",
        )
      )
        return null;
      throw error;
    });
    if (!results)
      return c.json(
        {
          error: {
            code: "source_revision_conflict",
            message:
              "Caruselele publicate s-au modificat. Reîncearcă sincronizarea.",
          },
        },
        409,
      );
    return c.json({
      references: ids.length,
      created: results
        .slice(1, ids.length + 1)
        .reduce((n, r) => n + Number(r.meta.changes || 0), 0),
      archived: results[ids.length + 1].meta.changes || 0,
      reviewRequired: true,
    });
  });
}
