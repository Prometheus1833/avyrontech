// Măsurare first-party pentru pâlnia paginilor de produs (blog profesional etc.).
//
//   POST /api/analytics/event          public, rate-limited, fără date personale
//   GET  /api/admin/analytics/funnel   staff/admin — vizite, sesiuni, conversii
//   GET  /api/admin/leads/pipeline     staff/admin — oferte primite și timp de așteptare
//
// Nu folosim cookie-uri: identificatorul de sesiune este generat de browser în
// sessionStorage și expiră odată cu tab-ul.

import type { D1Database } from "@cloudflare/workers-types";

export const TRACKED_EVENTS = [
  "page_view",
  "view_configurator",
  "view_lead_form",
  "cta_click",
  "generate_lead",
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export type EventInput = {
  page?: unknown;
  event?: unknown;
  sessionId?: unknown;
  lang?: unknown;
  path?: unknown;
  referrer?: unknown;
};

export async function recordPageEvent(db: D1Database, input: EventInput): Promise<{ ok: boolean; error?: string }> {
  const event = clean(input.event, 40);
  const page = clean(input.page, 40) || "site";
  const sessionId = clean(input.sessionId, 64);
  if (!(TRACKED_EVENTS as readonly string[]).includes(event)) return { ok: false, error: "unknown_event" };
  if (sessionId.length < 8) return { ok: false, error: "invalid_session" };

  await db
    .prepare(
      `INSERT INTO page_events (id,page,event,session_id,lang,path,referrer,created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    )
    .bind(
      crypto.randomUUID(),
      page,
      event,
      sessionId,
      clean(input.lang, 5) || null,
      clean(input.path, 200) || null,
      clean(input.referrer, 200) || null,
      Date.now(),
    )
    .run();

  return { ok: true };
}

export type FunnelRow = { event: string; hits: number; sessions: number };

export async function funnelSummary(db: D1Database, page: string, days: number) {
  const since = Date.now() - days * 86400000;
  const rows = await db
    .prepare(
      `SELECT event, COUNT(*) AS hits, COUNT(DISTINCT session_id) AS sessions
         FROM page_events
        WHERE page = ? AND created_at >= ?
        GROUP BY event`,
    )
    .bind(page, since)
    .all<FunnelRow>();

  const byEvent = new Map<string, FunnelRow>();
  for (const row of rows.results ?? []) byEvent.set(row.event, row);
  const pick = (event: TrackedEvent) => byEvent.get(event) ?? { event, hits: 0, sessions: 0 };

  const daily = await db
    .prepare(
      `SELECT date(created_at / 1000, 'unixepoch') AS day,
              SUM(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) AS views,
              SUM(CASE WHEN event = 'view_configurator' THEN 1 ELSE 0 END) AS configurator,
              SUM(CASE WHEN event = 'generate_lead' THEN 1 ELSE 0 END) AS leads
         FROM page_events
        WHERE page = ? AND created_at >= ?
        GROUP BY day ORDER BY day`,
    )
    .bind(page, since)
    .all<{ day: string; views: number; configurator: number; leads: number }>();

  const sessionsTotal = await db
    .prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM page_events WHERE page = ? AND created_at >= ?`)
    .bind(page, since)
    .first<{ n: number }>();

  const views = pick("page_view");
  const configurator = pick("view_configurator");
  const leadForm = pick("view_lead_form");
  const leads = pick("generate_lead");
  const sessions = sessionsTotal?.n ?? 0;
  const rate = (part: number) => (sessions ? Math.round((part / sessions) * 1000) / 10 : 0);

  return {
    page,
    days,
    sessions,
    views: views.hits,
    steps: {
      page_view: views,
      view_configurator: configurator,
      view_lead_form: leadForm,
      generate_lead: leads,
      cta_click: pick("cta_click"),
    },
    conversion: {
      toConfigurator: rate(configurator.sessions),
      toLeadForm: rate(leadForm.sessions),
      toLead: rate(leads.sessions),
    },
    daily: daily.results ?? [],
  };
}

export async function leadPipeline(db: D1Database, product: string | null, days: number) {
  const since = Date.now() - days * 86400000;
  const where = product ? "WHERE created_at >= ? AND product = ?" : "WHERE created_at >= ?";
  const binds = product ? [since, product] : [since];

  const byStatus = await db
    .prepare(`SELECT status, COUNT(*) AS n FROM leads ${where} GROUP BY status`)
    .bind(...binds)
    .all<{ status: string; n: number }>();

  const waiting = await db
    .prepare(
      `SELECT COUNT(*) AS open_count,
              AVG(? - created_at) AS avg_wait_ms,
              MAX(? - created_at) AS max_wait_ms
         FROM leads ${where} AND status = 'new' AND first_response_at IS NULL`,
    )
    .bind(Date.now(), Date.now(), ...binds)
    .first<{ open_count: number; avg_wait_ms: number | null; max_wait_ms: number | null }>();

  const recent = await db
    .prepare(
      `SELECT id, name, business, email, phone, status, product, estimate_ron, language,
              created_at, first_response_at, delivery_status
         FROM leads ${where}
        ORDER BY created_at DESC LIMIT 25`,
    )
    .bind(...binds)
    .all();

  const hours = (ms: number | null | undefined) => (ms ? Math.round((ms / 3600000) * 10) / 10 : 0);

  return {
    product,
    days,
    byStatus: byStatus.results ?? [],
    waiting: {
      open: waiting?.open_count ?? 0,
      avgHours: hours(waiting?.avg_wait_ms),
      maxHours: hours(waiting?.max_wait_ms),
    },
    recent: recent.results ?? [],
  };
}
