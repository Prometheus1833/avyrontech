export const VISUAL_CATEGORIES = {
  logo: "Logouri",
  identity: "Identitate vizuală",
  icon: "Iconuri",
  image: "Imagini esențiale",
  guideline: "Ghiduri vizuale",
  other: "Alte resurse",
} as const;
export type VisualCategory = keyof typeof VISUAL_CATEGORIES;
export type VisualAsset = {
  id: string;
  scope: "agency" | "client";
  client_id: string | null;
  project_id: string | null;
  title: string;
  category: VisualCategory;
  description: string;
  tags: string[];
  file_name: string;
  content_type: string;
  size_bytes: number;
  sha256: string;
  scan_status: "quarantined" | "clean" | "rejected";
  archived_at: number | null;
  revision: number;
  created_by: string;
  created_at: number;
  updated_at: number;
  client_name: string | null;
  project_name: string | null;
  canEdit: boolean;
  canInspect: boolean;
};
export type VisualAssetInput = {
  scope: "agency" | "client";
  clientId: string | null;
  projectId: string | null;
  title: string;
  category: VisualCategory;
  description: string;
  tags: string[];
};
export type VisualOptions = {
  clients: { id: string; company_name: string }[];
  projects: { id: string; client_id: string; name: string }[];
  storageReady: boolean;
  backupReady: boolean;
  canManageAgency: boolean;
  scanner: "unconfigured";
};
