import { z } from "zod";

export const NOTICE_CATEGORIES = [
  "project",
  "subscription",
  "blog",
  "document",
  "activity",
] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];
export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  destination: string;
  read_at: number | null;
  created_at: number;
  category: NoticeCategory;
  priority: "normal" | "important";
};
const copy = z
  .object({
    ro: z.string().trim().min(4).max(240),
    en: z.string().trim().min(4).max(240),
  })
  .strict();
export const GUEST_CONTEXTS = [
  "general",
  "website",
  "commerce",
  "social",
  "logo",
  "ai",
] as const;
export const notificationSettingsSchema = z
  .object({
    guest: z
      .object({
        enabled: z.boolean(),
        delaySeconds: z.number().int().min(30).max(600),
        cooldownHours: z.number().int().min(1).max(720),
        messages: z
          .object(
            Object.fromEntries(
              GUEST_CONTEXTS.map((key) => [
                key,
                z.object({ title: copy, body: copy, cta: copy }).strict(),
              ]),
            ) as Record<
              (typeof GUEST_CONTEXTS)[number],
              z.ZodObject<{
                title: typeof copy;
                body: typeof copy;
                cta: typeof copy;
              }>
            >,
          )
          .strict(),
      })
      .strict(),
    events: z
      .object({
        projects: z.boolean(),
        subscriptions: z.boolean(),
        blog: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
const message = (ro: string, en: string, bodyRo: string, bodyEn: string) => ({
  title: { ro, en },
  body: { ro: bodyRo, en: bodyEn },
  cta: { ro: "Discută proiectul cu AVYRON", en: "Talk to AVYRON" },
});
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  guest: {
    enabled: true,
    delaySeconds: 60,
    cooldownHours: 24,
    messages: {
      general: message(
        "Următorul pas pentru afacerea ta",
        "Your next digital step",
        "De la idee la un proiect digital clar. Spune-ne obiectivul tău și discutăm serviciile potrivite.",
        "Turn an idea into a clear digital project. Tell us your goals and explore the right services.",
      ),
      website: message(
        "Un website construit pentru obiectivele tale",
        "A website built around your goals",
        "Design personalizat, structură clară și experiență adaptată pe mobil. Hai să discutăm website-ul afacerii tale.",
        "Custom design, a clear structure and a mobile-friendly experience. Let’s discuss your business website.",
      ),
      commerce: message(
        "Pregătește următorul pas în comerțul online",
        "Plan your next ecommerce step",
        "Catalog, plăți și experiență de cumpărare: discutăm împreună cerințele magazinului tău online.",
        "Catalog, payments and shopping experience: let’s explore what your online store needs.",
      ),
      social: message(
        "O prezență social media coerentă",
        "A consistent social media presence",
        "Conținut, identitate vizuală și campanii adaptate publicului tău. Stabilește cu AVYRON direcția potrivită.",
        "Content, visual identity and campaigns tailored to your audience. Explore your direction with AVYRON.",
      ),
      logo: message(
        "O identitate vizuală cu sens",
        "A visual identity with purpose",
        "Explorează direcția pentru logo-ul și imaginea brandului tău. Discutăm stilul, utilizările și livrabilele necesare.",
        "Explore a direction for your logo and brand. Let’s discuss style, usage and the deliverables you need.",
      ),
      ai: message(
        "Automatizări potrivite activității tale",
        "Automation for your workflow",
        "Ai un proces repetitiv sau o idee de agent AI? Clarificăm scenariul, integrările și limitele înainte de implementare.",
        "Have a repetitive process or an AI agent idea? Define the use case, integrations and limits before implementation.",
      ),
    },
  },
  events: { projects: true, subscriptions: true, blog: true },
};
export function guestContext(
  path: string,
): (typeof GUEST_CONTEXTS)[number] | null {
  if (
    /^\/(?:en\/)?(?:auth|autentificare|profil|intern|contact|gdpr|privacy|termeni|terms|politica-cookies|cookie-policy|unsubscribe|403|404|500|offline|mentenanta|exemple|examples|demo|checkout|cos|cart|surveys|survey)(?:\/|$)/.test(
      path,
    )
  )
    return null;
  if (/logo/.test(path)) return "logo";
  if (/magazin|ecommerce|online-store/.test(path)) return "commerce";
  if (/social|marketing|ads/.test(path)) return "social";
  if (/automatiz|automation|agent|artificial/.test(path)) return "ai";
  if (/website|site-prezentare|presentation|web-design/.test(path))
    return "website";
  return "general";
}
/** Only local destinations; HTML and arbitrary redirect URLs are never executed. */
export function notificationHref(destination: string): string | null {
  if (
    /^\/(?:profil|blog|en\/blog|intern\/projects)(?:[/?][a-zA-Z0-9_?=&%./-]*)?$/.test(
      destination,
    ) &&
    !destination.includes("..")
  )
    return destination;
  if (/^[a-z][a-z0-9-]*$/.test(destination))
    return `/profil?tab=${destination}`;
  return null;
}
