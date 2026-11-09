import { z } from "zod";
import { agencyPlatform, type AgencyCategory } from "./catalog";
export const AGENCY_STAGES = {
  identified: "Identificat",
  qualified: "Calificat",
  preparing: "Ofertă în pregătire",
  sent: "Ofertă trimisă",
  negotiation: "Negociere",
  won: "Câștigat",
  lost: "Pierdut",
} as const;
export const AGENCY_STATUSES = {
  unregistered: "Neînregistrat",
  started: "Înregistrare începută",
  pending: "În curs de aprobare",
  active: "Activ",
  review: "În verificare",
  rejected: "Respins",
  inactive: "Inactiv",
} as const;
export const AGENCY_CHECKS = {
  site: "Site operațional",
  b2b: "Înscriere B2B posibilă",
  romania: "România / încasare confirmate",
  freeFirst: "Fără plăți obligatorii în avans",
  activity: "Activitate comercială recentă",
  invoicing: "Contractare și facturare SRL",
} as const;
const id = z.string().trim().min(1).max(100);
const text = (n: number) => z.string().trim().max(n);
export const minor = z.number().int().min(0).max(9_000_000_000_000).safe();
export const currencySchema = z.enum(["RON", "EUR", "USD", "GBP", "AED"]);
export function safeAgencyUrl(value: string, hosts?: readonly string[]) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      ![...u.searchParams.keys()].some((k) =>
        /^(access_token|token|api_key|apikey|session|session_id|password|secret|jwt|authorization|auth_code)$/i.test(
          k,
        ),
      ) &&
      (!u.port || u.port === "443") &&
      (!hosts ||
        hosts.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) &&
      !/^(localhost|127\.|0\.|\[|10\.|192\.168\.)/.test(u.hostname)
    );
  } catch {
    return false;
  }
}
const url = text(2048).refine(
  (v) => !v || safeAgencyUrl(v),
  "Folosește un URL HTTPS valid, fără credențiale.",
);
const date = z
  .string()
  .refine(
    (v) =>
      !v ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v),
    "Data este invalidă.",
  );
export const platformInput = z
  .object({
    revision: z.number().int().nonnegative(),
    status: z.enum([
      "unregistered",
      "started",
      "pending",
      "active",
      "review",
      "rejected",
      "inactive",
    ]),
    category: z.enum(["free", "success", "review"]),
    profileUrl: url,
    ownerId: id.nullable(),
    notes: text(6000),
    nextReview: date,
    checks: z
      .object({
        site: z.boolean(),
        b2b: z.boolean(),
        romania: z.boolean(),
        freeFirst: z.boolean(),
        activity: z.boolean(),
        invoicing: z.boolean(),
      })
      .strict(),
    verificationNote: text(3000),
    evidenceUrls: z.array(url.refine(Boolean)).max(8),
  })
  .strict();
export type PlatformInput = z.infer<typeof platformInput>;
export const opportunityInput = z
  .object({
    platformId: id,
    title: text(200).min(3),
    clientName: text(200).min(2),
    clientId: id.nullable(),
    email: text(254).refine(
      (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "E-mail invalid.",
    ),
    phone: text(40),
    serviceId: id.nullable(),
    sourceUrl: url,
    sourceReference: text(200),
    kind: z.enum(["commercial", "subcontract", "research", "funding"]),
    budgetMin: minor.nullable(),
    budgetMax: minor.nullable(),
    currency: currencySchema,
    deadline: date,
    ownerId: id.nullable(),
    priority: z.enum(["high", "normal", "low"]),
    stage: z.enum([
      "identified",
      "qualified",
      "preparing",
      "sent",
      "negotiation",
      "won",
      "lost",
    ]),
    contractMinor: minor.nullable(),
    commissionBps: z.number().int().min(0).max(10000).nullable(),
    estimatedCostMinor: minor.nullable(),
    nextAction: text(1000).min(3),
    summary: text(6000),
    lossReason: text(1000),
    commissionNote: text(1000),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      v.budgetMin !== null &&
      v.budgetMax !== null &&
      v.budgetMin > v.budgetMax
    )
      c.addIssue({
        code: "custom",
        path: ["budgetMax"],
        message: "Bugetul maxim este sub minim.",
      });
    if (!v.sourceUrl && !v.sourceReference)
      c.addIssue({
        code: "custom",
        path: ["sourceReference"],
        message: "Completează linkul sau referința originală.",
      });
    if (v.stage === "won" && (!v.contractMinor || v.commissionBps === null))
      c.addIssue({
        code: "custom",
        path: ["contractMinor"],
        message:
          "Câștigarea necesită valoare contractuală și comision confirmat.",
      });
    if (v.stage === "lost" && !v.lossReason)
      c.addIssue({
        code: "custom",
        path: ["lossReason"],
        message: "Completează motivul pierderii.",
      });
  });
export type OpportunityInput = z.infer<typeof opportunityInput>;
export function agencyToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((p) => p.type === key)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const entryInput = z
  .object({
    kind: z.enum([
      "receipt",
      "commission",
      "platform_cost",
      "delivery_cost",
      "time",
    ]),
    amountMinor: minor,
    minutes: z.number().int().nonnegative().max(1_000_000),
    reference: text(200).min(3),
    note: text(1000).min(3),
    occurredOn: date.refine(
      (v) => !!v && v <= agencyToday(),
      "Nu consemna o încasare sau activitate viitoare ca fiind efectuată.",
    ),
  })
  .strict()
  .superRefine((v, c) => {
    if (
      v.kind === "time"
        ? v.minutes <= 0 || v.amountMinor !== 0
        : v.amountMinor <= 0 || v.minutes !== 0
    )
      c.addIssue({
        code: "custom",
        message: "Completează suma sau minutele, conform tipului.",
      });
  });
export type AgencyEntryInput = z.infer<typeof entryInput>;
export type AgencyOpportunity = OpportunityInput & {
  id: string;
  revision: number;
  leadId: string | null;
  createdAt: number;
  updatedAt: number;
  qualifiedAt: number | null;
  sentAt: number | null;
  wonAt: number | null;
  archivedAt: number | null;
};
export type AgencyAccount = PlatformInput & {
  platformId: string;
  verifiedAt: number | null;
  updatedAt: number | null;
  opportunityCount: number;
  wonCount: number;
};
export type AgencyEntry = AgencyEntryInput & {
  id: string;
  opportunityId: string;
  currency: string;
  createdAt: number;
  voidedAt: number | null;
  voidReason: string | null;
};
export const emptyChecks = (): PlatformInput["checks"] => ({
  site: false,
  b2b: false,
  romania: false,
  freeFirst: false,
  activity: false,
  invoicing: false,
});
export function platformPolicy(platformId: string, input: PlatformInput) {
  const p = agencyPlatform(platformId);
  if (!p) return "Platformă necunoscută.";
  const verified =
    Object.values(input.checks).every(Boolean) &&
    input.evidenceUrls.length > 0 &&
    input.verificationNote.length >= 20;
  if (input.profileUrl && !safeAgencyUrl(input.profileUrl, p.hosts))
    return "Profilul trebuie să aparțină platformei oficiale.";
  if (
    input.category !== "review" &&
    input.category !== (p.category === "review" ? "free" : p.category)
  )
    return "Categoria nu respectă modelul comercial verificat.";
  if (
    ((p.category === "review" && input.category !== "review") ||
      input.status === "active") &&
    !verified
  )
    return "Confirmă toate verificările, dovezile și condițiile înainte de activare.";
  if (input.status === "active" && input.category === "review")
    return "O sursă în verificare nu poate fi marcată activă.";
  return null;
}
export function agencyMargin(
  contract: number | null,
  bps: number | null,
  cost: number | null,
) {
  if (
    contract === null ||
    bps === null ||
    cost === null ||
    ![contract, bps, cost].every(Number.isSafeInteger) ||
    contract < 0 ||
    cost < 0 ||
    bps < 0 ||
    bps > 10000
  )
    return { complete: false, commissionMinor: null, estimatedNetMinor: null };
  const commissionMinor = Number(
    (BigInt(contract) * BigInt(bps) + 5000n) / 10000n,
  );
  return {
    complete: true,
    commissionMinor,
    estimatedNetMinor: contract - commissionMinor - cost,
  };
}
export const canonicalRequestUrl = (s: string) => {
  if (!s) return "";
  const u = new URL(s);
  u.hash = "";
  for (const k of [...u.searchParams.keys()])
    if (/^utm_|^(fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  return u.toString();
};
export type AgencyReport = {
  platformId: string;
  category: AgencyCategory;
  opportunities: number;
  relevant: number;
  offers: number;
  won: number;
  minutes: number;
  currencies: {
    currency: string;
    contracts: number;
    received: number;
    commissionPaid: number;
    platformCost: number;
    deliveryCost: number;
    cashNet: number;
  }[];
};

export type AgencyPermissions = {
  read: boolean;
  manage: boolean;
  financeRead: boolean;
  financeWrite: boolean;
  transfer: boolean;
  documents: boolean;
  operator: boolean;
};

export function agencyValidationMessage(error: {
  issues: { path: PropertyKey[]; message: string; code?: string }[];
}) {
  const issue = error.issues[0];
  if (!issue) return "Verifică datele și reîncearcă.";
  if (issue.code === "custom") return issue.message;
  if (issue.code === "unrecognized_keys")
    return "Datele conțin câmpuri nepermise. Reîncarcă formularul.";
  const labels: Record<string, string> = {
    title: "Titlu proiect",
    clientName: "Beneficiar",
    sourceReference: "Referința originală",
    sourceUrl: "Linkul cererii",
    nextAction: "Următoarea acțiune",
    budgetMin: "Buget minim",
    budgetMax: "Buget maxim",
    contractMinor: "Valoare contractată",
    commissionBps: "Comision",
    estimatedCostMinor: "Cost estimat",
    ownerId: "Responsabil",
    email: "E-mail",
    phone: "Telefon",
    notes: "Note",
    verificationNote: "Concluzia verificării",
    evidenceUrls: "Dovezi",
    amountMinor: "Sumă",
    minutes: "Minute",
    reference: "Referință",
    note: "Detalii",
    deadline: "Termen-limită",
    status: "Status",
    category: "Încadrare",
    occurredOn: "Data operațiunii",
  };
  const key = String(issue.path[issue.path.length - 1] || "");
  return labels[key]
    ? `Completează corect câmpul „${labels[key]}”.`
    : "Verifică datele obligatorii, limitele și formatul câmpurilor.";
}
