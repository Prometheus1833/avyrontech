import { apiUrl } from "./apiBase";
import { cfAuth } from "./cfAuth";

export type BlogLanguage = "ro" | "en";
export type BlogStatus = "draft" | "published" | "archived";

export type BlogPost = {
  id: string;
  author_id?: string;
  author_name?: string | null;
  author_avatar_url?: string | null;
  language: BlogLanguage;
  slug: string;
  alternate_slug?: string | null;
  translation_key?: string | null;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt?: string | null;
  category: string;
  tags: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  social_title?: string | null;
  social_description?: string | null;
  status: BlogStatus;
  published_at: string | number | null;
  created_at: string | number;
  updated_at: string | number;
};

export type BlogPostInput = {
  language: BlogLanguage;
  slug?: string;
  translationKey?: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  category: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  socialTitle?: string;
  socialDescription?: string;
  status: BlogStatus;
};

async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(response.status === 404 ? "not_found" : `HTTP ${response.status}`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error("invalid_api_response");
  return response.json() as Promise<T>;
}

export const blogApi = {
  listPublished: (language: BlogLanguage) =>
    publicRequest<{ data: BlogPost[] }>(`/api/blog/posts?lang=${language}&limit=100`),
  getPublished: (language: BlogLanguage, slug: string) =>
    publicRequest<{ data: BlogPost }>(`/api/blog/posts/${encodeURIComponent(slug)}?lang=${language}`),
  listStaff: () => cfAuth.request<{ data: BlogPost[] }>("/api/blog/staff/posts"),
  create: (body: BlogPostInput) => cfAuth.request<{ id: string; slug: string; status: BlogStatus }>("/api/blog/staff/posts", {
    method: "POST",
    body: JSON.stringify(body),
  }),
  update: (id: string, body: BlogPostInput) => cfAuth.request<{ ok: true; slug: string; status: BlogStatus }>(`/api/blog/staff/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),
  remove: (id: string) => cfAuth.request<{ ok: true }>(`/api/blog/staff/posts/${id}`, { method: "DELETE" }),
  uploadCover: async (file: File) => {
    const result = await cfAuth.request<{ url: string }>("/api/blog/staff/media", {
      method: "POST",
      headers: { "content-type": file.type },
      body: file,
    });
    return result;
  },
};
