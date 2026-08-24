export const PLATFORM_HOSTNAME = "app.avyron.ro";
export const PUBLIC_SITE_URL = "https://avyron.ro";

export function isPlatformHostname(hostname?: string): boolean {
  const current = hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  return current.toLowerCase() === PLATFORM_HOSTNAME;
}

export function publicSiteHref(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
}
