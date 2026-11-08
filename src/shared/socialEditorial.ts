import { z } from "zod";

export const socialViews = ["focus", "upcoming", "library", "history"] as const;
export type SocialView = (typeof socialViews)[number];
export const socialChannels = [
  "facebook",
  "instagram",
  "tiktok",
  "threads",
  "linkedin",
  "whatsapp",
  "messenger",
  "blog",
] as const;
export const socialDraftSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    caption: z.string().trim().min(10).max(8000),
    format: z.enum(["post", "story", "reel", "carousel", "message", "article"]),
    objective: z
      .enum(["sales", "promotion", "visibility", "monetization", "community"])
      .default("visibility"),
    channels: z
      .array(z.enum(socialChannels))
      .min(1)
      .max(8)
      .transform((v) => [...new Set(v)]),
    visualDirection: z.string().trim().max(4000).default(""),
    cta: z.string().trim().max(500).default(""),
    hashtags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
    scheduledAt: z.number().int().nonnegative().nullable().default(null),
    reusable: z.boolean().default(true),
    requestApproval: z.boolean().default(false),
    sourceRef: z
      .string()
      .regex(/^[a-zA-Z0-9_:./-]{1,160}$/)
      .optional(),
    sourceRevision: z.string().trim().min(1).max(80).optional(),
    variants: z
      .array(
        z
          .object({
            channel: z.enum(socialChannels),
            account: z.string().trim().max(160).default(""),
            placement: z.string().trim().max(60).default("feed"),
            caption: z.string().trim().max(8000),
          })
          .strict(),
      )
      .max(24)
      .default([]),
    provenance: z
      .object({
        campaign: z.string().trim().max(160).optional(),
        serviceFocus: z.string().trim().max(80).optional(),
        assetState: z.enum(["stored", "awaiting_r2_authorization"]).optional(),
        pendingAssets: z
          .array(
            z
              .object({
                id: z.string().max(120),
                sha256: z.string().regex(/^[a-f0-9]{64}$/),
                bytes: z.number().int().nonnegative(),
                width: z.number().int().positive().optional(),
                height: z.number().int().positive().optional(),
              })
              .strict(),
          )
          .max(30)
          .optional(),
        qa: z.string().trim().max(2000).optional(),
        approvalReference: z.string().trim().max(500).optional(),
        assetIds: z
          .array(z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/))
          .max(30)
          .default([]),
        placements: z
          .array(
            z
              .object({
                channel: z.enum(socialChannels),
                account: z.string().max(160),
                placement: z.string().max(60),
                status: z.enum([
                  "not_approved",
                  "pending_approval",
                  "published_verified",
                  "duplicate_skipped",
                  "blocked_with_reason",
                  "correction_required",
                  "unsupported",
                ]),
                evidence: z.string().max(1000).default(""),
              })
              .strict(),
          )
          .max(32)
          .default([]),
      })
      .strict()
      .default({ assetIds: [], placements: [] }),
  })
  .strict()
  .refine((v) => Boolean(v.sourceRef) === Boolean(v.sourceRevision), {
    message: "Sursa și revizia se completează împreună.",
  });
export type SocialDraftInput = z.input<typeof socialDraftSchema>;
export type SocialDraft = z.output<typeof socialDraftSchema>;
export function socialDateInput(
  timestamp: number,
  timezone = "Europe/Bucharest",
) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(timestamp))
    .replace(" ", "T");
}
export function socialDateEpoch(
  value: string,
  timezone = "Europe/Bucharest",
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const target = Date.parse(value + ":00Z");
  if (!Number.isFinite(target)) return null;
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const local = Date.parse(socialDateInput(guess, timezone) + ":00Z"),
      delta = target - local;
    if (!delta)
      return socialDateInput(guess, timezone) === value ? guess : null;
    guess += delta;
  }
  return null;
}
export const socialStatusLabels: Record<string, string> = {
  draft: "Ciornă",
  pending_approval: "De aprobat",
  approved: "Aprobat",
  scheduled: "Programat",
  published: "Publicat",
  rejected: "Respins",
  expired: "Expirat",
  queued: "Planificat",
  generating: "În pregătire",
  draft_ready: "Material pregătit",
  awaiting_budget: "Buget / resursă indisponibilă",
  awaiting_approval: "Necesită verificare",
  failed: "Pregătire eșuată",
  completed: "Finalizat",
  skipped: "Oprit",
};
