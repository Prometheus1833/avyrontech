import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env } from "../types";

export type MaintenanceParams = { requestedBy: string; reason: string };

export class AvyronMaintenanceWorkflow extends WorkflowEntrypoint<Env, MaintenanceParams> {
  async run(event: WorkflowEvent<MaintenanceParams>, step: WorkflowStep) {
    const expired = await step.do("prune expired coordination records", { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } }, async () => {
      const timestamp = Date.now();
      const results = await this.env.DB.batch([
        this.env.DB.prepare("DELETE FROM idempotency_keys WHERE expires_at<?").bind(timestamp),
        this.env.DB.prepare("DELETE FROM rate_limit_counters WHERE expires_at<?").bind(Math.floor(timestamp / 1000)),
      ]);
      return results.reduce((total, result) => total + (result.meta.changes || 0), 0);
    });
    await step.do("optimize d1 planner", async () => {
      await this.env.DB.prepare("PRAGMA optimize").run();
      return { optimized: true };
    });
    await step.do("record maintenance evidence", async () => {
      await this.env.DB.prepare(
        `INSERT INTO security_events
          (id,actor_user_id,actor_type,action,outcome,severity,metadata_json,created_at)
         VALUES (?,?,'user','system.maintenance_workflow','allowed','info',?,?)`,
      ).bind(
        `sec_${crypto.randomUUID().replace(/-/g, "")}`,
        event.payload.requestedBy,
        JSON.stringify({ instanceId: event.instanceId, reason: event.payload.reason, expired }),
        Date.now(),
      ).run();
      return { recorded: true };
    });
    return { ok: true, expired };
  }
}
