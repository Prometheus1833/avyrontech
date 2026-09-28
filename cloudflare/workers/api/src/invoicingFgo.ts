// Facturare prin FGO, pentru vânzările din Produse Avyron.
//
// Contractul e cel din documentația publică FGO (v7): POST către
// `<bază>/factura/emitere`, corp JSON, autentificare prin `CodUnic` + `Hash`,
// unde `Hash = SHA1(CodUnic + PrivateKey + ClientName)`. Baza de test e
// https://api-testuat.fgo.ro/v1, cea de producție https://api.fgo.ro/v1.
//
// Nimic nu pleacă spre FGO cât timp lipsește o singură variabilă de mediu:
// funcția se oprește și spune de ce. La fel pentru cota de TVA — regimul
// (plătitor / neplătitor, OSS pentru UE) e o decizie a contabilului, nu una
// tehnică, așa că nu are valoare implicită.

export type FgoEnv = {
  FGO_API_URL?: string;
  FGO_CUI?: string;
  FGO_PRIVATE_KEY?: string;
  FGO_CLIENT_NAME?: string;
  FGO_PLATFORM_URL?: string;
  FGO_SERIES?: string;
  FGO_VAT_RATE?: string;
};

export type FgoLine = { name: string; quantity: number; unitPriceMinor: number };

export type FgoBuyer = {
  name: string;
  email?: string;
  /** CUI-ul cumpărătorului, când e firmă. */
  taxId?: string | null;
  country?: string;
  isCompany?: boolean;
};

export type FgoResult =
  | { issued: true; series: string; number: string; pdfUrl: string | null; payUrl: string | null }
  | { issued: false; reason: string };

const sha1Hex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

/** Emite o factură pentru o plată deja încasată. Nu aruncă: raportează. */
export async function issueFgoInvoice(
  env: FgoEnv,
  input: { buyer: FgoBuyer; lines: FgoLine[]; currency: "RON" | "EUR"; issuedAt: number },
  fetcher: typeof fetch = fetch,
): Promise<FgoResult> {
  const cui = env.FGO_CUI?.trim();
  const key = env.FGO_PRIVATE_KEY?.trim();
  const clientName = env.FGO_CLIENT_NAME?.trim();
  const platformUrl = env.FGO_PLATFORM_URL?.trim();
  if (!cui || !key || !clientName || !platformUrl) return { issued: false, reason: "fgo_not_configured" };

  const vatRate = Number(env.FGO_VAT_RATE);
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return { issued: false, reason: "fgo_vat_rate_missing" };

  const base = (env.FGO_API_URL?.trim() || "https://api.fgo.ro/v1").replace(/\/+$/, "");
  const date = new Date(input.issuedAt).toISOString().slice(0, 10);

  const body = {
    CodUnic: cui,
    Hash: await sha1Hex(`${cui}${key}${clientName}`),
    PlatformaUrl: platformUrl,
    Serie: env.FGO_SERIES?.trim() || undefined,
    Valuta: input.currency,
    TipFactura: "Factura",
    DataEmitere: date,
    DataScadenta: date,
    Client: {
      Denumire: input.buyer.name,
      CodUnic: input.buyer.taxId ?? undefined,
      Email: input.buyer.email,
      Tara: input.buyer.country || "România",
      Tip: input.buyer.isCompany ? "PJ" : "PF",
    },
    Continut: input.lines.map((line) => ({
      Denumire: line.name,
      NrProduse: line.quantity,
      UM: "buc",
      CotaTVA: vatRate,
      PretUnitar: line.unitPriceMinor / 100,
    })),
  };

  let response: Response;
  try {
    response = await fetcher(`${base}/factura/emitere`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { issued: false, reason: "fgo_unreachable" };
  }

  if (!response.ok) return { issued: false, reason: `fgo_http_${response.status}` };
  const payload = (await response.json().catch(() => null)) as
    | { Success?: boolean; Message?: string; Factura?: { Serie?: string; Numar?: string; Link?: string; LinkPlata?: string } }
    | null;
  if (!payload?.Success || !payload.Factura?.Numar) return { issued: false, reason: payload?.Message ? `fgo_refuzat: ${payload.Message}` : "fgo_invalid_response" };

  return {
    issued: true,
    series: payload.Factura.Serie ?? "",
    number: payload.Factura.Numar,
    pdfUrl: payload.Factura.Link ?? null,
    payUrl: payload.Factura.LinkPlata ?? null,
  };
}
