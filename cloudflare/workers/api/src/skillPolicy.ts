import {creativeQualityContext} from "../../../../src/shared/skills/creative";
import {siteQualityContext} from "../../../../src/shared/skills/siteKnowledge";
import {
  hasCapability,
  platformRoleForUser,
  clientProjectGrantSql,
} from "./authorization";
import { managedStaff, managedPermission } from "./staffAccessPolicy";
import { canAccessProject } from "./projects";
import { leadReadPredicate } from "./leads";
import type { Env, Role } from "./types";
import type {
  SkillBrief,
  SkillPermissions,
  SkillRun,
} from "../../../../src/shared/skills/model";

export async function skillPermissions(
  db: D1Database,
  uid: string,
): Promise<SkillPermissions> {
  const active = await db
    .prepare(
      "SELECT 1 FROM users WHERE id=? AND disabled_at IS NULL AND email_verified=1",
    )
    .bind(uid)
    .first();
  const empty = {
    read: false,
    use: false,
    manage: false,
    approve: false,
    platform: false,
  };
  if (!active) return empty;
  if (await platformRoleForUser(db, uid))
    return {
      read: true,
      use: true,
      manage: true,
      approve: true,
      platform: true,
    };
  const ranked = await managedStaff(db, uid);
  const grants = await db
    .prepare(
      "SELECT capability FROM user_capabilities WHERE user_id=? AND organization_id IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?) AND capability LIKE 'skills.%'",
    )
    .bind(uid, Date.now())
    .all<{ capability: string }>();
  const allowed = (permission: string) =>
    (!ranked || managedPermission(ranked, permission)) &&
    grants.results.some((x) => x.capability === permission);
  const [read, use, manage, approve] = [
    "skills.read",
    "skills.use",
    "skills.manage",
    "skills.approve",
  ].map(allowed);
  // Existing limited operators may consume approved reusable knowledge only.
  // No documents/CRM-wide grant, no new account or credential is introduced.
  const operator = await db
    .prepare(
      `SELECT 1 FROM agent_operator_bindings b
    JOIN ai_project_members m ON m.user_id=b.user_id AND m.project_id=b.project_id AND m.status='active'
    JOIN ai_projects p ON p.id=m.project_id AND p.status NOT IN('paused','archived')
    JOIN user_capabilities g ON g.user_id=b.user_id AND g.revoked_at IS NULL AND g.organization_id IS NULL AND (g.expires_at IS NULL OR g.expires_at>?)
    WHERE b.user_id=? AND b.status='active' AND b.agent_slug IN('leads','ai-prod-content') AND g.capability IN('leads.read','ai_content.create') LIMIT 1`,
    )
    .bind(Date.now(), uid)
    .first();
  return {
    read: read || use || manage || approve || !!operator,
    use: use || !!operator,
    manage,
    approve,
    platform: false,
  };
}
/** Bounded SQL filtering avoids per-row permission queries and count leaks. */
export async function skillRunScope(
  env: Env,
  uid: string,
  p: SkillPermissions,
) {
  if (p.platform) return { sql: "1=1", args: [] as string[] };
  const ranked = await managedStaff(env.DB, uid);
  const all =
    ranked &&
    managedPermission(ranked, "projects.read") &&
    managedPermission(ranked, "projects.all");
  const projectRead = !ranked || managedPermission(ranked, "projects.read");
  const staff = await env.DB.prepare(
    "SELECT 1 FROM user_roles WHERE user_id=? AND role IN('staff','admin')",
  )
    .bind(uid)
    .first();
  const leadScope = leadReadPredicate(
    uid,
    await hasCapability(env.DB, uid, "leads.read"),
  );
  return {
    sql: `r.created_by=? AND (r.project_id IS NULL OR (${projectRead ? "1" : "0"}=1 AND EXISTS(SELECT 1 FROM projects p WHERE p.id=r.project_id AND (${all ? "1=1 OR" : ""} p.owner_user_id=? OR EXISTS(SELECT 1 FROM organization_memberships m WHERE m.organization_id=p.organization_id AND m.user_id=? AND m.status='active') OR (${staff ? "1" : "0"}=1 AND EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=p.id AND ps.user_id=?)) OR (${staff ? "p.organization_id IS NULL" : "1=1"} AND ${clientProjectGrantSql("p")}))))) AND (r.lead_id IS NULL OR EXISTS(SELECT 1 FROM leads lead WHERE lead.id=r.lead_id AND lead.deleted_at IS NULL AND ${leadScope.sql}))`,
    args: [uid, uid, uid, uid, uid, ...leadScope.values],
  };
}
export async function skillBriefAccess(
  env: Env,
  uid: string,
  b: Pick<SkillBrief, "projectId" | "leadId">,
  active = true,
) {
  const roles = await env.DB.prepare(
    "SELECT role FROM user_roles WHERE user_id=?",
  )
    .bind(uid)
    .all<{ role: Role }>();
  if (
    b.projectId &&
    !(
      await canAccessProject(
        env.DB,
        b.projectId,
        uid,
        roles.results.map((x) => x.role),
      )
    ).read
  )
    return false;
  if (b.leadId) {
    const full =
      !!(await platformRoleForUser(env.DB, uid)) ||
      (await hasCapability(env.DB, uid, "leads.read"));
    const scope = leadReadPredicate(uid, full);
    if (
      !(await env.DB.prepare(
        `SELECT 1 FROM leads lead WHERE lead.id=? AND lead.deleted_at IS NULL ${active ? "AND lead.archived_at IS NULL" : ""} AND ${scope.sql}`,
      )
        .bind(b.leadId, ...scope.values)
        .first())
    )
      return false;
  }
  return true;
}
export async function skillRunAccess(env: Env, uid: string, r: SkillRun) {
  const p = await skillPermissions(env.DB, uid);
  if (p.platform) return true;
  if (
    !p.read ||
    !(await skillBriefAccess(
      env,
      uid,
      { projectId: r.project_id, leadId: r.lead_id },
      false,
    ))
  )
    return false;
  return p.platform || r.created_by === uid || !!r.project_id;
}
export async function selectedSkillReferences(
  db: D1Database,
  slug: string,
  domain: string,
) {
  const items = await db
    .prepare(
      `SELECT id,title,body,source_url,revision,file_name,content_type,size_bytes FROM avy_skill_resources WHERE skill_slug=? AND stage_key IS NULL AND status='approved' AND domain IN(?, 'general') ORDER BY CASE WHEN domain=? THEN 0 ELSE 1 END,created_at DESC,id LIMIT 3`,
    )
    .bind(slug, domain, domain)
    .all<{
      id: string;
      title: string;
      body: string;
      source_url: string;
      revision: number;
      file_name: string | null;
      content_type: string | null;
      size_bytes: number;
    }>();
  return items.results;
}
export function referenceMarkdown(
  items: Awaited<ReturnType<typeof selectedSkillReferences>>,
) {
  return items
    .map(
      (x) =>
        `### ${x.title}\nReferință ${x.id}, revizia ${x.revision}\n${x.body.slice(0, 2000)}${x.source_url ? "\nProveniență: " + x.source_url : ""}`,
    )
    .join("\n\n")
    .slice(0, 7000);
}
export async function approvedSkillContext(
  db: D1Database,
  slug: string,
  domain: string,
) {
  return [slug === "site-builder" ? siteQualityContext(domain) : creativeQualityContext(slug), referenceMarkdown(await selectedSkillReferences(db, slug, domain))].filter(Boolean).join("\n\n");
}
