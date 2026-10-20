export const WEBSITE_REVIEW_SURFACE = "service:premium-website";

export type ReviewEntityType = "individual" | "srl" | "pfa" | "ii" | "other";
export type ReviewSubmission = {
  surfaceKey: typeof WEBSITE_REVIEW_SURFACE;
  displayName: string;
  email: string;
  entityType: ReviewEntityType;
  brandName: string | null;
  rating: number;
  reviewText: string;
  turnstileToken: string;
  website: string;
};

const entityTypes = new Set<ReviewEntityType>(["individual", "srl", "pfa", "ii", "other"]);
const clean = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

export function parseReviewSubmission(value: unknown): { data: ReviewSubmission; error?: never } | { data?: never; error: string } {
  if (!value || typeof value !== "object") return { error: "invalid_submission" };
  const body = value as Record<string, unknown>;
  const surfaceKey = clean(body.surfaceKey);
  const displayName = clean(body.displayName);
  const email = clean(body.email).toLowerCase();
  const entityType = clean(body.entityType) as ReviewEntityType;
  const brandName = entityType === "individual" ? "" : clean(body.brandName);
  const reviewText = clean(body.reviewText);
  const rating = body.rating;
  if (surfaceKey !== WEBSITE_REVIEW_SURFACE) return { error: "unsupported_surface" };
  if (displayName.length < 2 || displayName.length > 80) return { error: "invalid_name" };
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) return { error: "invalid_email" };
  if (!entityTypes.has(entityType)) return { error: "invalid_entity_type" };
  if (entityType !== "individual" && (brandName.length < 2 || brandName.length > 120)) return { error: "invalid_brand" };
  if (!Number.isInteger(rating) || Number(rating) < 1 || Number(rating) > 5) return { error: "invalid_rating" };
  if (reviewText.length < 20 || reviewText.length > 1200) return { error: "invalid_review" };
  if (body.publishConsent !== true) return { error: "consent_required" };
  return { data: {
    surfaceKey: WEBSITE_REVIEW_SURFACE,
    displayName,
    email,
    entityType,
    brandName: brandName || null,
    rating: Number(rating),
    reviewText,
    turnstileToken: clean(body.turnstileToken).slice(0, 4000),
    website: clean(body.website),
  } };
}
