import { z } from "zod";
import { normalizeUsername } from "./authPolicy";
import { hashPassword } from "./security";
import type { Role } from "./types";
export const accountIdentitySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    username: z
      .string()
      .transform((v) => normalizeUsername(v) || "")
      .refine((v) => /^[a-z0-9][a-z0-9._-]{2,39}$/.test(v)),
    displayName: z.string().trim().min(1).max(100),
    temporaryPassword: z
      .string()
      .min(10)
      .max(256)
      .refine((v) => /[A-Z]/.test(v) && /[0-9]/.test(v)),
  })
  .strict();
/** The same existing users/profiles/roles and forced-password flow, usable inside a caller's atomic batch. */
export async function provisionAccountPlan(
  db: D1Database,
  input: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    temporaryPassword: string;
    roles: Role[];
    actorUserId: string;
    timestamp: number;
    requestId?: string | null;
    ipHash?: string | null;
  },
) {
  const {
    id,
    email,
    username,
    displayName,
    temporaryPassword,
    roles,
    actorUserId,
    timestamp,
  } = input;
  return [
    db
      .prepare(
        "INSERT INTO users(id,email,username,password_hash,display_name,email_verified,must_change_password,created_at,updated_at) VALUES(?,?,?,?,?,1,1,?,?)",
      )
      .bind(
        id,
        email,
        username,
        await hashPassword(temporaryPassword),
        displayName,
        timestamp,
        timestamp,
      ),
    db
      .prepare(
        "INSERT INTO profiles(id,display_name,entity_type,language,theme,updated_at) VALUES(?,?,'individual','ro','system',?)",
      )
      .bind(id, displayName, timestamp),
    ...roles.map((role) =>
      db
        .prepare("INSERT INTO user_roles(user_id,role) VALUES(?,?)")
        .bind(id, role),
    ),
    db
      .prepare(
        "INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,request_id,ip_hash,metadata_json,created_at) VALUES(?,?,'user','admin.user_created','user',?,'allowed','warning',?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        actorUserId,
        id,
        input.requestId || null,
        input.ipHash || null,
        JSON.stringify({ email, username, roles }),
        timestamp,
      ),
  ];
}
