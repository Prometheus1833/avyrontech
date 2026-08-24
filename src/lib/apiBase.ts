// Base URL pentru API-ul Cloudflare Workers (avyrontech).
//
// - În producție (avyron.ro sau workers.dev direct), folosim același origin cu string gol → `/api/*`.
// - În preview Lovable / dev local, folosim workerul absolut.
// Poate fi suprascris prin VITE_CF_API_BASE dacă schimbi domeniul.

const FALLBACK = "https://avyrontech.avyrontech.workers.dev";

export function apiBaseForHost(host: string, configured?: string): string {
  if (configured) return configured.replace(/\/+$/, "");
  if (
    host === "avyron.ro" ||
    host === "www.avyron.ro" ||
    host === "app.avyron.ro" ||
    host.endsWith(".avyrontech.workers.dev")
  ) {
    return "";
  }
  return FALLBACK;
}

function detect(): string {
  const env = import.meta.env.VITE_CF_API_BASE as string | undefined;
  return apiBaseForHost(typeof window === "undefined" ? "" : window.location.hostname, env);
}

export const API_BASE = detect();

export const apiUrl = (path: string) =>
  path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
