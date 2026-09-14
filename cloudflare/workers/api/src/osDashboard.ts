import { Hono, type Context } from "hono";
import type { AppBindings, Role } from "./types";
import { platformRoleForUser } from "./authorization";
import { now } from "./security";
import { bucharestMonthStart, financialTotals } from "./financialTotals";

type AttentionItem = {
  id: string;
  kind: "financiar" | "lead" | "proiect" | "suport" | "securitate";
  severity: "informare" | "atenție" | "critic";
  title: string;
  detail: string;
  destination: string;
};

type CountRow = { total: number };

const dashboardRouter = new Hono<AppBindings>();

const isStaffRole = (roles: Role[]) => roles.includes("staff") || roles.includes("admin");

const statusLabel = (status: string) => {
  if (["active", "connected"].includes(status)) return "conectat";
  if (["error", "revoked"].includes(status)) return "eroare";
  if (["testing", "verifying", "pending"].includes(status)) return "în_verificare";
  if (["paused", "disabled"].includes(status)) return "oprit";
  return "neconfigurat";
};

const buildBriefing = (attention: AttentionItem[], metrics: Record<string, number>) => {
  const fragments: string[] = [];
  const urgentLeads = attention.find((item) => item.id === "leaduri-necontactate");
  const overdue = attention.find((item) => item.id === "facturi-restante");
  const approvals = metrics.approvals || 0;
  if (urgentLeads) fragments.push(urgentLeads.title.toLowerCase());
  if (overdue) fragments.push(overdue.title.toLowerCase());
  if (approvals) fragments.push(`${approvals} ${approvals === 1 ? "aprobare așteaptă" : "aprobări așteaptă"} decizia ta`);
  if (!fragments.length) return "Nu există urgențe confirmate din modulele conectate. Verifică proiectele active și continuă prioritățile planificate.";
  return `Astăzi, ${fragments.join(", ")}. Deschide elementele prioritare pentru context și acțiuni controlate.`;
};

dashboardRouter.get("/api/os/overview", async (c) => {
  const userId = c.get("userId");
  const roles = c.get("roles") ?? [];
  const staff = isStaffRole(roles);
  const superAdmin = (await platformRoleForUser(c.env.DB, userId)) !== null;
  const timestamp = now();
  const monthStart = bucharestMonthStart(timestamp);
  const thirtyDaysAgo = timestamp - 30 * 24 * 60 * 60 * 1000;

  const projectSummary = staff
    ? await c.env.DB.prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status IN ('in_progress','maintenance') THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN banner_status IN ('revizuire','testing') THEN 1 ELSE 0 END) AS review
           FROM projects WHERE status <> 'archived'`,
      ).first<{ total: number; active: number; review: number }>()
    : await c.env.DB.prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status IN ('in_progress','maintenance') THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN banner_status IN ('revizuire','testing') THEN 1 ELSE 0 END) AS review
           FROM projects WHERE owner_user_id = ? AND status <> 'archived'`,
      ).bind(userId).first<{ total: number; active: number; review: number }>();

  const [leadSummary, clientSummary, ticketSummary, visitsSummary] = staff
    ? await Promise.all([
        c.env.DB.prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status IN ('new','qualified') THEN 1 ELSE 0 END) AS open,
                  SUM(CASE WHEN first_response_at IS NULL AND status IN ('new','qualified')
                    AND (urgent = 1 OR (created_at < ? AND status = 'new')) THEN 1 ELSE 0 END) AS waiting
             FROM leads`,
        ).bind(timestamp - 4 * 60 * 60 * 1000).first<{ total: number; open: number; waiting: number }>(),
        c.env.DB.prepare("SELECT COUNT(*) AS total FROM clients WHERE status = 'active'").first<CountRow>(),
        c.env.DB.prepare("SELECT COUNT(*) AS total FROM support_tickets WHERE status IN ('open','pending')").first<CountRow>(),
        c.env.DB.prepare(
          "SELECT COUNT(*) AS total, COUNT(DISTINCT session_id) AS sessions FROM page_events WHERE event = 'page_view' AND created_at >= ?",
        ).bind(thirtyDaysAgo).first<{ total: number; sessions: number }>(),
      ])
    : [null, null, null, null];

  const [legacyOverdue, finance, approvals, agentRuns, financialAlerts, connections, securityWarnings] = superAdmin
    ? await Promise.all([
        c.env.DB.prepare(
          "SELECT COUNT(*) AS total FROM invoices WHERE status = 'overdue' OR (status = 'sent' AND due_date < ?)",
        ).bind(timestamp).first<CountRow>(),
        financialTotals(c.env.DB, monthStart, timestamp),
        c.env.DB.prepare(
          `SELECT approval.id, approval.summary, approval.action_class, approval.requested_at, approval.expires_at,
                  run.agent_slug, run.status AS run_status, COUNT(*) OVER () AS pending_total
             FROM ai_approvals AS approval
             JOIN ai_runs AS run ON run.id = approval.run_id
            WHERE approval.status = 'pending' AND approval.expires_at > ?
            ORDER BY approval.requested_at DESC LIMIT 8`,
        ).bind(timestamp).all<Record<string, unknown>>(),
        c.env.DB.prepare(
          `SELECT run.id, run.agent_slug, run.status, run.input_tokens, run.output_tokens,
                  run.estimated_cost_micros, run.started_at, run.completed_at, run.created_at,
                  COUNT(step.id) AS steps
             FROM (SELECT * FROM ai_runs ORDER BY created_at DESC LIMIT 8) AS run
             LEFT JOIN ai_run_steps AS step ON step.run_id = run.id
            GROUP BY run.id
            ORDER BY run.created_at DESC LIMIT 8`,
        ).all<Record<string, unknown>>(),
        c.env.DB.prepare(
          `SELECT id, kind, severity, title, message, detected_at
             FROM financial_alerts WHERE status IN ('open','acknowledged')
            ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, detected_at DESC LIMIT 6`,
        ).all<Record<string, unknown>>(),
        c.env.DB.prepare(
          `SELECT provider AS name, status, 'sursă' AS category, last_validated_at AS checked_at, last_error_code
             FROM source_connections
           UNION ALL
           SELECT provider AS name, status, 'financiar' AS category, last_sync_at AS checked_at, last_error_code
             FROM financial_provider_connections
           UNION ALL
           SELECT name, status, 'motor' AS category, last_validated_at AS checked_at, last_error_code
             FROM engine_connectors
            ORDER BY name LIMIT 30`,
        ).all<{ name: string; status: string; category: string; checked_at: number | null; last_error_code: string | null }>(),
        c.env.DB.prepare(
          `SELECT COUNT(*) AS total FROM security_events
            WHERE created_at >= ? AND (severity IN ('warning','critical') OR outcome IN ('denied','failed'))`,
        ).bind(thirtyDaysAgo).first<CountRow>(),
      ])
    : [null, null, { results: [] }, { results: [] }, { results: [] }, { results: [] }, null];

  const attention: AttentionItem[] = [];
  const waitingLeads = Number(leadSummary?.waiting || 0);
  if (waitingLeads > 0) attention.push({
    id: "leaduri-necontactate", kind: "lead", severity: waitingLeads > 5 ? "critic" : "atenție",
    title: `${waitingLeads} ${waitingLeads === 1 ? "lead prioritar fără răspuns" : "leaduri prioritare fără răspuns"}`,
    detail: "Leaduri noi mai vechi de patru ore sau marcate urgent.", destination: "leads",
  });
  if (Number(legacyOverdue?.total || 0) > 0) attention.push({
    id: "facturi-restante", kind: "financiar", severity: "critic",
    title: `${legacyOverdue?.total} ${legacyOverdue?.total === 1 ? "factură restantă" : "facturi restante"}`,
    detail: "Necesită verificarea încasării sau contactarea clientului.", destination: "finance",
  });
  if (Number(projectSummary?.review || 0) > 0) attention.push({
    id: "proiecte-revizuire", kind: "proiect", severity: "atenție",
    title: `${projectSummary?.review} ${projectSummary?.review === 1 ? "proiect necesită" : "proiecte necesită"} revizuire`,
    detail: "Proiecte aflate în testare sau în etapa de revizuire.", destination: "projects",
  });
  if (Number(ticketSummary?.total || 0) > 0) attention.push({
    id: "tichete-deschise", kind: "suport", severity: "atenție",
    title: `${ticketSummary?.total} ${ticketSummary?.total === 1 ? "solicitare deschisă" : "solicitări deschise"}`,
    detail: "Clienți care așteaptă răspuns sau rezolvare.", destination: "staff-tickets",
  });
  if (Number(securityWarnings?.total || 0) > 0) attention.push({
    id: "securitate", kind: "securitate", severity: "critic",
    title: `${securityWarnings?.total} evenimente de securitate de verificat`,
    detail: "Evenimente refuzate, eșuate sau cu severitate ridicată în ultimele 30 de zile.", destination: "security",
  });
  for (const alert of financialAlerts.results) {
    attention.push({
      id: `alertă-${String(alert.id)}`, kind: "financiar",
      severity: alert.severity === "critical" ? "critic" : "atenție",
      title: String(alert.title), detail: String(alert.message || "Alertă financiară activă."), destination: "finance",
    });
  }

  const metrics = {
    projects: Number(projectSummary?.total || 0),
    activeProjects: Number(projectSummary?.active || 0),
    leads: Number(leadSummary?.total || 0),
    openLeads: Number(leadSummary?.open || 0),
    clients: Number(clientSummary?.total || 0),
    visits: Number(visitsSummary?.sessions || 0),
    approvals: Number(approvals.results[0]?.pending_total || 0),
    expensesMinor: Number(finance?.expenses || 0),
    revenuesMinor: Number(finance?.revenues || 0),
    criticalAlerts: Number(finance?.critical_alerts || 0),
  };

  const integrationRows = connections.results.map((row) => ({
    name: row.name,
    category: row.category,
    status: row.last_error_code ? "eroare" : ["active", "connected"].includes(row.status)
      && (!row.checked_at || row.checked_at < timestamp - 7 * 86_400_000)
      ? "în_verificare" : statusLabel(row.status),
    checkedAt: row.checked_at,
    errorCode: row.last_error_code,
  }));

  return c.json({
    generatedAt: timestamp,
    role: superAdmin ? "super_admin" : staff ? "staff" : "client",
    briefing: buildBriefing(attention, metrics),
    metrics,
    attention: attention.slice(0, 12),
    approvals: approvals.results,
    agentRuns: agentRuns.results,
    health: [
      { id: "api", label: "API AVYRON", status: "funcțional", detail: "Workerul a răspuns autentificat." },
      { id: "auth", label: "Autentificare", status: "funcțional", detail: "Sesiunea și rolul au fost validate." },
      { id: "d1", label: "Baza de date D1", status: "funcțional", detail: "Interogările dashboardului au reușit." },
      { id: "files", label: "Documente R2", status: c.env.FILES ? "configurat" : "neconfigurat", detail: "Disponibilitatea bindingului nu confirmă o operațiune de stocare." },
      { id: "media", label: "Media R2", status: c.env.MEDIA ? "configurat" : "neconfigurat", detail: "Disponibilitatea bindingului nu confirmă o operațiune de stocare." },
      { id: "ai", label: "Workers AI", status: c.env.AI ? "configurat" : "neconfigurat", detail: "Nu se consumă resurse AI pentru verificarea stării. Utilizarea necesită Cost Guard." },
    ],
    integrations: integrationRows,
  });
});

dashboardRouter.patch("/api/os/approvals/:approvalId", async (c: Context<AppBindings>) => {
  const userId = c.get("userId");
  if ((await platformRoleForUser(c.env.DB, userId)) === null) {
    return c.json({ error: { code: "forbidden", message: "Doar super adminul poate decide aprobări." } }, 403);
  }
  const body = await c.req.json<unknown>().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return c.json({ error: { code: "invalid_decision" } }, 400);
  }
  const { decision, note } = body as Record<string, unknown>;
  if (decision !== "approved" && decision !== "rejected") {
    return c.json({ error: { code: "invalid_decision", message: "Decizia trebuie să fie aprobat sau respins." } }, 400);
  }
  if (note !== undefined && (typeof note !== "string" || note.length > 500)) {
    return c.json({ error: { code: "invalid_note", message: "Nota trebuie să conțină maximum 500 de caractere." } }, 400);
  }
  const approvalId = c.req.param("approvalId");
  const timestamp = now();
  const eventId = crypto.randomUUID();
  const runState = decision === "approved" ? "queued" : "denied";
  const stepState = decision === "approved" ? "queued" : "denied";
  // The conditional audit row is a per-request claim. D1 batch is transactional:
  // a failed continuation rolls back the claim and decision as well. Retries or
  // competing decisions cannot reuse this claim or mutate an already decided row.
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO security_events
        (id,actor_user_id,actor_type,action,outcome,severity,request_id,metadata_json,created_at)
       SELECT ?,?, 'user', ?, 'allowed', 'info', ?, ?, ?
         FROM ai_approvals WHERE id = ? AND status = 'pending' AND expires_at > ?`,
    ).bind(eventId, userId, `ai.approval.${decision}`, c.get("requestId") || null,
      JSON.stringify({ approvalId }), timestamp, approvalId, timestamp),
    c.env.DB.prepare(
      `UPDATE ai_approvals SET status = ?, decided_by = ?, decided_at = ?, decision_note = ?
        WHERE id = ? AND EXISTS (SELECT 1 FROM security_events WHERE id = ?)`,
    ).bind(decision, userId, timestamp, typeof note === "string" ? note.trim() || null : null, approvalId, eventId),
    c.env.DB.prepare(
      `UPDATE ai_runs SET status = ? WHERE id = (SELECT run_id FROM ai_approvals WHERE id = ?)
        AND status = 'awaiting_approval'
        AND EXISTS (SELECT 1 FROM security_events WHERE id = ?)
        AND (? = 'denied' OR NOT EXISTS
          (SELECT 1 FROM ai_approvals WHERE run_id = ai_runs.id AND status = 'pending'))`,
    ).bind(runState, approvalId, eventId, runState),
    c.env.DB.prepare(
      `UPDATE ai_run_steps SET status = ? WHERE id = (SELECT step_id FROM ai_approvals WHERE id = ?)
        AND status = 'awaiting_approval'
        AND EXISTS (SELECT 1 FROM security_events WHERE id = ?)`,
    ).bind(stepState, approvalId, eventId),
  ]);
  if (!(results[0].meta.changes ?? 0)) {
    return c.json({ error: { code: "not_available", message: "Aprobarea nu mai este disponibilă." } }, 409);
  }
  return c.json({ ok: true, status: decision });
});

export { dashboardRouter };
