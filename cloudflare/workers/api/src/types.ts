export type Role = "user" | "staff" | "admin";

// Resource bindings, vars and required secrets are generated from the
// Wrangler source of truth in worker-configuration.d.ts. Only truly optional
// integrations are extended here.
type OptionalIntegrations = {
  /** Bouncer Malware API only. Optional secret; never committed or exposed to clients. */
  BOUNCER_API_KEY?: string;
  BOUNCER_ENABLED?: string;
  BOUNCER_STORAGE_PRIVACY_VERIFIED?: string;
  /** Deployment gates set only after actual DPA and international-transfer review. */
  BOUNCER_SENSITIVE_PROCESSING_APPROVED?: string;
  BOUNCER_DPA_REFERENCE?: string;
  BOUNCER_TRANSFER_REVIEW_REFERENCE?: string;
  /** Private backup destinations. Provision only after approval; never fall back to FILES. */
  DOCUMENT_BACKUPS?: R2Bucket;
  DOCUMENT_COMPANY_BACKUPS?: R2Bucket;
  /** Set only after an operator verifies private, distinct bucket destinations. */
  DOCUMENT_BACKUP_ISOLATION_VERIFIED?: string;
  /** Operator verified that FILES has no public domain or r2.dev exposure. */
  DOCUMENT_STORAGE_PRIVACY_VERIFIED?: string;
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
  /** Expected AVYRON account. Checkout fails closed if the key belongs to another Stripe account. */
  STRIPE_ACCOUNT_ID?: string;
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
  /** Explicit production release gate; credentials alone never authorize fiscal issuance. */
  OBLIO_AUTO_ISSUE_ENABLED?: string;
  /** Sending invoices to customers is a separate opt-in from fiscal issuance. */
  OBLIO_SEND_EMAIL_ENABLED?: string;
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

export type AppVariables = { userId: string; roles: Role[]; requestId: string; sessionId: string; mfaVerified: boolean; antivirusIntent: {first:boolean;key:string;scope:string;body:{confirmed?:boolean;sample?:string}} };
export type AppBindings = { Bindings: Env; Variables: AppVariables };
