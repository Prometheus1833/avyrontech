import { Hono, type Context } from "hono";
import type { AppBindings } from "./types";
import { organizationRoleForUser, platformRoleForUser, type OrganizationRole } from "./authorization";
import { deliverMail, logDelivery } from "./mailer";
import { now, randomHex, sha256 } from "./security";

const ORGANIZATION_ROLES = new Set<OrganizationRole>([
  "owner", "admin", "manager", "specialist", "client_admin", "client_member", "viewer",
]);
const INVITABLE_ROLES = new Set<OrganizationRole>([
  "admin", "manager", "specialist", "client_admin", "client_member", "viewer",
]);

const identifier = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
const validSlug = (slug: string) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);

async function organizationAccess(c: Context<AppBindings>, organizationId: string) {
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  const role = await organizationRoleForUser(c.env.DB, organizationId, c.get("userId"));
  return {
    platformRole,
    role,
    read: platformRole !== null || role !== null,
    administer: platformRole !== null || role === "owner" || role === "admin",
  };
}

async function securityEvent(
  c: Context<AppBindings>,
  input: { organizationId?: string; action: string; targetType?: string; targetId?: string; outcome: "allowed" | "denied" | "failed"; metadata?: unknown },
) {
  await c.env.DB.prepare(
    `INSERT INTO security_events
       (id, organization_id, actor_user_id, actor_type, action, target_type,
        target_id, outcome, severity, request_id, metadata_json, created_at)
     VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    identifier("evt"), input.organizationId || null, c.get("userId"), input.action,
    input.targetType || null, input.targetId || null, input.outcome,
    input.outcome === "allowed" ? "info" : "warning", c.get("requestId") || null,
    JSON.stringify(input.metadata ?? {}), now(),
  ).run();
}

export const organizationsRouter = new Hono<AppBindings>();

organizationsRouter.get("/api/organizations", async (c) => {
  const userId = c.get("userId");
  const platformRole = await platformRoleForUser(c.env.DB, userId);
  const rows = platformRole
    ? await c.env.DB.prepare(
        `SELECT organization.*, NULL AS membership_role
           FROM organizations AS organization
          WHERE organization.status <> 'archived'
          ORDER BY organization.name COLLATE NOCASE`,
      ).all()
    : await c.env.DB.prepare(
        `SELECT organization.*, membership.role AS membership_role
           FROM organization_memberships AS membership
           JOIN organizations AS organization ON organization.id = membership.organization_id
          WHERE membership.user_id = ? AND membership.status = 'active'
            AND organization.status <> 'archived'
          ORDER BY organization.name COLLATE NOCASE`,
      ).bind(userId).all();
  return c.json({ data: rows.results, platformRole });
});

organizationsRouter.post("/api/organizations", async (c) => {
  const platformRole = await platformRoleForUser(c.env.DB, c.get("userId"));
  if (!platformRole) return c.json({ error: { code: "forbidden" } }, 403);
  const body = await c.req.json<{ name?: string; slug?: string; kind?: string }>().catch(() => null);
  const name = String(body?.name || "").trim();
  const slug = String(body?.slug || "").trim().toLowerCase();
  const kind = body?.kind || "client";
  if (!name || name.length > 160 || !validSlug(slug) || !["platform", "agency", "client", "partner"].includes(kind)) {
    return c.json({ error: { code: "invalid_organization" } }, 400);
  }
  const organizationId = identifier("org");
  const timestamp = now();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO organizations
         (id, slug, name, kind, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).bind(organizationId, slug, name, kind, c.get("userId"), timestamp, timestamp),
    c.env.DB.prepare(
      `INSERT INTO organization_memberships
         (organization_id, user_id, role, status, approved_by, approved_at, created_at, updated_at)
       VALUES (?, ?, 'owner', 'active', ?, ?, ?, ?)`,
    ).bind(organizationId, c.get("userId"), c.get("userId"), timestamp, timestamp, timestamp),
  ]);
  await securityEvent(c, {
    organizationId, action: "organization.create", targetType: "organization",
    targetId: organizationId, outcome: "allowed", metadata: { slug, kind },
  });
  return c.json({ id: organizationId, slug }, 201);
});

organizationsRouter.get("/api/organizations/:organizationId/members", async (c) => {
  const organizationId = c.req.param("organizationId") || "";
  const access = await organizationAccess(c, organizationId);
  if (!access.read) return c.json({ error: { code: "forbidden" } }, 403);
  const { results } = await c.env.DB.prepare(
    `SELECT membership.user_id, membership.role, membership.status,
            membership.approved_at, membership.created_at,
            account.email, account.display_name, account.avatar_url
       FROM organization_memberships AS membership
       JOIN users AS account ON account.id = membership.user_id
      WHERE membership.organization_id = ?
      ORDER BY CASE membership.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
               COALESCE(account.display_name, account.email) COLLATE NOCASE`,
  ).bind(organizationId).all();
  return c.json({ data: results, permission: { role: access.role, administer: access.administer } });
});

organizationsRouter.post("/api/organizations/:organizationId/invitations", async (c) => {
  const organizationId = c.req.param("organizationId") || "";
  const access = await organizationAccess(c, organizationId);
  if (!access.administer) {
    await securityEvent(c, { organizationId, action: "organization.invite", outcome: "denied" });
    return c.json({ error: { code: "forbidden" } }, 403);
  }
  const body = await c.req.json<{ email?: string; role?: OrganizationRole }>().catch(() => null);
  const email = normalizeEmail(body?.email);
  const role = body?.role;
  if (!validEmail(email) || !role || !ORGANIZATION_ROLES.has(role) || !INVITABLE_ROLES.has(role)) {
    return c.json({ error: { code: "invalid_invitation" } }, 400);
  }
  const organization = await c.env.DB.prepare("SELECT name FROM organizations WHERE id = ? AND status = 'active'")
    .bind(organizationId).first<{ name: string }>();
  if (!organization) return c.json({ error: { code: "not_found" } }, 404);

  const invitationId = identifier("invite");
  const outboxId = identifier("outbox");
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  const timestamp = now();
  const expiresAt = timestamp + 7 * 24 * 60 * 60 * 1000;
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE organization_invitations
          SET revoked_at = ?
        WHERE organization_id = ? AND email = ? AND accepted_at IS NULL AND revoked_at IS NULL`,
    ).bind(timestamp, organizationId, email),
    c.env.DB.prepare(
      `INSERT INTO organization_invitations
         (id, organization_id, email, role, token_hash, invited_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(invitationId, organizationId, email, role, tokenHash, c.get("userId"), expiresAt, timestamp),
    c.env.DB.prepare(
      `INSERT INTO outbox_events
         (id, deduplication_key, organization_id, aggregate_type, aggregate_id,
          event_type, payload_json, status, available_at, created_at)
       VALUES (?, ?, ?, 'organization_invitation', ?, 'organization.invitation.created', ?, 'pending', ?, ?)`,
    ).bind(
      outboxId, `organization-invitation:${invitationId}`, organizationId, invitationId,
      JSON.stringify({ invitationId, email, role }), timestamp, timestamp,
    ),
  ]);

  const appUrl = (c.env.APP_ENV === "production" ? "https://app.avyron.ro" : c.env.APP_URL).replace(/\/$/, "");
  const invitationUrl = `${appUrl}/auth?invite=${encodeURIComponent(token)}`;
  const delivery = await deliverMail(c.env, {
    to: email,
    subject: `Invitație în ${organization.name} · Avyron`,
    text: `Ai fost invitat în organizația ${organization.name}. Invitația expiră în 7 zile:\n\n${invitationUrl}`,
    html: `<p>Ai fost invitat în organizația <strong>${organization.name.replace(/[<>&"]/g, "")}</strong>.</p><p><a href="${invitationUrl}">Acceptă invitația</a></p><p>Invitația expiră în 7 zile.</p>`,
  });
  await logDelivery(c.env, { kind: "organization_invitation", entityId: invitationId, recipient: email, result: delivery });
  await c.env.DB.prepare(
    `UPDATE outbox_events
        SET status = ?, attempts = 1, published_at = ?, last_error = ?
      WHERE id = ?`,
  ).bind(delivery.delivered ? "published" : "pending", delivery.delivered ? now() : null, delivery.error || null, outboxId).run();
  await securityEvent(c, {
    organizationId, action: "organization.invite", targetType: "invitation",
    targetId: invitationId, outcome: delivery.delivered ? "allowed" : "failed", metadata: { role },
  });
  return c.json({ id: invitationId, delivery: delivery.delivered ? "sent" : "queued", expiresAt }, 202);
});

organizationsRouter.post("/api/organization-invitations/accept", async (c) => {
  const body = await c.req.json<{ token?: string }>().catch(() => null);
  if (!body?.token || body.token.length > 256) return c.json({ error: { code: "invalid_invitation" } }, 400);
  const tokenHash = await sha256(body.token);
  const timestamp = now();
  const invitation = await c.env.DB.prepare(
    `SELECT invitation.id, invitation.organization_id, invitation.role
       FROM organization_invitations AS invitation
       JOIN users AS account ON account.id = ? AND account.email = invitation.email COLLATE NOCASE
      WHERE invitation.token_hash = ?
        AND invitation.accepted_at IS NULL AND invitation.revoked_at IS NULL
        AND invitation.expires_at > ?
      LIMIT 1`,
  ).bind(c.get("userId"), tokenHash, timestamp).first<{
    id: string; organization_id: string; role: OrganizationRole;
  }>();
  if (!invitation) return c.json({ error: { code: "invalid_invitation" } }, 400);

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE organization_invitations
          SET accepted_by = ?, accepted_at = ?
        WHERE id = ? AND accepted_at IS NULL AND revoked_at IS NULL`,
    ).bind(c.get("userId"), timestamp, invitation.id),
    c.env.DB.prepare(
      `INSERT INTO organization_memberships
         (organization_id, user_id, role, status, approved_by, approved_at, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
       ON CONFLICT(organization_id, user_id) DO UPDATE SET
         role = excluded.role, status = 'active', approved_by = excluded.approved_by,
         approved_at = excluded.approved_at, updated_at = excluded.updated_at`,
    ).bind(
      invitation.organization_id, c.get("userId"), invitation.role,
      c.get("userId"), timestamp, timestamp, timestamp,
    ),
  ]);
  await securityEvent(c, {
    organizationId: invitation.organization_id, action: "organization.invitation.accept",
    targetType: "invitation", targetId: invitation.id, outcome: "allowed", metadata: { role: invitation.role },
  });
  return c.json({ ok: true, organizationId: invitation.organization_id });
});
