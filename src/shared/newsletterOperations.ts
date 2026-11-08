export type NewsletterOperationCampaign = {
  id: string;
  name: string;
  subject: string;
  language: string;
  status: string;
  provider_status: string;
  provider_raw_status: string | null;
  provider_checked_at: number | null;
  provider_error: string | null;
  provider_broadcast_id: string | null;
  assigned_user_id: string | null;
  assigned_name: string | null;
  operations_revision: number;
  scheduled_at: number | null;
  sent_at: number | null;
  updated_at: number;
};
export type NewsletterOperations = {
  provider: {
    configured: boolean;
    apiKey: boolean;
    segment: boolean;
    sender: boolean;
    webhook: boolean;
    isolatedSender: boolean;
  };
  contacts: {
    total: number;
    active: number | null;
    pending: number | null;
    awaitingSync: number | null;
    errors: number | null;
    lastSync: number | null;
  };
  lastWebhook: number | null;
  events: {
    event_type: string;
    events: number;
    recipients: number;
    latest: number;
  }[];
  interests: { interest: string; language: string; total: number }[];
  staff: { id: string; name: string }[];
  campaigns: NewsletterOperationCampaign[];
  source: string;
  periodDays: number;
  generatedAt: number;
};
export const NEWSLETTER_STAGES = {
  draft: "Ciornă",
  ready: "Pregătită",
  provider_draft: "Ciornă Resend",
  queued: "În coadă",
  scheduled: "Programată",
  sent: "Trimisă",
  failed: "Necesită atenție",
  archived: "Arhivată",
};
export function newsletterStage(
  c: Pick<NewsletterOperationCampaign, "status" | "provider_status">,
) {
  return c.status === "archived"
    ? "archived"
    : c.provider_status === "local_draft"
      ? c.status === "ready"
        ? "ready"
        : "draft"
      : c.provider_status;
}
