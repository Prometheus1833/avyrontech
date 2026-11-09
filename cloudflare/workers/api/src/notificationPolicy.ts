import { agencyPermissions } from "./leadsAgencyPolicy";
import { projectAccessMap } from "./projects";
import { platformRoleForUser } from "./authorization";
import { filterPrivateDocumentNotices } from "./documentPolicy";
import type { Role } from "./types";

export type StoredNotice = {
  id: string;
  user_id?: string;
  deduplication_key?: string;
  title: string;
  body: string;
  destination: string;
  read_at: number | null;
  created_at: number;
  category?: string;
  priority?: string;
  resource_type?: string | null;
  resource_id?: string | null;
};
/** The same live resource checks protect inbox, legacy feeds, badges and read actions.
 * Bulk joins and the native multi-project ACL keep query count bounded by the feed,
 * rather than issuing authorization subrequests for each notification. */
export async function filterNotifications(
  db: D1Database,
  user: string,
  roles: Role[],
  rows: StoredNotice[],
): Promise<StoredNotice[]> {
  if (!rows.length) return [];
  const privateSafe = await filterPrivateDocumentNotices(db, user, rows);
  if (!privateSafe.length) return [];
  const principal = await platformRoleForUser(db, user);
  const staff = roles.some((r) => r === "staff" || r === "admin");
  const result = await db
    .prepare(
      `SELECT n.id,n.resource_type,
    CASE n.resource_type WHEN 'project' THEN n.resource_id WHEN 'project_staff' THEN n.resource_id
      WHEN 'proposal' THEN proposal.project_id WHEN 'project_update' THEN upd.project_id
      WHEN 'subscription' THEN p.id END project_id,
    CASE
      WHEN n.resource_type='project' THEN 1
      WHEN n.resource_type='project_staff' THEN ? AND EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=n.resource_id AND ps.user_id=n.user_id)
      WHEN n.resource_type='proposal' THEN ? AND proposal.author_id<>n.user_id AND EXISTS(SELECT 1 FROM project_staff ps WHERE ps.project_id=proposal.project_id AND ps.user_id=n.user_id)
      WHEN n.resource_type='project_update' THEN upd.id IS NOT NULL
      WHEN n.resource_type='subscription' THEN p.id IS NOT NULL AND (p.owner_user_id=n.user_id OR EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.client_id=sub.client_id AND ca.user_id=n.user_id))
      WHEN n.resource_type='billing_subscription' THEN bill.user_id=n.user_id
      WHEN n.resource_type='blog' THEN blog.status='published' AND blog.published_at<=? AND coalesce((SELECT blog_enabled FROM notification_preferences pref WHERE pref.user_id=n.user_id),1)=1
      ELSE 0 END resource_allowed,
    EXISTS(SELECT 1 FROM client_account_access ca WHERE ca.user_id=n.user_id AND n.deduplication_key='client-workspace:'||ca.client_id||':'||ca.user_id) client_notice
    FROM operation_notifications n
    LEFT JOIN project_proposals proposal ON n.resource_type='proposal' AND proposal.id=n.resource_id
    LEFT JOIN project_updates upd ON n.resource_type='project_update' AND upd.id=n.resource_id
    LEFT JOIN subscriptions sub ON n.resource_type='subscription' AND sub.id=n.resource_id
    LEFT JOIN services v ON v.id=sub.service_id
    LEFT JOIN projects p ON p.id=v.project_id AND p.client_id=sub.client_id
    LEFT JOIN billing_subscriptions bill ON n.resource_type='billing_subscription' AND bill.id=n.resource_id
    LEFT JOIN blog_posts blog ON n.resource_type='blog' AND blog.id=n.resource_id
    WHERE n.user_id=? AND n.id IN(SELECT value FROM json_each(?))`,
    )
    .bind(
      staff ? 1 : 0,
      staff ? 1 : 0,
      Date.now(),
      user,
      JSON.stringify(privateSafe.map((n) => n.id)),
    )
    .all<{
      id: string;
      resource_type: string | null;
      project_id: string | null;
      resource_allowed: number;
      client_notice: number;
    }>();
  const projectIds = result.results
    .filter((n) => n.resource_allowed && n.project_id)
    .map((n) => n.project_id!);
  const access = await projectAccessMap(db, projectIds, user, roles);
  const agencyNotices=privateSafe.filter(n=>n.deduplication_key?.startsWith("agency:"));
  let agencyAllowed=false;
  if(agencyNotices.length)agencyAllowed=(await agencyPermissions(db,user)).read;
  const allowed = new Set(
    result.results
      .filter((n) => {
        const agencyNotice=agencyNotices.find(row=>row.id===n.id);
        if(agencyNotice)return agencyAllowed;
        if (!n.resource_type) {
          const notice = privateSafe.find((row) => row.id === n.id);
          return (
            /^(document:|document-share:)/.test(
              notice?.deduplication_key || "",
            ) ||
            n.client_notice ||
            principal
          );
        }
        return (
          n.resource_allowed &&
          (!n.project_id || access.get(n.project_id)?.read)
        );
      })
      .map((n) => n.id),
  );
  return privateSafe.filter((row) => allowed.has(row.id));
}
