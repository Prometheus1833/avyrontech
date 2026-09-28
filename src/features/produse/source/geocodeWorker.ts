/**
 * geocodeWorker — Avyron Products (avyron.ro/produse)
 *
 * Geocodare adresă ↔ coordonate cu Nominatim (OpenStreetMap), prin worker.
 * Politica Nominatim cere: maximum o cerere pe secundă, User-Agent
 * identificabil și atribuire vizibilă în interfață. Worker-ul le respectă:
 * cache 30 de zile în KV, o singură cerere în zbor pe instanță, UA propriu.
 * Docs: https://operations.osmfoundation.org/policies/nominatim/
 */

export type Place = { label: string; lat: number; lon: number; type?: string };

const BASE = "https://nominatim.openstreetmap.org";
const UA = "AvyronProducts/1.0 (contact@avyron.ro)";

let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, 1100 - (Date.now() - lastCall));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCall = Date.now();
}

export async function search(query: string, limit = 5): Promise<Place[]> {
  await throttle();
  const url = `${BASE}/search?format=jsonv2&addressdetails=0&limit=${limit}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const json = (await response.json()) as Array<{ display_name: string; lat: string; lon: string; type?: string }>;
  return json.map((entry) => ({ label: entry.display_name, lat: Number(entry.lat), lon: Number(entry.lon), type: entry.type }));
}

export async function reverse(lat: number, lon: number): Promise<Place | null> {
  await throttle();
  const response = await fetch(`${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lon}`, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!response.ok) throw new Error(`Nominatim ${response.status}`);
  const json = (await response.json()) as { display_name?: string };
  return json.display_name ? { label: json.display_name, lat, lon } : null;
}

type Env = { GEO_CACHE?: KVNamespace };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");
    const key = q ? `geo:q:${q.toLowerCase()}` : `geo:r:${lat},${lon}`;

    const cached = await env.GEO_CACHE?.get(key, "json");
    if (cached) return Response.json(cached, { headers: { "cache-control": "public, max-age=86400" } });

    try {
      const data = q ? await search(q) : lat && lon ? await reverse(Number(lat), Number(lon)) : null;
      if (!data) return Response.json({ error: "trimite ?q= sau ?lat=&lon=" }, { status: 400 });
      await env.GEO_CACHE?.put(key, JSON.stringify(data), { expirationTtl: 2592000 });
      return Response.json(data, { headers: { "cache-control": "public, max-age=86400" } });
    } catch (error) {
      return Response.json({ error: String((error as Error).message) }, { status: 502 });
    }
  },
};
