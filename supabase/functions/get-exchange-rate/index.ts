import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Cache rate in module memory for the lifetime of the function instance.
let cache: { rate: number; fetchedAt: number; source: string } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

async function fromExchangeRateApi(key: string) {
  const r = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/EUR/RON`);
  if (!r.ok) throw new Error(`exchangerate-api ${r.status}`);
  const d = await r.json();
  if (d?.result !== "success" || typeof d?.conversion_rate !== "number") {
    throw new Error(`exchangerate-api bad payload`);
  }
  return { rate: Number(d.conversion_rate.toFixed(4)), source: "exchangerate-api" };
}

async function fromFrankfurter() {
  const r = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=RON");
  if (!r.ok) throw new Error(`frankfurter ${r.status}`);
  const d = await r.json();
  const ron = d?.rates?.RON;
  if (typeof ron !== "number" || ron <= 0) throw new Error("frankfurter bad payload");
  return { rate: Number(ron.toFixed(4)), source: "ecb-frankfurter" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return new Response(
      JSON.stringify({ rate: cache.rate, source: cache.source, cached: true, fetchedAt: cache.fetchedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } },
    );
  }

  const apiKey = Deno.env.get("EXCHANGERATE_API_KEY");
  let result: { rate: number; source: string } | null = null;
  let lastError: unknown = null;

  if (apiKey) {
    try { result = await fromExchangeRateApi(apiKey); } catch (e) { lastError = e; }
  }
  if (!result) {
    try { result = await fromFrankfurter(); } catch (e) { lastError = e; }
  }

  if (!result) {
    console.error("get-exchange-rate failed", lastError);
    return new Response(
      JSON.stringify({ rate: 5, source: "fallback", error: String(lastError) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  cache = { ...result, fetchedAt: now };
  return new Response(
    JSON.stringify({ rate: result.rate, source: result.source, cached: false, fetchedAt: now }),
    { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } },
  );
});
