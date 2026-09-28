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
  /** Plata pentru Produse Avyron. Absente → checkout-ul răspunde `payments_unconfigured`. */
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  /** Facturarea FGO. Absente (sau fără cota de TVA) → plata rămâne fără factură automată. */
  FGO_API_URL?: string;
  FGO_CUI?: string;
  FGO_PRIVATE_KEY?: string;
  FGO_CLIENT_NAME?: string;
  FGO_PLATFORM_URL?: string;
  FGO_SERIES?: string;
  FGO_VAT_RATE?: string;
};

export type Env = CloudflareBindings & OptionalIntegrations;

export type AppVariables = { userId: string; roles: Role[]; requestId: string; sessionId: string; mfaVerified: boolean };
export type AppBindings = { Bindings: Env; Variables: AppVariables };
