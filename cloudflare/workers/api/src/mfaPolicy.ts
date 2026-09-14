import type { Context } from "hono";
import type { AppBindings } from "./types";
import { platformRoleForUser } from "./authorization";

/** Temporary rollout exception, never an assertion that MFA was verified.
 * Only active platform principals without an enrolled factor are eligible.
 * Missing/unknown configuration fails closed. Existing factors still challenge.
 */
export async function privilegedMfaSatisfied(c: Context<AppBindings>): Promise<boolean> {
  if (c.get("mfaVerified")) return true;
  if (c.env.ADMIN_MFA_POLICY !== "optional_until_enrollment") return false;
  if (!(await platformRoleForUser(c.env.DB, c.get("userId")))) return false;
  return !(await c.env.DB.prepare(
    "SELECT 1 FROM mfa_factors WHERE user_id=? AND status='active' LIMIT 1",
  ).bind(c.get("userId")).first());
}
