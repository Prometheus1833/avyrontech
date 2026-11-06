export const ANTIVIRUS_LIMITS = {
  monthlyScans: 500,
  fileBytes: 25_000_000,
  quarantineBytes: 50_000_000,
} as const;
export const ANTIVIRUS_SOURCES = [
  "documents",
  "visual_assets",
  "project_media",
  "survey",
  "finance",
  "engine",
  "blog",
  "avatar",
  "contact",
  "products",
  "synthetic",
] as const;
export type AntivirusSource = (typeof ANTIVIRUS_SOURCES)[number];
export const ANTIVIRUS_SOURCE_LABELS: Record<AntivirusSource, string> = {
  documents: "Document Center",
  visual_assets: "Media / resurse vizuale",
  project_media: "Proiecte",
  survey: "Smart Surveys",
  finance: "Financiar",
  engine: "AVY Engine",
  blog: "Coperte blog",
  avatar: "Avatare",
  contact: "Atașamente contact",
  products: "Produse digitale",
  synthetic: "Teste sintetice",
};
export const ANTIVIRUS_STATUS_LABELS = {
  quarantined: "În carantină",
  submitting: "Se transmite",
  pending: "În scanare",
  clean: "CLEAN",
  malicious: "Malware detectat",
  suspicious: "Suspect",
  failed: "Eroare",
  unknown: "Transmitere incertă",
  purging: "Eliminare în curs",
  purged: "Carantină eliminată",
} as const;
export type AntivirusStatus = keyof typeof ANTIVIRUS_STATUS_LABELS;
export type AntivirusJob = {
  id: string;
  source: AntivirusSource;
  status: AntivirusStatus;
  size_bytes: number;
  mime_type: string;
  sensitive: number;
  reason: string | null;
  attempts: number;
  quarantine_held: number;
  created_at: number;
  updated_at: number;
  provider_scan_id: string | null;
};
export type AntivirusOverview = {
  provider: "bouncer";
  storageVerified: boolean;
  configured: boolean;
  enabled: boolean;
  sensitiveApproved: boolean;
  complianceReasons: string[];
  quota: {
    period: string;
    reserved: number;
    provider_used: number;
    provider_limit: number;
    checked_at: number;
  } | null;
  storageBytes: number;
  counts: Record<string, number>;
  jobs: AntivirusJob[];
  legacy: {
    id: string;
    source: AntivirusSource;
    bucket: "FILES" | "MEDIA";
    size_bytes: number;
  }[];
  legacyCount: number;
  events: {
    id: string;
    scan_id: string | null;
    source: string;
    action: string;
    code: string | null;
    created_at: number;
  }[];
};
