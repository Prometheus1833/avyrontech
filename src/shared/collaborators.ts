import { z } from "zod";
export const COLLABORATOR_CATEGORIES = {
  legal: "Juridic",
  financial: "Financiar",
  economic: "Economic",
  development: "Dezvoltare",
  marketing: "Marketing",
  other: "Alți parteneri",
} as const;
export const COLLABORATOR_STATUSES = {
  discussion: "În discuție",
  active: "Activ",
  paused: "În pauză",
  closed: "Încheiat",
} as const;
export const COLLABORATOR_LIMITS = { files: 3, fileBytes: 5_000_000 } as const;
const text = (n: number) => z.string().trim().max(n);
const phone = text(32).refine(
  (v) =>
    !v ||
    (/^\+?[\d ()-]{7,32}$/.test(v) &&
      v.replace(/\D/g, "").length >= 7 &&
      v.replace(/\D/g, "").length <= 15),
  "Folosește un număr de telefon valid.",
);
const date = text(10).refine(
  (v) =>
    !v ||
    (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v),
  "Data nu este validă.",
);
export const collaboratorInput = z
  .object({
    name: text(180).min(1),
    category: z.enum([
      "legal",
      "financial",
      "economic",
      "development",
      "marketing",
      "other",
    ]),
    relationship: z.enum(["partner", "collaborator"]),
    status: z.enum(["discussion", "active", "paused", "closed"]),
    contactName: text(180),
    email: text(254).refine(
      (v) => !v || z.email().safeParse(v).success,
      "E-mail nevalid.",
    ),
    phone,
    whatsapp: phone,
    website: text(500).refine((v) => {
      if (!v) return true;
      try {
        const u = new URL(v);
        return (
          ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
        );
      } catch {
        return false;
      }
    }, "Folosește o adresă http(s) validă."),
    specialization: text(240),
    summary: text(2000),
    terms: text(4000),
    internalNotes: text(4000),
    startsOn: date,
    endsOn: date,
    clientId: z.string().min(1).max(160).nullable(),
    accountUserId: z.string().min(1).max(160).nullable(),
  })
  .strict()
  .refine((v) => !v.startsOn || !v.endsOn || v.endsOn >= v.startsOn, {
    message: "Data de încheiere trebuie să urmeze data de început.",
    path: ["endsOn"],
  });
export type CollaboratorInput = z.infer<typeof collaboratorInput>;
export type Collaborator = Omit<
  CollaboratorInput,
  "clientId" | "accountUserId" | "internalNotes"
> & {
  id: string;
  code: string;
  clientId?: string | null;
  accountUserId?: string | null;
  internalNotes?: string;
  clientName?: string | null;
  accountEmail?: string | null;
  revision: number;
  archivedAt: number | null;
  createdAt: number;
  updatedAt: number;
  fileCount: number;
  canManage: boolean;
  canUpload: boolean;
};
export type CollaboratorFile = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  visible: boolean;
  createdAt: number;
  uploadedByMe: boolean;
  ready: boolean;
  canRemove: boolean;
};
export const blankCollaborator = (): CollaboratorInput => ({
  name: "",
  category: "other",
  relationship: "collaborator",
  status: "discussion",
  contactName: "",
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  specialization: "",
  summary: "",
  terms: "",
  internalNotes: "",
  startsOn: "",
  endsOn: "",
  clientId: null,
  accountUserId: null,
});
/** Only validated protocols; WhatsApp requires an explicit international number. Opening an app is never delivery. */
export function collaboratorContactLinks(
  c: Pick<CollaboratorInput, "phone" | "whatsapp" | "email">,
) {
  return {
    call:
      c.phone && phone.safeParse(c.phone).success
        ? "tel:" + c.phone.replace(/[ ()-]/g, "")
        : null,
    whatsapp: /^\+[1-9]\d{6,14}$/.test(c.whatsapp.replace(/[ ()-]/g, ""))
      ? "https://wa.me/" + c.whatsapp.replace(/\D/g, "")
      : null,
    email:
      c.email && z.email().safeParse(c.email).success
        ? "mailto:" + encodeURIComponent(c.email)
        : null,
  };
}
export function collaboratorWebsiteLink(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
