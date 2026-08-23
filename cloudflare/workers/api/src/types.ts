export type Role = "user" | "staff" | "admin";

export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  FILES: R2Bucket;
  MEDIA: R2Bucket;
  JWT_SECRET: string;
  SEED_TOKEN?: string;
  ALLOWED_ORIGINS: string;
  APP_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  LEAD_TO?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  AIRTABLE_API_KEY?: string;
  AIRTABLE_BASE_ID?: string;
  AIRTABLE_TABLE?: string;
  LEAD_WEBHOOK_URL?: string;
  LEAD_WEBHOOK_SECRET?: string;
};

export type AppVariables = { userId: string; roles: Role[] };
export type AppBindings = { Bindings: Env; Variables: AppVariables };
