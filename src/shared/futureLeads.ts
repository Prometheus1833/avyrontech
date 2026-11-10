import { z } from "zod";
import { PROJECT_KIND_LABELS } from "./projectSummary";
export const FUTURE_LEAD_STATUSES = {
  scheduled: "Programat",
  contacted: "Contactat",
  converted: "Transformat în proiect",
  archived: "Arhivat",
} as const;
export type FutureLeadStatus = keyof typeof FUTURE_LEAD_STATUSES;
export const futureLeadInput = z
  .object({
    title: z.string().trim().min(2).max(180),
    name: z.string().trim().max(160),
    business: z.string().trim().max(200),
    email: z.union([z.literal(""), z.email().max(254)]),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine(
        (v) =>
          !v || (/^[+()\d .-]+$/.test(v) && v.replace(/\D/g, "").length >= 6),
      ),
    source: z.string().trim().min(2).max(100),
    requirements: z.string().trim().max(500),
    contactOn: z
      .string()
      .regex(/^20\d{2}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
      ),
    projectKind: z.enum(
      Object.keys(PROJECT_KIND_LABELS) as [
        keyof typeof PROJECT_KIND_LABELS,
        ...Array<keyof typeof PROJECT_KIND_LABELS>,
      ],
    ),
    clientId: z.string().min(1).max(160).nullable(),
    staffIds: z
      .array(z.string().min(1).max(160))
      .max(30)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict()
  .refine((v) => !!(v.name || v.business), {
    message: "Completează numele clientului sau firma.",
    path: ["name"],
  });
export type FutureLeadInput = z.infer<typeof futureLeadInput>;
export type FutureLeadRow = {
  lead_id: string;
  title: string;
  name: string | null;
  business: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  requirements: string;
  contact_on: string;
  project_kind: keyof typeof PROJECT_KIND_LABELS;
  client_id: string | null;
  client_name: string | null;
  status: FutureLeadStatus;
  revision: number;
  schedule_version: number;
  scheduled_at: number;
  created_at: number;
  updated_at: number;
  converted_project_id: string | null;
  project_slug: string | null;
  staff: { id: string; name: string; role: string }[];
  can_edit: boolean;
};
export type FutureLeadBootstrap = {
  canManage: boolean;
  canCreate: boolean;
  canConvert: boolean;
  currentUserId: string;
  staff: { id: string; name: string }[];
  clients: {
    id: string;
    name: string;
    contact_name?: string | null;
    email?: string;
    phone?: string | null;
  }[];
};
const dayFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Bucharest",
  hour: "2-digit",
  hourCycle: "h23",
});
export const bucharestDay = (time = Date.now()) => dayFormatter.format(time);
export const futureDays = (day: string, today = bucharestDay()) =>
  Math.round((Date.parse(day) - Date.parse(today)) / 86_400_000);
/** Catch up only the latest eligible threshold. New entries do not backfill earlier reminders. */
export function futureReminderOffset(
  contactOn: string,
  scheduledAt: number,
  timestamp = Date.now(),
): 10 | 5 | 1 | null {
  const days = futureDays(contactOn, bucharestDay(timestamp));
  const hour = Number(hourFormatter.format(timestamp));
  if (days < 0 || days > 10 || hour < 9) return null;
  const offset = ([1, 5, 10] as const).find((n) => days <= n)!;
  return futureDays(contactOn, bucharestDay(scheduledAt)) >= offset
    ? offset
    : null;
}
export function futureLeadError(error: unknown): string {
  const code =
    (error as { code?: string })?.code || (error as Error)?.message || "";
  return (
    (
      {
        revision_conflict: "Fișa s-a modificat. Reîncarcă înainte de a salva.",
        duplicate_lead:
          "Contactul există deja în CRM. Alege «Din Leaduri» pentru a-l programa.",
        already_scheduled: "Leadul este deja în această listă.",
        invalid_date: "Alege astăzi sau o dată viitoare.",
        invalid_staff: "Un membru selectat nu mai este activ.",
        rate_limited:
          "Prea multe operațiuni. Așteaptă puțin și încearcă din nou.",
        forbidden: "Nu ai drepturi pentru această acțiune.",
        invalid_client: "Clientul nu este disponibil pentru alocare.",
        idempotency_key_reused:
          "Cererea s-a schimbat. Închide fișa și încearcă din nou.",
        invalid_input:
          "Verifică datele completate (maximum 500 caractere pentru cerințe).",
      } as Record<string, string>
    )[code] ||
    "Operațiunea nu a reușit. Datele introduse sunt păstrate; încearcă din nou."
  );
}
