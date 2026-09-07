/// <reference path="./worker-configuration.d.ts" />

export type Role = "user" | "staff" | "admin";

// Resource bindings, vars and required secrets are generated from the
// Wrangler source of truth in worker-configuration.d.ts. Only truly optional
// integrations are extended here.
type OptionalIntegrations = {
  SMTP_PASS?: string;
  SEED_TOKEN?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_TABLE?: string;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
  /** Workers AI (AI OS "AVY"). Absent → agenții răspund din baza de cunoștințe. */
  AI?: { run: (model: string, input: Record<string, unknown>) => Promise<unknown> };
};

export type Env = CloudflareBindings & OptionalIntegrations;

export type AppVariables = { userId: string; roles: Role[]; requestId: string };
export type AppBindings = { Bindings: Env; Variables: AppVariables };
