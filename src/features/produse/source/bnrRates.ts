/**
 * bnrRates — Avyron Products (avyron.ro/produse)
 *
 * Cursul oficial BNR din fluxul XML public, parsat și pus în cache pe edge.
 * Rulează ca Worker Cloudflare (sau orice runtime cu fetch + KV). Fără cheie.
 *
 * Sursa: https://www.bnr.ro/nbrfxrates.xml  (cursul zilei, publicat ~13:00)
 * Fallback: ultimul curs valid din KV, marcat explicit ca „stale", ca să nu
 * afișezi niciodată un preț calculat din nimic.
 */

export type Rates = {
  date: string;
  base: "RON";
  rates: Record<string, number>;
  stale: boolean;
};

const FEED = "https://www.bnr.ro/nbrfxrates.xml";

/** Parsare fără DOMParser (Workers nu are unul): XML-ul BNR e plat și stabil. */
export function parseBnrXml(xml: string): Rates {
  const date = xml.match(/<Cube date="([^"]+)"/)?.[1] ?? new Date().toISOString().slice(0, 10);
  const rates: Record<string, number> = {};
  const rowRe = /<Rate currency="([A-Z]{3})"(?: multiplier="(\d+)")?>([\d.]+)<\/Rate>/g;
  for (let match = rowRe.exec(xml); match; match = rowRe.exec(xml)) {
    const [, currency, multiplier, value] = match;
    const amount = Number(value) / (multiplier ? Number(multiplier) : 1);
    if (Number.isFinite(amount) && amount > 0) rates[currency] = amount;
  }
  return { date, base: "RON", rates, stale: false };
}

/** 1 EUR = x RON, cu fallback pe ultimul curs cunoscut. */
export function convert(amount: number, from: string, to: string, rates: Rates): number | null {
  const factor = (code: string) => (code === "RON" ? 1 : rates.rates[code]);
  const a = factor(from);
  const b = factor(to);
  if (!a || !b) return null;
  return (amount * a) / b;
}

type Env = { FX_CACHE?: KVNamespace };

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    const cached = await env.FX_CACHE?.get("bnr:latest", "json");
    const today = new Date().toISOString().slice(0, 10);
    if (cached && (cached as Rates).date === today) {
      return Response.json(cached, { headers: { "cache-control": "public, max-age=1800" } });
    }
    try {
      const response = await fetch(FEED, { headers: { accept: "application/xml" } });
      if (!response.ok) throw new Error(`BNR ${response.status}`);
      const parsed = parseBnrXml(await response.text());
      if (Object.keys(parsed.rates).length === 0) throw new Error("flux gol");
      await env.FX_CACHE?.put("bnr:latest", JSON.stringify(parsed), { expirationTtl: 172800 });
      return Response.json(parsed, { headers: { "cache-control": "public, max-age=1800" } });
    } catch (error) {
      if (cached) return Response.json({ ...(cached as Rates), stale: true }, { headers: { "cache-control": "public, max-age=300" } });
      return Response.json({ error: String((error as Error).message) }, { status: 502 });
    }
  },
};
