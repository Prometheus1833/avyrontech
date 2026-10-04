// @vitest-environment node
import type { DatabaseSync as SqliteDatabase } from "node:sqlite";
import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as typeof import("node:sqlite");

const migratedDatabase = () => {
  const db: SqliteDatabase = new DatabaseSync(":memory:");
  for (const file of readdirSync("cloudflare/d1/migrations").filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
  }
  return db;
};

describe("newsletter consent policy", () => {
  it("ships conservative prompt defaults and dedicated consent tables", () => {
    const db = migratedDatabase();
    const settings = db.prepare("SELECT * FROM newsletter_settings WHERE id='global'").get();
    expect(settings).toMatchObject({ enabled: 1, prompt_enabled: 1, min_page_views: 2, cooldown_days: 30 });
    expect(settings?.consent_policy_version).toMatch(/^newsletter-/);
    const subscriberColumns = db.prepare("PRAGMA table_info(newsletter_subscribers)").all() as Array<{ name: string }>;
    const campaignColumns = db.prepare("PRAGMA table_info(newsletter_campaigns)").all() as Array<{ name: string }>;
    expect(subscriberColumns.map((column) => column.name)).toContain("resend_synced_at");
    expect(campaignColumns.map((column) => column.name)).toContain("provider_broadcast_id");
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='newsletter_provider_events'").get()).toBeTruthy();
    db.close();
  });

  it("deduplicates email case-insensitively and rejects unsupported states", () => {
    const db = migratedDatabase();
    const insert = db.prepare(`INSERT INTO newsletter_subscribers
      (id,email,language,status,source,consent_policy_version,consent_evidence,requested_at,last_seen_at,updated_at)
      VALUES (?,?,?,'pending','website','newsletter-test','explicit form consent',?,?,?)`);
    insert.run("one", "Ana@Example.ro", "ro", 1, 1, 1);
    expect(() => insert.run("two", "ana@example.ro", "ro", 2, 2, 2)).toThrow();
    expect(() => db.prepare(`UPDATE newsletter_subscribers SET status='marketing_target' WHERE id='one'`).run()).toThrow();
    db.close();
  });

  it("requires double opt-in, anti-spam and a self-service unsubscribe path", () => {
    const api = readFileSync("cloudflare/workers/api/src/newsletter.ts", "utf8");
    const index = readFileSync("cloudflare/workers/api/src/index.ts", "utf8");
    const prompt = readFileSync("src/components/site/NewsletterPrompt.tsx", "utf8");
    expect(api).toContain('expectedAction: "newsletter-subscribe"');
    expect(api).toContain("confirmation_token_hash");
    expect(api).toContain('purpose: "newsletter_unsubscribe"');
    expect(api).toContain("Reactivarea necesită un nou acord confirmat prin email");
    expect(api).toContain("syncSubscriberMarketing");
    expect(api).toContain('confirmation !== expected');
    expect(index).toContain('app.use("/api/newsletter/admin/*", requireAuth, requireSuperAdmin)');
    expect(prompt).toContain("readCookieConsent()");
    expect(prompt).toContain("cooldownDays");
  });

  it("keeps essential delivery on Cloudflare and isolates Resend to marketing", () => {
    const newsletter = readFileSync("cloudflare/workers/api/src/newsletter.ts", "utf8");
    const mailer = readFileSync("cloudflare/workers/api/src/mailer.ts", "utf8");
    const resend = readFileSync("cloudflare/workers/api/src/resendMarketing.ts", "utf8");
    expect(newsletter).toContain("const mail = await deliverMail");
    expect(mailer).toContain('env.SMTP_HOST || "smtp.mx.cloudflare.net"');
    expect(resend).toContain('const RESEND_API = "https://api.resend.com"');
    expect(resend).toContain("RESEND_UNSUBSCRIBE_URL");
    expect(resend).not.toContain("SMTP_PASS");
  });
});
