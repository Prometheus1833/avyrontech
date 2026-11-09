import type { Context } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

/** Financial operations only honor an explicitly disabled deployment policy or
 * an actually verified factor. The optional enrollment rollout does not suffice.
 * This never changes the session's mfaVerified value or resource permissions. */
export function financialMfaSatisfied(c: Pick<Context<AppBindings>, 'env' | 'get'>): boolean {
  return c.env.MFA_AUTH_ENABLED?.trim().toLowerCase() === "false" || Boolean(c.get("mfaVerified"));
}

/** Explicitly disabled MFA is an accepted deployment exception, never an
 * assertion that a factor was verified. Resource authorization remains separate.
 * Otherwise the temporary enrollment exception is limited to active platform
 * principals without a factor. Missing/unknown configuration fails closed.
 */
export async function privilegedMfaSatisfied(c: Pick<Context<AppBindings>, 'env' | 'get'>): Promise<boolean> {
  const configured = (c.env as { MFA_AUTH_ENABLED?: string }).MFA_AUTH_ENABLED?.trim().toLowerCase();
  if (configured === "false") return true;
  if (c.get("mfaVerified")) return true;
  if ((c.env as { ADMIN_MFA_POLICY?: string }).ADMIN_MFA_POLICY !== "optional_until_enrollment") return false;
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return false;
  return !(await c.env.DB.prepare(
    "SELECT 1 FROM mfa_factors WHERE user_id=? AND status='active' LIMIT 1",
  ).bind(c.get("userId")).first());
}
