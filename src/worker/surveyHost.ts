/** Dedicated host routing for the public Smart Surveys surface. */
export async function serveSurveyHost(
  request: Request,
  assets: { fetch: (request: Request) => Promise<Response> },
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.hostname !== "surveys.avyron.ro") return null;
  if (url.pathname.startsWith("/api/")) return null;

  const method = request.method === "HEAD" ? "HEAD" : "GET";
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const privatePage = url.pathname.startsWith("/s/") || url.pathname === "/auth";
  const baseHeaders: Record<string, string> = {
    "Cache-Control": privatePage ? "private, no-store" : "public, max-age=300",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": privatePage ? "noindex, nofollow" : "index, follow",
  };

  if (url.pathname === "/robots.txt") {
    const body = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /intern/",
      "Disallow: /s/",
      "Sitemap: https://surveys.avyron.ro/sitemap.xml",
      "",
    ].join("\n");
    return new Response(method === "HEAD" ? null : body, {
      headers: { ...baseHeaders, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (url.pathname === "/sitemap.xml") {
    const asset = await assets.fetch(new Request(new URL("/surveys-sitemap.xml", url.origin), { method }));
    const headers = new Headers(asset.headers);
    Object.entries(baseHeaders).forEach(([key, value]) => headers.set(key, value));
    headers.set("Content-Type", "application/xml; charset=utf-8");
    return new Response(asset.ok ? asset.body : null, {
      status: asset.ok ? 200 : 503,
      headers,
    });
  }

  if (url.pathname === "/surveys") {
    return Response.redirect(`https://surveys.avyron.ro/${url.search}`, 301);
  }
  if (url.pathname === "/gdpr" || url.pathname === "/termeni") {
    return Response.redirect(`https://avyron.ro${url.pathname}`, 302);
  }

  if (
    url.pathname.startsWith("/assets/")
    || ["/favicon.ico", "/favicon.svg", "/site.webmanifest", "/apple-touch-icon.png"].includes(url.pathname)
  ) {
    return assets.fetch(request);
  }

  const known = url.pathname === "/" || url.pathname === "/auth" || /^\/s\/[a-f0-9]{64}$/.test(url.pathname);
  const assetPath = url.pathname === "/" ? "/surveys/index.html" : known ? "/_shell.html" : "/404.html";
  let asset = await assets.fetch(new Request(new URL(assetPath, url.origin), { method }));

  // Static Assets may canonicalize .html paths. Follow only local asset redirects.
  for (let hop = 0; hop < 3 && asset.status >= 300 && asset.status < 400; hop += 1) {
    const location = asset.headers.get("Location");
    if (!location) break;
    const target = new URL(location, url.origin);
    if (target.origin !== url.origin || target.pathname.startsWith("/api/") || target.pathname.startsWith("/s/")) break;
    asset = await assets.fetch(new Request(target, { method }));
  }

  const headers = new Headers(asset.headers);
  Object.entries(baseHeaders).forEach(([key, value]) => headers.set(key, value));
  headers.set("Content-Type", "text/html; charset=utf-8");
  if (!known) headers.set("X-Robots-Tag", "noindex, nofollow");

  return new Response(asset.body, {
    status: asset.ok ? (known ? 200 : 404) : 503,
    headers,
  });
}
