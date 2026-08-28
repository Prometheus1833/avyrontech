const CACHEABLE_PUBLIC_PATHS = [
  /^\/api\/blog\/posts(?:\/[^/]+)?$/,
  /^\/api\/blog\/sitemap$/,
  /^\/api\/blog\/media\/[a-f0-9-]{36}\.(?:png|jpe?g|webp|avif)$/i,
  /^\/api\/profile\/avatar\/[a-zA-Z0-9-]+$/,
  /^\/api\/public\/domain-check$/,
];

const allowedParamsFor = (pathname: string) => {
  if (pathname === "/api/blog/posts") return new Set(["lang", "category", "limit"]);
  if (pathname.startsWith("/api/blog/posts/")) return new Set(["lang"]);
  if (pathname.startsWith("/api/profile/avatar/")) return new Set(["v"]);
  if (pathname === "/api/public/domain-check") return new Set(["domain"]);
  return new Set<string>();
};

/** A normalized cache key prevents arbitrary query strings from fragmenting edge cache. */
export function publicApiCacheRequest(request: Request): Request | null {
  if (request.method !== "GET" || request.headers.has("authorization") || request.headers.has("cookie")) return null;
  const url = new URL(request.url);
  if (url.hostname.endsWith(".internal") || !CACHEABLE_PUBLIC_PATHS.some((pattern) => pattern.test(url.pathname))) return null;
  const allowed = allowedParamsFor(url.pathname);
  for (const key of [...url.searchParams.keys()]) {
    if (!allowed.has(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return new Request(url, { method: "GET", headers: { accept: request.headers.get("accept") || "application/json" } });
}

