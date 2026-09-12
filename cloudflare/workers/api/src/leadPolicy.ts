export const LEAD_STAGES = [
  "new_lead", "contacted", "discussion", "potential_client", "offer",
  "accepted", "rejected", "converted",
] as const;

export const LEAD_CHANNELS = ["phone", "whatsapp", "email", "sms", "social"] as const;

export const LEAD_ACTIVITY_KINDS = [
  "note", "call", "email", "whatsapp", "sms", "social", "status_change",
  "assignment", "offer", "conversion",
] as const;

export const OUTREACH_ELIGIBILITY = [
  "unknown", "consented", "legitimate_interest", "do_not_contact", "blocked",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadChannel = (typeof LEAD_CHANNELS)[number];
export type OutreachEligibility = (typeof OUTREACH_ELIGIBILITY)[number];

export type NewLead = {
  organizationId: string | null;
  source: string;
  name: string | null;
  business: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  website: string | null;
  product: string | null;
  preferredChannel: LeadChannel | null;
  nextFollowUpAt: number | null;
  urgent: boolean;
  estimateRon: number | null;
  provenanceUrl: string | null;
  outreachEligibility: OutreachEligibility;
};

type ValidationResult =
  | { ok: true; value: NewLead }
  | { ok: false; code: string; field?: string };

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max) || null;
};

const webUrl = (value: unknown): string | null | false => {
  const candidate = text(value, 2_048);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    url.hash = "";
    return url.toString();
  } catch {
    return false;
  }
};

export const normalizedLeadPhone = (value: string | null) =>
  value?.replace(/\D/g, "") || null;

export const coarseLeadStatus = (stage: LeadStage) => {
  if (stage === "new_lead") return "new";
  if (stage === "contacted" || stage === "discussion") return "contacted";
  if (stage === "potential_client" || stage === "offer") return "qualified";
  if (stage === "accepted" || stage === "converted") return "won";
  return "lost";
};

export function validateNewLead(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, code: "bad_request" };
  const body = input as Record<string, unknown>;
  const name = text(body.name, 160);
  const business = text(body.business, 200);
  if (!name && !business) return { ok: false, code: "missing_identity", field: "name" };

  const email = text(body.email, 254)?.toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "invalid_email", field: "email" };
  }
  const phone = text(body.phone, 40);
  if (phone && (normalizedLeadPhone(phone)?.length || 0) < 6) {
    return { ok: false, code: "invalid_phone", field: "phone" };
  }

  const website = webUrl(body.website);
  if (website === false) return { ok: false, code: "invalid_url", field: "website" };
  const provenanceUrl = webUrl(body.provenanceUrl);
  if (provenanceUrl === false) return { ok: false, code: "invalid_url", field: "provenanceUrl" };

  const preferredChannel = text(body.preferredChannel, 24);
  if (preferredChannel && !(LEAD_CHANNELS as readonly string[]).includes(preferredChannel)) {
    return { ok: false, code: "invalid_channel", field: "preferredChannel" };
  }
  const outreachEligibility = text(body.outreachEligibility, 40) || "unknown";
  if (!(OUTREACH_ELIGIBILITY as readonly string[]).includes(outreachEligibility)) {
    return { ok: false, code: "invalid_outreach_eligibility", field: "outreachEligibility" };
  }

  const followUp = body.nextFollowUpAt === null || body.nextFollowUpAt === undefined
    ? null : Number(body.nextFollowUpAt);
  if (followUp !== null && (!Number.isSafeInteger(followUp) || followUp < 0)) {
    return { ok: false, code: "invalid_follow_up", field: "nextFollowUpAt" };
  }
  const estimate = body.estimateRon === null || body.estimateRon === undefined || body.estimateRon === ""
    ? null : Number(body.estimateRon);
  if (estimate !== null && (!Number.isSafeInteger(estimate) || estimate < 0 || estimate > 100_000_000)) {
    return { ok: false, code: "invalid_estimate", field: "estimateRon" };
  }

  return {
    ok: true,
    value: {
      organizationId: text(body.organizationId, 96),
      source: text(body.source, 100) || "manual",
      name,
      business,
      phone,
      email,
      message: text(body.message, 4_000),
      website: website || null,
      product: text(body.product, 300),
      preferredChannel: preferredChannel as LeadChannel | null,
      nextFollowUpAt: followUp,
      urgent: body.urgent === true,
      estimateRon: estimate,
      provenanceUrl: provenanceUrl || null,
      outreachEligibility: outreachEligibility as OutreachEligibility,
    },
  };
}
