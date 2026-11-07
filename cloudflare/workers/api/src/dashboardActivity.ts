import { Hono } from "hono";
import type { AppBindings } from "./types";
import { leadReadPredicate } from "./leads";
import { platformRoleForUser,hasCapability } from "./authorization";
import { staffRequestAllowed } from "./staffAccessPolicy";
import { projectChatUnread } from "./projectChat";
import { filterNotifications, type StoredNotice } from "./notificationPolicy";
import { buildAccess, canOpenSection } from "../../../../src/lib/access";

export const dashboardActivityRouter = new Hono<AppBindings>();
dashboardActivityRouter.get("/api/workspace/activity-counts", async c => {
  if (!c.get("roles").some(r => r === "admin" || r === "staff")) return c.json({error:{code:"forbidden"}},403);
  c.header("Cache-Control","private, no-store");
  const db=c.env.DB,user=c.get("userId"),timestamp=Date.now();
  const principal=await platformRoleForUser(db,user);
  const grants=await db.prepare("SELECT capability FROM user_capabilities WHERE user_id=? AND organization_id IS NULL AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>?)").bind(user,timestamp).all<{capability:string}>();
  const access=buildAccess({roles:c.get("roles"),superadmin:!!principal,capabilities:grants.results.map(r=>r.capability)});
  const counts:Record<string,number>={};
  const count=async(section:string,path:string,sql:string,args:(string|number)[]=[])=>{
    if(!canOpenSection(section,access)||!(await staffRequestAllowed(db,user,path,"GET")))return;
    counts[section]=Number((await db.prepare(sql).bind(...args).first<{total:number}>())?.total||0);
  };
  await Promise.all([
    count("staff-tickets","/api/workspace/tickets","SELECT count(*) total FROM support_tickets WHERE status IN ('open','pending')"),
    count("announcements","/api/workspace/announcements","SELECT count(*) total FROM staff_announcements a WHERE a.archived_at IS NULL AND a.author_id<>? AND NOT EXISTS(SELECT 1 FROM staff_announcement_reads r WHERE r.user_id=? AND r.announcement_id=a.id)",[user,user]),
    count("demo-requests","/api/example-requests","SELECT count(*) total FROM example_requests WHERE status='new'"),
    principal ? count("reviews","/api/service-reviews/admin","SELECT count(*) total FROM service_reviews WHERE status='pending'") : Promise.resolve(),
  ]);
  const visibility=leadReadPredicate(user,!!principal||await hasCapability(db,user,"leads.read"));
  const active=`lead.deleted_at IS NULL AND lead.archived_at IS NULL AND lead.lifecycle_stage='new_lead' AND ${visibility.sql}`;
  await Promise.all([
    count("leads","/api/leads",`SELECT count(*) total FROM leads lead WHERE ${active}`,visibility.values),
    count("logo-simulations","/api/leads",`SELECT count(*) total FROM leads lead WHERE ${active} AND lead.product='logo-studio-3d' AND lead.source='logo-product:3d'`,visibility.values),
    count("logo-2d-simulations","/api/leads",`SELECT count(*) total FROM leads lead WHERE ${active} AND lead.product='logo-studio' AND lead.source LIKE 'logo-studio:%' AND json_extract(CASE WHEN json_valid(lead.config_json) THEN lead.config_json ELSE '{}' END,'$.kind')='static'`,visibility.values),
  ]);
  if(canOpenSection("intern",access)&&await staffRequestAllowed(db,user,"/api/workspace/chat/conversations","GET")) {
    const row=await db.prepare(`SELECT count(*) total FROM staff_chat_messages m LEFT JOIN staff_chat_reads r ON r.user_id=? AND r.target=CASE WHEN m.recipient_id IS NULL THEN 'channel:'||m.channel ELSE 'dm:'||m.author_id END WHERE m.project_id IS NULL AND m.author_id<>? AND (m.recipient_id IS NULL OR m.recipient_id=?) AND (r.message_at IS NULL OR m.created_at>r.message_at OR(m.created_at=r.message_at AND m.id>r.message_id))`).bind(user,user,user).first<{total:number}>();
    counts.intern=Number(row?.total||0)+await projectChatUnread(c);
  }
  if(principal) {
    counts["social-manager"]=Number((await db.prepare(`SELECT count(*) total FROM ai_content_items i JOIN ai_projects p ON p.id=i.project_id WHERE p.slug='avyron-web' AND i.status='pending_approval' AND (i.expires_at IS NULL OR i.expires_at>?) AND i.created_at>?`).bind(timestamp,timestamp-3*86400000).first<{total:number}>())?.total||0);
    const plans=await db.prepare("SELECT count(*) total FROM ai_social_jobs j JOIN ai_projects p ON p.id=j.project_id WHERE p.slug='avyron-web' AND j.plan_review_state='pending' AND j.content_id IS NULL AND j.blog_post_id IS NULL AND j.status IN ('queued','awaiting_budget','failed')").first<{total:number}>();
    counts["social-manager"]+=Number(plans?.total||0);
  }
  // Reuse the document feed's resource filter before deriving any count, including corporate notices.
  const notices=await db.prepare("SELECT * FROM operation_notifications WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 200").bind(user).all<StoredNotice>();
  const visible=(await filterNotifications(db,user,c.get("roles"),notices.results)).slice(0,100).filter(n=>!n.read_at);
  counts.notifications=visible.length+(counts.announcements||0);
  const destinations:Record<string,number>={};
  for(const n of visible){const destination=n.category==="project"?"projects":n.category==="subscription"?"subscriptions":n.destination;if(destination&&canOpenSection(destination,access))destinations[destination]=(destinations[destination]||0)+1;}
  for(const [section,total] of Object.entries(destinations))if(counts[section]===undefined)counts[section]=total;
  return c.json({counts,generatedAt:timestamp});
});
