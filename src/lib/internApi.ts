// Client pentru rutele /api/projects* (Cloudflare Workers).
// Folosește cfAuth pentru access token + refresh automat.
import { cfAuth } from "./cfAuth";

export type BannerStatus = "online" | "offline" | "revizuire" | "in_progress" | "testing";
export type ProjectKind =
  | "website_prezentare"
  | "prezentare_premium"
  | "magazin_online"
  | "retele_sociale"
  | "identitate_completa"
  | "aplicatie";
export type ProposalStatus = "proposed" | "reviewed" | "in_progress" | "done" | "rejected";
export type LinkKind = "cloudflare" | "gsc" | "gbp" | "facebook" | "instagram" | "tiktok" | "youtube" | "linkedin" | "other";

export type Project = {
  id: string; slug: string; name: string; kind: ProjectKind;
  description: string | null; banner_status: BannerStatus; status: string;
  url: string | null; favicon_url: string | null;
  og_title: string | null; og_description: string | null; og_image_url: string | null;
  cover_image_url: string | null;
  price_ron: number | null; price_eur: number | null;
  subscription_plan: string | null; subscription_status: string | null; billing_next: number | null;
  owner_user_id: string | null; client_id: string;
  created_at: number; updated_at: number;
};
export type ProjectLink = { id: string; project_id: string; kind: LinkKind; label: string; url: string; updated_at: number };
export type ProjectProposal = { id: string; project_id: string; author_id: string; title: string; description: string | null; status: ProposalStatus; created_at: number; updated_at: number };
export type ProjectUpdate = { id: string; project_id: string; author_id: string | null; proposal_id: string | null; title: string; body: string | null; created_at: number };
export type ProjectStaff = { user_id: string; role: string; email: string; display_name: string | null; avatar_url: string | null };
export type ProjectLog = { id: string; actor_name: string | null; action: string; target_type: string | null; target_id: string | null; meta_json: string | null; created_at: number };

export type ProjectDetail = {
  project: Project;
  links: ProjectLink[];
  proposals: ProjectProposal[];
  updates: ProjectUpdate[];
  staff: ProjectStaff[];
  permission: { read: boolean; write: boolean; isStaff: boolean; isOwner: boolean };
};

export type ProjectMedia = {
  id: string; project_id: string; proposal_id: string | null; uploader_id: string;
  filename: string; content_type: string; size_bytes: number | null; created_at: number; url: string;
};

export const internApi = {
  listProjects: () => cfAuth.request<{ data: Array<Pick<Project, "id"|"slug"|"name"|"kind"|"banner_status"|"url"|"favicon_url"|"updated_at">> }>("/api/projects"),
  getProject: (slug: string) => cfAuth.request<ProjectDetail>(`/api/projects/${encodeURIComponent(slug)}`),
  createProject: (body: { name: string; slug: string; kind?: ProjectKind; url?: string; description?: string; client_id: string; owner_user_id?: string }) =>
    cfAuth.request<{ id: string; slug: string }>("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: string, patch: Partial<Project>) =>
    cfAuth.request<{ ok: true }>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  addProposal: (id: string, body: { title: string; description?: string }) =>
    cfAuth.request<{ id: string }>(`/api/projects/${id}/proposals`, { method: "POST", body: JSON.stringify(body) }),
  updateProposal: (id: string, patch: { status?: ProposalStatus; title?: string; description?: string }) =>
    cfAuth.request<{ ok: true }>(`/api/proposals/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  upsertLink: (projectId: string, body: { id?: string; kind: LinkKind; label: string; url: string }) =>
    cfAuth.request<{ id: string }>(`/api/projects/${projectId}/links`, { method: "POST", body: JSON.stringify(body) }),
  deleteLink: (linkId: string) => cfAuth.request<{ ok: true }>(`/api/links/${linkId}`, { method: "DELETE" }),
  getLogs: (id: string) => cfAuth.request<{ data: ProjectLog[] }>(`/api/projects/${id}/logs`),
  extractMetadata: (url: string) => cfAuth.request<{ url: string; title?: string; description?: string; image?: string; favicon?: string }>(`/api/metadata/extract?url=${encodeURIComponent(url)}`),

  // Media (R2)
  listMedia: (projectId: string) => cfAuth.request<{ data: ProjectMedia[] }>(`/api/projects/${projectId}/media`),
  uploadMedia: (projectId: string, file: File, proposalId?: string) => {
    const q = new URLSearchParams({ filename: file.name });
    if (proposalId) q.set("proposal_id", proposalId);
    return cfAuth.request<ProjectMedia>(`/api/projects/${projectId}/media?${q.toString()}`, {
      method: "POST",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
  },
  deleteMedia: (mediaId: string) => cfAuth.request<{ ok: true }>(`/api/media/${mediaId}`, { method: "DELETE" }),
};
