import { Hono } from "hono";
import type { AppBindings } from "./types";

type BlogStatus = "draft" | "published" | "archived";
type BlogLanguage = "ro" | "en";

type BlogRow = {
  id: string;
  author_id: string;
  language: BlogLanguage;
  slug: string;
  translation_key: string | null;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  category: string;
  tags_json: string;
  seo_title: string | null;
  seo_description: string | null;
  social_title: string | null;
  social_description: string | null;
  status: BlogStatus;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  author_name?: string | null;
  author_avatar_url?: string | null;
  alternate_slug?: string | null;
};

type BlogInput = {
  language?: unknown;
  slug?: unknown;
  translationKey?: unknown;
  title?: unknown;
  excerpt?: unknown;
  content?: unknown;
  coverImageUrl?: unknown;
  coverImageAlt?: unknown;
  category?: unknown;
  tags?: unknown;
  seoTitle?: unknown;
  seoDescription?: unknown;
  socialTitle?: unknown;
  socialDescription?: unknown;
  status?: unknown;
};

const blogRouter = new Hono<AppBindings>();
const PUBLIC_SELECT = `
  p.id,p.author_id,p.language,p.slug,p.translation_key,p.title,p.excerpt,p.content,
  p.cover_image_url,p.cover_image_alt,p.category,p.tags_json,p.seo_title,p.seo_description,
  p.social_title,p.social_description,p.status,p.published_at,p.created_at,p.updated_at,
  COALESCE(pr.pseudonym,pr.display_name,u.display_name,'Echipa Avyron') AS author_name,
  COALESCE(pr.avatar_url,u.avatar_url) AS author_avatar_url,
  (SELECT alt.slug FROM blog_posts alt
    WHERE alt.translation_key=p.translation_key AND alt.language<>p.language
      AND alt.status='published' AND alt.published_at IS NOT NULL
    ORDER BY alt.published_at DESC LIMIT 1) AS alternate_slug`;

const now = () => Date.now();
const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const slugify = (value: string) => value
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 96);

const plainText = (value: string) => value
  .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[#>*_`~-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const validUrl = (value: string) => {
  if (!value) return true;
  if (value.startsWith("/api/blog/media/") || value.startsWith("/news/") || value.startsWith("/og/")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};

const matchesImageSignature = (bytes: ArrayBuffer, type: string) => {
  const data = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 32));
  if (type === "image/png") return data.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => data[index] === value);
  if (/^image\/jpe?g$/.test(type)) return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const ascii = String.fromCharCode(...data);
  if (type === "image/webp") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  if (type === "image/avif") return ascii.slice(4, 8) === "ftyp" && /(?:avif|avis)/.test(ascii.slice(8));
  return false;
};

const parseTags = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : String(value ?? "").split(",");
  return [...new Set(source.map((tag) => slugify(String(tag))).filter(Boolean))].slice(0, 8);
};

const serialize = (row: BlogRow) => {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags_json);
    if (Array.isArray(parsed)) tags = parsed.filter((tag): tag is string => typeof tag === "string");
  } catch { /* Invalid legacy JSON is represented as an empty list. */ }
  const { tags_json: _tagsJson, ...post } = row;
  return { ...post, tags };
};

export async function getPublishedBlogPost(db: D1Database, language: BlogLanguage, rawSlug: string) {
  const slug = slugify(rawSlug);
  const row = await db.prepare(
    `SELECT ${PUBLIC_SELECT} FROM blog_posts p
      JOIN users u ON u.id=p.author_id LEFT JOIN profiles pr ON pr.id=p.author_id
      WHERE p.language=? AND p.slug=? AND p.status='published'
        AND p.published_at IS NOT NULL AND p.published_at<=? LIMIT 1`,
  ).bind(language, slug, now()).first<BlogRow>();
  return row ? serialize(row) : null;
}

export async function getBlogSitemapEntries(db: D1Database) {
  const { results } = await db.prepare(
    `SELECT p.language,p.slug,p.updated_at,
      (SELECT alt.slug FROM blog_posts alt
        WHERE alt.translation_key=p.translation_key AND alt.language<>p.language
          AND alt.status='published' AND alt.published_at IS NOT NULL
        ORDER BY alt.published_at DESC LIMIT 1) AS alternate_slug
      FROM blog_posts p
      WHERE p.status='published' AND p.published_at IS NOT NULL AND p.published_at<=?
      ORDER BY p.updated_at DESC LIMIT 5000`,
  ).bind(now()).all<{ language: BlogLanguage; slug: string; alternate_slug: string | null; updated_at: number }>();
  return results;
}

const normalizedInput = (body: BlogInput, existing?: BlogRow) => {
  const language = clean(body.language ?? existing?.language ?? "ro", 2) as BlogLanguage;
  const title = clean(body.title ?? existing?.title, 180);
  const content = clean(body.content ?? existing?.content, 60000);
  const generatedExcerpt = plainText(content).slice(0, 220);
  const excerpt = clean(body.excerpt ?? existing?.excerpt ?? generatedExcerpt, 320);
  const requestedSlug = clean(body.slug ?? existing?.slug ?? title, 120);
  const slug = slugify(requestedSlug);
  const status = clean(body.status ?? existing?.status ?? "draft", 12) as BlogStatus;
  const category = slugify(clean(body.category ?? existing?.category ?? "digital", 48)) || "digital";
  const tags = body.tags === undefined && existing ? parseTags(existing.tags_json) : parseTags(body.tags);
  const coverImageUrl = clean(body.coverImageUrl ?? existing?.cover_image_url, 1000) || null;
  const result = {
    language,
    slug,
    translationKey: slugify(clean(body.translationKey ?? existing?.translation_key, 96)) || null,
    title,
    excerpt,
    content,
    coverImageUrl,
    coverImageAlt: clean(body.coverImageAlt ?? existing?.cover_image_alt ?? title, 180) || null,
    category,
    tags,
    seoTitle: clean(body.seoTitle ?? existing?.seo_title, 70) || null,
    seoDescription: clean(body.seoDescription ?? existing?.seo_description ?? excerpt, 170) || null,
    socialTitle: clean(body.socialTitle ?? existing?.social_title ?? title, 100) || null,
    socialDescription: clean(body.socialDescription ?? existing?.social_description ?? excerpt, 220) || null,
    status,
  };
  if (!(["ro", "en"] as string[]).includes(result.language)) return { error: "invalid_language" } as const;
  if (!(["draft", "published", "archived"] as string[]).includes(result.status)) return { error: "invalid_status" } as const;
  if (result.title.length < 8) return { error: "title_too_short" } as const;
  if (result.slug.length < 3) return { error: "invalid_slug" } as const;
  if (result.excerpt.length < 40) return { error: "excerpt_too_short" } as const;
  if (result.content.length < 120) return { error: "content_too_short" } as const;
  if (!validUrl(result.coverImageUrl || "")) return { error: "invalid_cover_url" } as const;
  return { value: result } as const;
};

blogRouter.get("/api/blog/posts", async (c) => {
  const language = c.req.query("lang") === "en" ? "en" : "ro";
  const limit = Math.min(Math.max(Number(c.req.query("limit") || 50), 1), 100);
  const category = slugify(c.req.query("category") || "");
  const params: unknown[] = [language, now()];
  let where = "p.language=? AND p.status='published' AND p.published_at IS NOT NULL AND p.published_at<=?";
  if (category) { where += " AND p.category=?"; params.push(category); }
  params.push(limit);
  const { results } = await c.env.DB.prepare(
    `SELECT ${PUBLIC_SELECT} FROM blog_posts p
      JOIN users u ON u.id=p.author_id LEFT JOIN profiles pr ON pr.id=p.author_id
      WHERE ${where} ORDER BY p.published_at DESC LIMIT ?`,
  ).bind(...params).all<BlogRow>();
  c.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
  return c.json({ data: results.map(serialize) });
});

blogRouter.get("/api/blog/posts/:slug", async (c) => {
  const language = c.req.query("lang") === "en" ? "en" : "ro";
  const post = await getPublishedBlogPost(c.env.DB, language, c.req.param("slug"));
  if (!post) return c.json({ error: { code: "not_found" } }, 404);
  c.header("cache-control", "public, max-age=120, stale-while-revalidate=600");
  return c.json({ data: post });
});

blogRouter.get("/api/blog/sitemap", async (c) => {
  const results = await getBlogSitemapEntries(c.env.DB);
  c.header("cache-control", "public, max-age=300, stale-while-revalidate=3600");
  return c.json({ data: results });
});

blogRouter.get("/api/blog/staff/posts", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT ${PUBLIC_SELECT} FROM blog_posts p
      JOIN users u ON u.id=p.author_id LEFT JOIN profiles pr ON pr.id=p.author_id
      ORDER BY p.updated_at DESC LIMIT 500`,
  ).all<BlogRow>();
  c.header("cache-control", "private, no-store");
  return c.json({ data: results.map(serialize) });
});

blogRouter.post("/api/blog/staff/posts", async (c) => {
  const input = normalizedInput(await c.req.json().catch(() => ({})) as BlogInput);
  if ("error" in input) return c.json({ error: { code: input.error } }, 400);
  const value = input.value;
  const id = crypto.randomUUID();
  const timestamp = now();
  const publishedAt = value.status === "published" ? timestamp : null;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO blog_posts
          (id,author_id,language,slug,translation_key,title,excerpt,content,cover_image_url,cover_image_alt,
           category,tags_json,seo_title,seo_description,social_title,social_description,status,published_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).bind(
        id,c.get("userId"),value.language,value.slug,value.translationKey,value.title,value.excerpt,value.content,
        value.coverImageUrl,value.coverImageAlt,value.category,JSON.stringify(value.tags),value.seoTitle,value.seoDescription,
        value.socialTitle,value.socialDescription,value.status,publishedAt,timestamp,timestamp,
      ),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
        .bind(c.get("userId"), "blog_create", JSON.stringify({ targetType: "blog_post", targetId: id }), timestamp),
    ]);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return c.json({ error: { code: "slug_taken" } }, 409);
    throw error;
  }
  return c.json({ id, slug: value.slug, status: value.status }, 201);
});

blogRouter.patch("/api/blog/staff/posts/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await c.env.DB.prepare("SELECT * FROM blog_posts WHERE id=?").bind(id).first<BlogRow>();
  if (!existing) return c.json({ error: { code: "not_found" } }, 404);
  const input = normalizedInput(await c.req.json().catch(() => ({})) as BlogInput, existing);
  if ("error" in input) return c.json({ error: { code: input.error } }, 400);
  const value = input.value;
  const timestamp = now();
  const publishedAt = value.status === "published" ? (existing.published_at || timestamp) : null;
  try {
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO blog_post_revisions (id,post_id,editor_id,snapshot_json,created_at) VALUES (?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, c.get("userId"), JSON.stringify(existing), timestamp),
      c.env.DB.prepare(
        `UPDATE blog_posts SET language=?,slug=?,translation_key=?,title=?,excerpt=?,content=?,cover_image_url=?,
          cover_image_alt=?,category=?,tags_json=?,seo_title=?,seo_description=?,social_title=?,social_description=?,
          status=?,published_at=?,updated_at=? WHERE id=?`,
      ).bind(
        value.language,value.slug,value.translationKey,value.title,value.excerpt,value.content,value.coverImageUrl,
        value.coverImageAlt,value.category,JSON.stringify(value.tags),value.seoTitle,value.seoDescription,
        value.socialTitle,value.socialDescription,value.status,publishedAt,timestamp,id,
      ),
      c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
        .bind(c.get("userId"), "blog_update", JSON.stringify({ targetType: "blog_post", targetId: id }), timestamp),
    ]);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) return c.json({ error: { code: "slug_taken" } }, 409);
    throw error;
  }
  return c.json({ ok: true, slug: value.slug, status: value.status });
});

blogRouter.delete("/api/blog/staff/posts/:id", async (c) => {
  if (!(c.get("roles") || []).includes("admin")) return c.json({ error: { code: "admin_required" } }, 403);
  const id = c.req.param("id");
  const result = await c.env.DB.prepare("DELETE FROM blog_posts WHERE id=?").bind(id).run();
  if (!result.meta.changes) return c.json({ error: { code: "not_found" } }, 404);
  await c.env.DB.prepare("INSERT INTO audit_log (user_id,action,meta_json,created_at) VALUES (?,?,?,?)")
    .bind(c.get("userId"), "blog_delete", JSON.stringify({ targetType: "blog_post", targetId: id }), now()).run();
  return c.json({ ok: true });
});

blogRouter.post("/api/blog/staff/media", async (c) => {
  const type = (c.req.header("content-type") || "").toLowerCase();
  const extension = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/avif" ? "avif" : /^image\/jpe?g$/.test(type) ? "jpg" : "";
  if (!extension) return c.json({ error: { code: "unsupported_type" } }, 415);
  const advertised = Number(c.req.header("content-length") || 0);
  if (advertised > 5 * 1024 * 1024) return c.json({ error: { code: "too_large" } }, 413);
  const bytes = await c.req.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) return c.json({ error: { code: "too_large" } }, 413);
  if (!matchesImageSignature(bytes, type)) return c.json({ error: { code: "invalid_image" } }, 415);
  const filename = `${crypto.randomUUID()}.${extension}`;
  await c.env.MEDIA.put(`blog/covers/${filename}`, bytes, {
    httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" },
    customMetadata: { uploadedBy: c.get("userId"), kind: "blog-cover" },
  });
  return c.json({ url: `/api/blog/media/${filename}` }, 201);
});

blogRouter.get("/api/blog/media/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!/^[a-f0-9-]{36}\.(?:png|jpe?g|webp|avif)$/i.test(filename)) return c.body(null, 404);
  const object = await c.env.MEDIA.get(`blog/covers/${filename}`);
  if (!object) return c.body(null, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("content-length", String(object.size));
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

export { blogRouter };
