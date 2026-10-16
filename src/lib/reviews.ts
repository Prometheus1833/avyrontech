import { apiUrl } from "@/lib/apiBase";

export const WEBSITE_REVIEW_SURFACE = "service:premium-website";

export type PublicReview = {
  id: string;
  surface_key: string;
  source_type: "direct" | "external";
  source_platform: string | null;
  source_url: string | null;
  display_name: string;
  entity_type: "individual" | "srl" | "pfa" | "ii" | "other";
  brand_name: string | null;
  rating: number;
  review_text: string;
  reviewed_at: number | null;
};

export type AdminReview = PublicReview & {
  contact_email: string | null;
  status: "pending" | "approved" | "rejected";
  moderation_note: string | null;
  reviewed_by: string | null;
  created_at: number;
};

export type ReviewSubmission = {
  surfaceKey: typeof WEBSITE_REVIEW_SURFACE;
  displayName: string;
  email: string;
  entityType: PublicReview["entity_type"];
  brandName: string;
  rating: number;
  reviewText: string;
  publishConsent: boolean;
  turnstileToken: string;
  website: string;
};

export async function getPublicReviews(): Promise<PublicReview[]> {
  const response = await fetch(apiUrl(`/api/public/reviews?surface=${encodeURIComponent(WEBSITE_REVIEW_SURFACE)}`), {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("reviews_unavailable");
  const body = await response.json() as { data?: PublicReview[] };
  return body.data || [];
}

export async function submitReview(data: ReviewSubmission): Promise<void> {
  const response = await fetch(apiUrl("/api/public/reviews"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: { code?: string } };
    throw new Error(body.error?.code || "review_submission_failed");
  }
}
