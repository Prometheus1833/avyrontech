import { BLOG_INDEX, BLOG_INDEX_EN } from "@/data/blogIndex";
import type { BlogLanguage, BlogPost } from "./blogApi";

export const blogPostTime = (value: string | number | null | undefined) => {
  const time = value == null ? 0 : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

/** The blog and landing page share the same published archive, overrides and order. */
export function mergeBlogPosts(
  remote: BlogPost[],
  local: BlogPost[],
  language: BlogLanguage,
  now = Date.now(),
) {
  const bySlug = new Map(local.map((post) => [post.slug, post]));
  for (const post of remote) {
    if (post.language !== language) continue;
    bySlug.set(post.slug, { ...bySlug.get(post.slug), ...post });
  }
  return [...bySlug.values()]
    .filter(
      (post) =>
        post.language === language &&
        post.status === "published" &&
        !!blogPostTime(post.published_at) &&
        blogPostTime(post.published_at) <= now,
    )
    .sort(
      (a, b) =>
        blogPostTime(b.published_at) - blogPostTime(a.published_at) ||
        a.slug.localeCompare(b.slug),
    );
}

export function staticBlogPosts(language: BlogLanguage): BlogPost[] {
  return mergeBlogPosts(
    [],
    (language === "en" ? BLOG_INDEX_EN : BLOG_INDEX).map((entry) => ({
      ...entry,
      language,
      status: "published",
      author_name: "Echipa Avyron",
      author_avatar_url: null,
      cover_image_alt: entry.cover_image_alt || entry.title,
      created_at: entry.published_at,
      alternate_slug: entry.has_translation === false ? null : entry.slug,
      translation_key: entry.slug,
    })),
    language,
  );
}
