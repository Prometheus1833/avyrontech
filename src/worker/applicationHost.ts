/** The application hostname is never a second search surface for public pages. */
export function applicationHostResponse(request: Request, response: Response): Response {
  if (new URL(request.url).hostname.toLowerCase().replace(/\.$/, "") !== "app.avyron.ro") return response;
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  if (headers.get("Content-Type")?.toLowerCase().includes("text/html")) {
    headers.set("Cache-Control", "private, no-store");
  }
  // Retain the stream and all existing auth, security and asset-cache headers.
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
