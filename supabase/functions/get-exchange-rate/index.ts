import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAIR = "EUR_RON";
const FALLBACK_RATE = 5;

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

async function refresh(admin: ReturnType<typeof createClient>) {
  const apiKey = Deno.env.get("EXCHANGERATE_API_KEY");
  let result: { rate: number; source: string } | null = null;
  let lastError: unknown = null;
  if (apiKey) {
    try { result = await fromExchangeRateApi(apiKey); } catch (e) { lastError = e; }
  }
  if (!result) {
    try { result = await fromFrankfurter(); } catch (e) { lastError = e; }
  }
  if (!result) throw lastError ?? new Error("no provider");

  const fetchedAt = new Date().toISOString();
  await admin.from("exchange_rates").upsert({
    pair: PAIR,
    rate: result.rate,
    source: result.source,
    fetched_at: fetchedAt,
  });
  return { rate: result.rate, source: result.source, fetched_at: fetchedAt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  const isRefresh = url.searchParams.get("refresh") === "1" || req.method === "POST";

  try {
    if (isRefresh) {
      const data = await refresh(admin);
      return new Response(JSON.stringify({ ...data, refreshed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data } = await admin
      .from("exchange_rates")
      .select("rate, source, fetched_at")
      .eq("pair", PAIR)
      .maybeSingle();

    if (data) {
      return new Response(
        JSON.stringify({ rate: Number(data.rate), source: data.source, fetched_at: data.fetched_at, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=1800" } },
      );
    }

    // No row yet — fetch once and persist.
    const fresh = await refresh(admin);
    return new Response(JSON.stringify({ ...fresh, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-exchange-rate failed", e);
    return new Response(
      JSON.stringify({ rate: FALLBACK_RATE, source: "fallback", error: String(e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
