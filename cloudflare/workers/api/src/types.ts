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
  /** Optional Stripe version pin. When absent, Stripe uses the account default. */
  STRIPE_API_VERSION?: string;
  /** Revolut Merchant API. Business banking credentials are intentionally separate. */
  REVOLUT_MERCHANT_SECRET_KEY?: string;
  REVOLUT_MERCHANT_WEBHOOK_SECRET?: string;
  REVOLUT_MERCHANT_API_URL?: string;
  REVOLUT_MERCHANT_API_VERSION?: string;
  /** Oblio OAuth2 invoicing. No invoice is issued until every required value exists. */
  OBLIO_CLIENT_ID?: string;
  OBLIO_CLIENT_SECRET?: string;
  OBLIO_CIF?: string;
  OBLIO_SERIES?: string;
  OBLIO_VAT_NAME?: string;
  OBLIO_VAT_PERCENTAGE?: string;
  /** Reserved capability switch; no Netopia traffic is sent before an adapter is configured. */
  NETOPIA_ENABLED?: string;
  /** Resend is used only for consented marketing broadcasts, never essential email. */
  RESEND_API_KEY?: string;
  RESEND_MARKETING_SEGMENT_ID?: string;
  RESEND_MARKETING_FROM?: string;
  RESEND_WEBHOOK_SECRET?: string;
  /** Optional connectors remain verification-only until explicitly enabled. */
  SUPABASE_DATA_OPERATIONS_ENABLED?: string;
  GOOGLE_DRIVE_DATA_OPERATIONS_ENABLED?: string;
  BACKUP_JOBS_ENABLED?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_REDIRECT_URI?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  GITHUB_OAUTH_REDIRECT_URI?: string;
  MFA_AUTH_ENABLED?: string;
  TURNSTILE_AUTH_ENABLED?: string;
  PAID_AI_ENABLED?: string;
  ALLOW_AI_OVERAGE?: string;
  AUTO_AI_UPGRADE?: string;
};

export type Env = CloudflareBindings & OptionalIntegrations;

export type AppVariables = { userId: string; roles: Role[]; requestId: string; sessionId: string; mfaVerified: boolean };
export type AppBindings = { Bindings: Env; Variables: AppVariables };
