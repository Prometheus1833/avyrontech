import { Hono } from "hono";
import type { AppBindings } from "./types";
import { now } from "./security";

export const systemDiagnosticsRouter = new Hono<AppBindings>();

type DiagnosticStatus = "healthy" | "degraded" | "not_configured" | "limited" | "error" | "unknown";
type Diagnostic = { component: string; status: DiagnosticStatus; detail: string };

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const hasBinding = (env: AppBindings["Bindings"], name: string) => Boolean((env as unknown as Record<string, unknown>)[name]);
const on = (value: string | undefined) => value?.trim().toLowerCase() === "true";

async function collectDiagnostics(env: AppBindings["Bindings"]): Promise<Diagnostic[]> {
  const checks: Diagnostic[] = [];
  try {
    await env.DB.prepare("SELECT 1 AS ok").first();
    checks.push({ component: "D1", status: "healthy", detail: "Interogarea de control a reușit." });
    const usage = await env.DB.prepare(
      "SELECT COALESCE(SUM(estimated_neurons),0) AS total FROM ai_core_reservations WHERE usage_day=?",
    ).bind(new Date().toISOString().slice(0, 10)).first<{ total: number }>();
    const total = usage?.total || 0;
    checks.push({ component: "AI_USAGE", status: total >= 4_250 ? "limited" : total >= 3_000 ? "degraded" : "healthy", detail: `${total} / 5000 unități interne estimate astăzi.` });
  } catch {
    checks.push({ component: "D1", status: "error", detail: "Interogarea de control a eșuat." });
    checks.push({ component: "AI_USAGE", status: "unknown", detail: "Consumul intern nu a putut fi citit." });
  }
  try {
    await env.KV.get("diagnostics:read-probe");
    checks.push({ component: "KV", status: "healthy", detail: "Bindingul răspunde la citire." });
  } catch {
    checks.push({ component: "KV", status: "error", detail: "Bindingul nu răspunde la citire." });
  }
  for (const [component, bucket] of [["R2_FILES", env.FILES], ["R2_MEDIA", env.MEDIA]] as const) {
    try {
      await bucket.list({ limit: 1 });
      checks.push({ component, status: "healthy", detail: "Bucketul răspunde la listarea limitată." });
    } catch {
      checks.push({ component, status: "error", detail: "Bucketul nu răspunde la listarea limitată." });
    }
  }
  checks.push({ component: "WORKERS_AI", status: env.AI ? "healthy" : "not_configured", detail: env.AI ? "Binding configurat; testele de inferență se execută numai la cerere." : "Binding absent." });
  checks.push({ component: "AGENTS", status: hasBinding(env, "AVYRON_AGENT_RUNTIME") ? "healthy" : "not_configured", detail: hasBinding(env, "AVYRON_AGENT_RUNTIME") ? "Durable Object binding configurat." : "Binding absent." });
  checks.push({ component: "QUEUES", status: hasBinding(env, "ASYNC_JOBS") ? "healthy" : "not_configured", detail: hasBinding(env, "ASYNC_JOBS") ? "Producer binding configurat." : "Binding absent." });
  checks.push({ component: "D1_USAGE", status: "unknown", detail: "Metricile de capacitate ale contului necesită acces Cloudflare și nu sunt estimate din date parțiale." });
  checks.push({ component: "R2_USAGE", status: "unknown", detail: "Capacitatea totală R2 nu este inventată dintr-o listare limitată." });
  checks.push({ component: "KV_USAGE", status: "unknown", detail: "Metricile de utilizare KV nu sunt disponibile în bindingul Worker." });
  checks.push({ component: "QUEUE_USAGE", status: "unknown", detail: "Metricile de consum Queue necesită Analytics API." });
  checks.push({ component: "WORKFLOWS", status: hasBinding(env, "AVYRON_WORKFLOW") ? "healthy" : "not_configured", detail: hasBinding(env, "AVYRON_WORKFLOW") ? "Workflow binding configurat." : "Binding absent." });
  checks.push({ component: "AUTH_PASSWORD", status: "healthy", detail: "Autentificarea locală este activă." });
  checks.push({ component: "AUTH_MFA", status: on(env.MFA_AUTH_ENABLED) ? "healthy" : "not_configured", detail: on(env.MFA_AUTH_ENABLED) ? "MFA activ." : "MFA este dezactivat explicit." });
  checks.push({ component: "AUTH_TURNSTILE", status: on(env.TURNSTILE_AUTH_ENABLED) ? "healthy" : "not_configured", detail: on(env.TURNSTILE_AUTH_ENABLED) ? "Turnstile activ." : "Turnstile este dezactivat explicit." });
  checks.push({ component: "OAUTH_GOOGLE", status: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET ? "limited" : "not_configured", detail: env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET ? "Credentiale prezente; fluxul necesită verificare end-to-end." : "Credentiale absente." });
  checks.push({ component: "OAUTH_GITHUB", status: env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET ? "limited" : "not_configured", detail: env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET ? "Credentiale prezente; fluxul necesită verificare end-to-end." : "Credentiale absente." });
  checks.push({ component: "STRIPE", status: env.STRIPE_SECRET_KEY ? "limited" : "not_configured", detail: env.STRIPE_SECRET_KEY ? "Credential configurat; starea live nu a fost interogată." : "Credential absent." });
  checks.push({ component: "REVOLUT_PAY", status: env.REVOLUT_MERCHANT_SECRET_KEY ? "limited" : "not_configured", detail: env.REVOLUT_MERCHANT_SECRET_KEY ? "Credential configurat; starea live nu a fost interogată." : "Credential absent." });
  checks.push({ component: "OBLIO", status: env.OBLIO_CLIENT_ID && env.OBLIO_CLIENT_SECRET ? "limited" : "not_configured", detail: env.OBLIO_CLIENT_ID && env.OBLIO_CLIENT_SECRET ? "Credentiale configurate; starea live nu a fost interogată." : "Credentiale absente." });
  checks.push({ component: "SUPABASE_OPTIONAL", status: on(env.SUPABASE_DATA_OPERATIONS_ENABLED) ? "limited" : "not_configured", detail: on(env.SUPABASE_DATA_OPERATIONS_ENABLED) ? "Operațiuni opționale activate." : "Oprit; Cloudflare rămâne sursa principală." });
  checks.push({ component: "GOOGLE_DRIVE_OPTIONAL", status: on(env.GOOGLE_DRIVE_DATA_OPERATIONS_ENABLED) ? "limited" : "not_configured", detail: on(env.GOOGLE_DRIVE_DATA_OPERATIONS_ENABLED) ? "Operațiuni opționale activate." : "Oprit; nu este backend obligatoriu." });
  return checks;
}

systemDiagnosticsRouter.get("/api/admin/system/diagnostics", async (c) => {
  const run = await c.env.DB.prepare(
    "SELECT id,status,created_at,completed_at FROM system_diagnostic_runs ORDER BY created_at DESC LIMIT 1",
  ).first<Record<string, unknown>>();
  if (!run) return c.json({ data: { run: null, results: [] } });
  const { results } = await c.env.DB.prepare(
    "SELECT component,status,detail,checked_at FROM system_diagnostic_results WHERE run_id=? ORDER BY component",
  ).bind(run.id).all();
  return c.json({ data: { run, results } });
});

systemDiagnosticsRouter.post("/api/admin/system/diagnostics/run", async (c) => {
  const runId = id("diag");
  const startedAt = now();
  await c.env.DB.prepare(
    "INSERT INTO system_diagnostic_runs (id,requested_by,status,created_at) VALUES (?,?,'running',?)",
  ).bind(runId, c.get("userId"), startedAt).run();
  try {
    const diagnostics = await collectDiagnostics(c.env);
    const completedAt = now();
    await c.env.DB.batch([
      ...diagnostics.map((result) => c.env.DB.prepare(
        "INSERT INTO system_diagnostic_results (run_id,component,status,detail,checked_at) VALUES (?,?,?,?,?)",
      ).bind(runId, result.component, result.status, result.detail, completedAt)),
      c.env.DB.prepare("UPDATE system_diagnostic_runs SET status='completed',completed_at=? WHERE id=?").bind(completedAt, runId),
    ]);
    return c.json({ data: { run: { id: runId, status: "completed", created_at: startedAt, completed_at: completedAt }, results: diagnostics } }, 201);
  } catch (error) {
    await c.env.DB.prepare("UPDATE system_diagnostic_runs SET status='failed',completed_at=? WHERE id=?").bind(now(), runId).run();
    throw error;
  }
});

systemDiagnosticsRouter.post("/api/admin/system/workflows/maintenance", async (c) => {
  if (!c.env.AVYRON_WORKFLOW) return c.json({ error: { code: "workflow_not_configured" } }, 503);
  const body = await c.req.json().catch(() => ({})) as { reason?: string };
  const instance = await c.env.AVYRON_WORKFLOW.create({
    id: id("maintenance"),
    params: { requestedBy: c.get("userId"), reason: String(body.reason || "manual_admin_request").slice(0, 240) },
  });
  return c.json({ data: { id: instance.id, status: "QUEUED" } }, 202);
});

systemDiagnosticsRouter.get("/api/admin/codex-work-items", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id,title,problem,context,affected_module,likely_files_json,priority,
            acceptance_criteria,risk,status,source_agent,proposed_by,decided_by,
            decided_at,created_at,updated_at
       FROM codex_work_items ORDER BY
       CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC LIMIT 300`,
  ).all();
  return c.json({ data: results });
});

systemDiagnosticsRouter.post("/api/admin/codex-work-items", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const title = String(body.title || "").trim().slice(0, 160);
  const problem = String(body.problem || "").trim().slice(0, 4_000);
  const context = String(body.context || "").trim().slice(0, 8_000);
  const affectedModule = String(body.affectedModule || "").trim().slice(0, 120);
  const acceptanceCriteria = String(body.acceptanceCriteria || "").trim().slice(0, 4_000);
  const files = Array.isArray(body.likelyFiles) ? body.likelyFiles.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 240)).slice(0, 30) : [];
  const priority = ["low", "medium", "high", "critical"].includes(String(body.priority)) ? String(body.priority) : "medium";
  const risk = ["low", "medium", "high"].includes(String(body.risk)) ? String(body.risk) : "medium";
  if (!title || !problem || !affectedModule || !acceptanceCriteria) return c.json({ error: { code: "invalid_work_item" } }, 400);
  const workItemId = id("codex");
  const timestamp = now();
  await c.env.DB.prepare(
    `INSERT INTO codex_work_items
      (id,title,problem,context,affected_module,likely_files_json,priority,acceptance_criteria,risk,status,proposed_by,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'proposed',?,?,?)`,
  ).bind(workItemId, title, problem, context, affectedModule, JSON.stringify(files), priority, acceptanceCriteria, risk, c.get("userId"), timestamp, timestamp).run();
  return c.json({ data: { id: workItemId, status: "proposed" } }, 201);
});

systemDiagnosticsRouter.patch("/api/admin/codex-work-items/:id", async (c) => {
  const body = await c.req.json().catch(() => ({})) as { status?: string };
  const status = String(body.status || "");
  if (!["approved", "rejected", "cancelled", "in_progress", "completed"].includes(status)) {
    return c.json({ error: { code: "invalid_status" } }, 400);
  }
  const current = await c.env.DB.prepare("SELECT status FROM codex_work_items WHERE id=?").bind(c.req.param("id")).first<{ status: string }>();
  if (!current) return c.json({ error: { code: "not_found" } }, 404);
  const allowed: Record<string, string[]> = {
    proposed: ["approved", "rejected", "cancelled"], approved: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"], rejected: [], completed: [], cancelled: [],
  };
  if (!allowed[current.status]?.includes(status)) return c.json({ error: { code: "invalid_transition" } }, 409);
  const timestamp = now();
  await c.env.DB.prepare(
    "UPDATE codex_work_items SET status=?,decided_by=?,decided_at=?,updated_at=? WHERE id=?",
  ).bind(status, c.get("userId"), timestamp, timestamp, c.req.param("id")).run();
  return c.json({ ok: true, status });
});
