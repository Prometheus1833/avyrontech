interface AssetFetcher {
  fetch: (request: Request) => Promise<Response>;
}

const HASHED_ASSET_RE = /^\/assets\/.+-[a-z0-9_-]{6,}\.[a-z0-9]{2,5}$/i;
const MACHINE_READABLE_NOINDEX_RE = /^(?:\/llms\.txt|\/r\/[a-z0-9-]+\.json)$/i;

/** Cache-bustable Vite assets can safely remain in the browser for one year. */
export async function serveCachedAsset(fetcher: AssetFetcher, request: Request) {
  const response = await fetcher.fetch(request);
  if (!response.ok) return response;
  const pathname = new URL(request.url).pathname;
  if (!HASHED_ASSET_RE.test(pathname) && !MACHINE_READABLE_NOINDEX_RE.test(pathname)) return response;
  const headers = new Headers(response.headers);
  if (HASHED_ASSET_RE.test(pathname)) headers.set("cache-control", "public, max-age=31536000, immutable");
  if (MACHINE_READABLE_NOINDEX_RE.test(pathname)) headers.set("X-Robots-Tag", "noindex");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
