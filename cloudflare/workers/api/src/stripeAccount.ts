import type { Env } from "./types";

export type StripeAccountCheck =
  | { ok: true; id: string; chargesEnabled: boolean }
  | { ok: false; code: "stripe_identity_unconfigured" | "stripe_mode_mismatch" | "stripe_api_unreachable" | "stripe_account_mismatch" };

/** Verify the key's actual owner before creating anything in Stripe. */
export async function checkStripeAccount(env: Env): Promise<StripeAccountCheck> {
  const key = env.STRIPE_SECRET_KEY?.trim();
  const expectedId = env.STRIPE_ACCOUNT_ID?.trim();
  if (!key || !expectedId?.startsWith("acct_")) return { ok: false, code: "stripe_identity_unconfigured" };
  if (env.APP_ENV === "production" && !/^(sk|rk)_live_/.test(key)) return { ok: false, code: "stripe_mode_mismatch" };
  try {
    const response = await fetch("https://api.stripe.com/v1/account", {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, code: "stripe_api_unreachable" };
    const account = await response.json() as { id?: string; charges_enabled?: boolean };
    if (account.id !== expectedId) return { ok: false, code: "stripe_account_mismatch" };
    return { ok: true, id: expectedId, chargesEnabled: account.charges_enabled === true };
  } catch {
    return { ok: false, code: "stripe_api_unreachable" };
  }
}
