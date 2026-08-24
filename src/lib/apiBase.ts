// Base URL pentru API-ul Cloudflare Workers (avyrontech).
//
// - În producție (avyron.ro sau workers.dev direct), folosim același origin cu string gol → `/api/*`.
// - În preview Lovable / dev local, folosim workerul absolut.
// Poate fi suprascris prin VITE_CF_API_BASE dacă schimbi domeniul.

const FALLBACK = "https://avyrontech.avyrontech.workers.dev";

function detect(): string {
  const env = import.meta.env.VITE_CF_API_BASE as string | undefined;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window === "undefined") return FALLBACK;
  const host = window.location.hostname;
  // Same-origin când suntem pe avyron.ro sau direct pe worker
  if (
    host === "avyron.ro" ||
    host === "www.avyron.ro" ||
    host.endsWith(".avyrontech.workers.dev")
  ) {
    return "";
  }
  return FALLBACK;
}

export const API_BASE = detect();

export const apiUrl = (path: string) =>
  path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
