/**
 * anafWorker — Avyron Products (avyron.ro/produse)
 *
 * Proxy pentru serviciul web public ANAF de informații despre firme.
 * De ce e nevoie de worker: ANAF nu trimite anteturi CORS, deci browserul nu
 * poate apela direct. Worker-ul adaugă cache 24 h, limitare pe IP și
 * normalizează răspunsul la ce are nevoie un formular de checkout B2B.
 *
 * Rulează pe Cloudflare Workers (sau orice runtime cu fetch). Fără cheie API.
 * Endpoint ANAF: https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva
 */

export type CompanyInfo = {
  cui: string;
  name: string;
  address: string;
  regCom: string;
  vatPayer: boolean;
  vatOnCollection: boolean;
  eInvoice: boolean;
  inactive: boolean;
};

const ANAF = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

/** Normalizează CUI-ul: acceptă "RO 12345678", "ro12345678", "12345678". */
export function normalizeCui(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits.length < 2 || digits.length > 10) return null;
  return Number(digits);
}

export async function lookupCui(cui: string, today = new Date()): Promise<CompanyInfo> {
  const code = normalizeCui(cui);
  if (!code) throw new Error("CUI invalid");

  const response = await fetch(ANAF, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify([{ cui: code, data: today.toISOString().slice(0, 10) }]),
  });
  if (!response.ok) throw new Error(`ANAF ${response.status}`);

  const payload = (await response.json()) as {
    found?: Array<{
      date_generale?: { cui: number; denumire: string; adresa: string; nrRegCom: string; statusRO_e_Factura?: boolean };
      inregistrare_scop_Tva?: { scpTVA?: boolean };
      inregistrare_RTVAI?: { statusTvaIncasare?: boolean };
      stare_inactiv?: { statusInactivi?: boolean };
    }>;
  };
  const record = payload.found?.[0];
  if (!record?.date_generale) throw new Error("CUI inexistent în registru");

  const general = record.date_generale;
  return {
    cui: String(general.cui),
    name: general.denumire?.trim() ?? "",
    address: general.adresa?.trim() ?? "",
    regCom: general.nrRegCom?.trim() ?? "",
    vatPayer: Boolean(record.inregistrare_scop_Tva?.scpTVA),
    vatOnCollection: Boolean(record.inregistrare_RTVAI?.statusTvaIncasare),
    eInvoice: Boolean(general.statusRO_e_Factura),
    inactive: Boolean(record.stare_inactiv?.statusInactivi),
  };
}

type Env = { ANAF_CACHE?: KVNamespace };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cui = url.searchParams.get("cui") ?? "";
    const key = `anaf:${normalizeCui(cui) ?? "invalid"}`;

    const cached = await env.ANAF_CACHE?.get(key, "json");
    if (cached) return Response.json(cached, { headers: { "cache-control": "public, max-age=3600" } });

    try {
      const info = await lookupCui(cui);
      // Cache 24 h: datele de registru se schimbă rar, iar ANAF limitează traficul.
      await env.ANAF_CACHE?.put(key, JSON.stringify(info), { expirationTtl: 86400 });
      return Response.json(info, { headers: { "cache-control": "public, max-age=3600" } });
    } catch (error) {
      return Response.json({ error: String((error as Error).message) }, { status: 400 });
    }
  },
};
