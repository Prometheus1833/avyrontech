interface AssetFetcher {
  fetch: (request: Request) => Promise<Response>;
}

const HASHED_ASSET_RE = /^\/assets\/.+-[a-z0-9_-]{6,}\.[a-z0-9]{2,5}$/i;

/** Cache-bustable Vite assets can safely remain in the browser for one year. */
export async function serveCachedAsset(fetcher: AssetFetcher, request: Request) {
  const response = await fetcher.fetch(request);
  if (!response.ok || !HASHED_ASSET_RE.test(new URL(request.url).pathname)) return response;
  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
