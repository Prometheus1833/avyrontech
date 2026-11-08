import { apiUrl } from "./apiBase";
export const BLOG_COVER_FALLBACK = "/news/proces-produs-digital-avyron.webp";
export function resolveBlogMediaUrl(value?: string | null) {
  const path = value?.trim();
  if (!path) return BLOG_COVER_FALLBACK;
  if (path.startsWith("/api/")) return apiUrl(path);
  if (/^\/(?!\/)/.test(path) || /^https:\/\//i.test(path)) return path;
  return BLOG_COVER_FALLBACK;
}
