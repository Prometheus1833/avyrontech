import { cfAuth } from "./cfAuth";

/**
 * Magazinul Produse Avyron, din partea contului.
 *
 * Tot ce ține de limite, drepturi și bani se citește de la Worker: browserul
 * nu decide niciodată dacă un produs e deblocat. Când baza încă nu are
 * tabelele (`catalog_unavailable`), funcțiile de mai jos întorc o stare goală,
 * ca interfața să spună „în curând”, nu să se rupă.
 */

export type PlanId = "free" | "pro" | "studio";
export type CopyChannel = "cli" | "code" | "zip" | "mcp" | "prompt";
export type LimitBucket = "components" | "sections" | "templates";

export type AccountState = {
  plan: PlanId;
  planExpiresAt: number | null;
  day: string;
  limits: Record<LimitBucket, { used: number; limit: number }>;
  purchases: string[];
  collection: string[];
  recent: Array<{ slug: string; day: string; channel: string; created_at: number }>;
};

/**
 * Răspunsul la o obținere. Proiectul compilează cu `strict: false`, unde
 * uniunile discriminate nu se îngustează, așa că forma e una singură, cu
 * câmpuri opționale: `ok` spune dacă a mers, `code` de ce nu.
 *
 * Coduri: `upgrade_required` (cere alt parteneriat sau cumpărare),
 * `daily_limit_reached` (limita zilei), `catalog_unavailable` (magazin nemigrat).
 */
export type CopyResult = {
  ok: boolean;
  code?: string;
  counted?: boolean;
  bucket?: LimitBucket;
  remaining?: number;
  limit?: number;
  access?: PlanId;
  requiredPlan?: PlanId;
  plan?: PlanId;
  priceRonCents?: number | null;
  download?: string | null;
};

/** Checkout-ul returnează numai un URL găzduit de procesator. */
export type CheckoutResult = {
  ok: boolean;
  code?: string;
  orderId?: string | null;
  url?: string | null;
  amountMinor?: number;
};

export type AdminOverview = {
  catalog: Array<{ type: string; access: string; status: string; count: number }>;
  plans: Array<{ id: string; name: string; price_ron_cents: number; components_per_day: number; sections_per_day: number; templates_per_day: number }>;
  entitlements: Array<{ kind: string; count: number }>;
  copies: Array<{ day: string; count: number; people: number }>;
  topItems: Array<{ slug: string; name: string; count: number }>;
  orders: Array<{ id: string; user_id: string; total_cents: number; status: string; created_at: number; items: Array<Record<string, unknown>> }>;
  requests: Array<{ id: string; source: string; email: string; message: string | null; status: string; created_at: number }>;
  transitions: Array<{ slug: string; name: string; access: string; pro_at: number | null; free_at: number | null }>;
  /** Codul pentru care centrul nu are date: migrare neaplicată sau lipsă de drepturi. */
  unavailable?: string;
};

export const EMPTY_OVERVIEW: AdminOverview = {
  catalog: [],
  plans: [],
  entitlements: [],
  copies: [],
  topItems: [],
  orders: [],
  requests: [],
  transitions: [],
};

export const EMPTY_STATE: AccountState = {
  plan: "free",
  planExpiresAt: null,
  day: "",
  limits: { components: { used: 0, limit: 0 }, sections: { used: 0, limit: 0 }, templates: { used: 0, limit: 0 } },
  purchases: [],
  collection: [],
  recent: [],
};

/**
 * `cfAuth.request` aruncă o eroare din care rămâne doar mesajul, iar aici ne
 * trebuie și detaliile (ce plan cere produsul, ce limită s-a atins). Așa că
 * pentru rutele magazinului citim răspunsul brut și îl interpretăm întreg.
 */
async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T & { error?: { code?: string } & Record<string, unknown> } }> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const response = await cfAuth.raw(path, { ...init, headers });
  const body = (await response.json().catch(() => ({}))) as T & { error?: { code?: string } & Record<string, unknown> };
  return { ok: response.ok, status: response.status, body };
}

export const produseApi = {
  async state(): Promise<AccountState> {
    const { ok, body } = await call<AccountState>("/api/produse/account/state");
    // Baza încă nemigrată nu e o eroare pentru utilizator: e „în curând”.
    if (!ok) return EMPTY_STATE;
    return body;
  },

  async copy(slug: string, channel: CopyChannel): Promise<CopyResult> {
    const { ok, body } = await call<CopyResult>("/api/produse/account/copy", { method: "POST", body: JSON.stringify({ slug, channel }) });
    if (ok) return body as CopyResult;
    return { ok: false, ...(body.error ?? { code: "unknown" }) } as CopyResult;
  },

  collection: {
    async list(): Promise<string[]> {
      const { ok, body } = await call<{ data: string[] }>("/api/produse/account/collection");
      return ok ? (body.data ?? []) : [];
    },
    async add(slug: string): Promise<string[]> {
      const { ok, body } = await call<{ data: string[] }>("/api/produse/account/collection", { method: "POST", body: JSON.stringify({ action: "add", slug }) });
      return ok ? (body.data ?? []) : [];
    },
    async remove(slug: string): Promise<string[]> {
      const { ok, body } = await call<{ data: string[] }>("/api/produse/account/collection", { method: "POST", body: JSON.stringify({ action: "remove", slug }) });
      return ok ? (body.data ?? []) : [];
    },
    /** Urcă în cont ce a strâns vizitatorul în browser, la prima autentificare. */
    async sync(slugs: string[]): Promise<string[]> {
      const { ok, body } = await call<{ data: string[] }>("/api/produse/account/collection", { method: "POST", body: JSON.stringify({ action: "sync", slugs }) });
      return ok ? (body.data ?? []) : [];
    },
  },

  /** Centrul „Produse Avyron” din AVYRON OS (doar super admin). */
  admin: {
    async overview(): Promise<AdminOverview> {
      const { ok, body } = await call<AdminOverview>("/api/produse/admin/overview");
      return ok ? body : { ...EMPTY_OVERVIEW, unavailable: String(body.error?.code ?? "forbidden") };
    },
    async patchItem(patch: { slug: string; access?: PlanId; status?: string; proAt?: number | null; freeAt?: number | null }): Promise<boolean> {
      const { ok } = await call("/api/produse/admin/items", { method: "POST", body: JSON.stringify(patch) });
      return ok;
    },
  },

  /** Creează comanda și sesiunea providerului ales, fără date de card în AVYRON. */
  async checkout(input: { kind: "plan" | "item"; id: string; taxId?: string; provider: "revolut" | "stripe"; savePaymentMethod?: boolean }): Promise<CheckoutResult> {
    const { ok, body } = await call<{ orderId: string; url: string | null; amountMinor: number }>("/api/produse/account/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    });
    if (ok) return { ok: true, orderId: body.orderId, url: body.url, amountMinor: body.amountMinor };
    const code = String(body.error?.code ?? "checkout_failed");
    return { ok: false, code, orderId: (body as { orderId?: string }).orderId ?? null };
  },
};
