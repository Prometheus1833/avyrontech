/** Baseline enforcement is compatible with the existing editor/3D previews.
 * Script restrictions start report-only, until real integration reports are reviewed. */
export function htmlSecurityHeaders(
  request: Request,
  response: Response,
  options: { privatePage?: boolean; cspMode?: string } = {},
) {
  if (
    !response.headers.get("content-type")?.toLowerCase().includes("text/html")
  )
    return response;
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set(
    "Referrer-Policy",
    options.privatePage ? "no-referrer" : "strict-origin-when-cross-origin",
  );
  if (new URL(request.url).protocol === "https:")
    headers.set("Strict-Transport-Security", "max-age=31536000");
  const baseline = "object-src 'none'; base-uri 'self'; frame-ancestors 'self'";
  const scripts =
    "script-src 'self' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com; script-src-attr 'none'";
  if (!headers.has("Content-Security-Policy"))
    headers.set(
      "Content-Security-Policy",
      options.cspMode === "enforce" ? baseline + "; " + scripts : baseline,
    );
  if (options.cspMode !== "enforce")
    headers.set(
      "Content-Security-Policy-Report-Only",
      scripts + "; report-uri /api/security/csp-report",
    );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
