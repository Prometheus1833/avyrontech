import type { Env } from "./types";
import { platformRoleForUser } from "./authorization";
import {
  documentActor,
  documentCapability,
  documentVisibility,
} from "./documentPolicy";
import {
  approvalSources,
  type ApprovalSource,
  type ApprovalItem,
} from "../../../../src/shared/approvals";
export {
  approvalSources,
  type ApprovalSource,
} from "../../../../src/shared/approvals";
type SourceQuery = {
  source: ApprovalSource;
  sql: string;
  values: (string | number)[];
};
type Row = {
  id: string;
  title: string;
  summary: string;
  requested_at: number;
  revision: number;
  context_id?: string;
  context_slug?: string;
  detail?: string;
  legal?: number;
  channels_json?: string;
  scheduled_at?: number | null;
  format?: string;
};

async function queries(
  env: Env,
  userId: string,
  timestamp: number,
): Promise<SourceQuery[] | null> {
  const role = await platformRoleForUser(env.DB, userId);
  if (!role) return null;
  const result: SourceQuery[] = [
    {
      source: "agent",
      values: [timestamp],
      sql: `SELECT a.id,a.summary title,a.action_class summary,a.requested_at,a.revision,a.run_id context_id,NULL context_slug,a.summary detail
      FROM ai_approvals a JOIN ai_runs r ON r.id=a.run_id JOIN ai_run_steps s ON s.id=a.step_id
      WHERE a.status='pending' AND a.expires_at>? AND r.status='awaiting_approval' AND s.status='awaiting_approval'`,
    },
    {
      source: "content",
      values: [timestamp - 3 * 86400000, timestamp],
      sql: `SELECT i.id,i.title,p.name summary,i.updated_at requested_at,i.updated_at revision,p.id context_id,p.slug context_slug,i.channels_json,i.scheduled_at,i.format,
      i.caption||char(10)||coalesce(i.cta,'')||char(10)||coalesce(i.visual_direction,'') detail
      FROM ai_content_items i JOIN ai_projects p ON p.id=i.project_id WHERE i.status='pending_approval'
      AND (p.slug<>'avyron-web' OR i.created_at>?) AND (i.expires_at IS NULL OR i.expires_at>?)`,
    },
    {
      source: "operation",
      values: [],
      sql: `SELECT id,title,CASE kind WHEN 'contract' THEN 'Contract' ELSE 'Cerere de modificare' END summary,
      updated_at requested_at,revision,NULL context_id,NULL context_slug,description||char(10)||coalesce(CAST(amount_minor/100.0 AS TEXT),'—')||' '||currency detail
      FROM operation_records WHERE status='pending' AND kind IN('contract','change_request') AND archived_at IS NULL`,
    },
    {
      source: "carousel", values: [],
      sql: `SELECT page_key id,coalesce(nullif(json_extract(draft_json,'$.heading.title.ro'),''),page_key) title,
      'Carusel de exemple — verificare înainte de publicare' summary,updated_at requested_at,revision,page_key context_id,NULL context_slug,
      'Verifică exemplele, imaginile și ordinea în modulul Carusele Exemple. Aprobarea și publicarea sunt acțiuni distincte.' detail
      FROM example_carousel_configs WHERE review_state='in_review'`,
    },
    {
      source: "learning",
      values: [],
      sql: `SELECT id,question title,agent_slug summary,updated_at requested_at,updated_at revision,NULL context_id,NULL context_slug,
      question||char(10)||coalesce(draft_answer,'Răspunsul necesită redactare și verificare.') detail FROM ai_learning_queue WHERE status='pending'`,
    },
  ];
  const actor = await documentActor(env.DB, userId);
  if (actor && documentCapability(actor, "documents.templates.manage")) {
    const visible = documentVisibility(actor, "source_document");
    result.push({
      source: "template",
      values: visible.values,
      sql: `SELECT v.id,t.name title,
      CASE t.legal WHEN 1 THEN 'Revizuire juridică de specialitate' ELSE 'Verificare model de document' END summary,
      v.created_at requested_at,v.version revision,t.id context_id,NULL context_slug,t.legal,
      CASE t.legal WHEN 1 THEN 'Model juridic inițial. Revizuirea de către specialist și înregistrarea referinței sunt obligatorii.' ELSE 'Verifică textul, câmpurile și condițiile modelului înainte de aprobare.' END detail
      FROM document_templates t JOIN document_template_versions v ON v.template_id=t.id
      WHERE v.review_status='review_required' AND v.version=(SELECT max(version) FROM document_template_versions WHERE template_id=t.id)
      AND (t.visibility='shared' OR EXISTS(SELECT 1 FROM documents source_document WHERE source_document.id=t.source_document_id AND ${visible.sql}))`,
    });
  }
  return result;
}

const item = (
  source: ApprovalSource,
  row: Row,
  role: string,
): ApprovalItem => ({
  id: row.id,
  source,
  title: row.title,
  summary: row.summary,
  requestedAt: row.requested_at,
  revision: row.revision,
  href:
    source === "carousel"
      ? `/profil?tab=example-carousels&carousel=${encodeURIComponent(row.context_id!)}`
      : source === "template"
      ? `/profil?tab=documents&template=${encodeURIComponent(row.context_id!)}`
      : source === "content"
        ? `/intern/ai-projects/${encodeURIComponent(row.context_slug!)}`
        : source === "learning"
          ? "/profil?tab=ai-os&ai_panel=learning"
          : source === "operation"
            ? "/profil?tab=os-centers"
            : "/profil?tab=ai-os",
  canDecide:
    source === "agent" ||
    source === "operation" ||
    source === "content",
  canReject:
    source === "agent" || source === "content",
  canWithdraw: source !== 'learning' || role === 'platform_owner',
  ...(source === 'content' ? { publication: {
    platforms: publicationPlatforms(row.channels_json),
    scheduledAt: Number.isSafeInteger(row.scheduled_at) && Number(row.scheduled_at) > 0 ? Number(row.scheduled_at) : null,
    format: row.format || null,
  } } : {}),
});

function publicationPlatforms(raw?: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((value): value is string => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,39}$/i.test(value)))].slice(0, 8) : [];
  } catch { return []; }
}

export async function readApprovalCenter(
  env: Env,
  userId: string,
  options: { source?: ApprovalSource; cursor?: string } = {},
) {
  const sources = await queries(env, userId, Date.now());
  if (!sources) return null;
  let cursor: { time: number; key: string } | null = null;
  if (options.cursor) {
    try {
      const parsed = JSON.parse(
        atob(options.cursor.replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (
        !Number.isSafeInteger(parsed.time) ||
        parsed.time < 0 ||
        typeof parsed.key !== "string" ||
        !/^(agent|content|operation|template|learning|carousel):[A-Za-z0-9_.:-]{1,160}$/.test(
          parsed.key,
        )
      )
        throw Error();
      cursor = parsed;
    } catch {
      throw new Error("invalid_approval_cursor");
    }
  }
  const role = await platformRoleForUser(env.DB, userId);
  const counts: Record<ApprovalSource, number> = {
    carousel: 0,
    agent: 0,
    content: 0,
    operation: 0,
    template: 0,
    learning: 0,
  };
  const pages = await Promise.all(
    sources.map(async (source) => {
      const count = await env.DB.prepare(
        `SELECT count(*) total FROM (${source.sql})`,
      )
        .bind(...source.values)
        .first<{ total: number }>();
      counts[source.source] = Number(count?.total || 0);
      if (options.source && source.source !== options.source) return [];
      const after = cursor
        ? "WHERE requested_at<? OR (requested_at=? AND (?||id)>?)"
        : "";
      const values = cursor
        ? [cursor.time, cursor.time, source.source + ":", cursor.key]
        : [];
      const page = await env.DB.prepare(
        `SELECT id,title,summary,requested_at,revision,context_id,context_slug${source.source === 'content' ? ',channels_json,scheduled_at,format' : ''} FROM (${source.sql}) ${after} ORDER BY requested_at DESC,id LIMIT 13`,
      )
        .bind(...source.values, ...values)
        .all<Row>();
      return page.results.map((row) => item(source.source, row, role!));
    }),
  );
  const ordered = pages
    .flat()
    .sort(
      (a, b) =>
        b.requestedAt - a.requestedAt ||
        (a.source + ":" + a.id < b.source + ":" + b.id ? -1 : 1),
    );
  const data = ordered.slice(0, 12),
    last = data.at(-1);
  return {
    generatedAt: Date.now(),
    data,
    total: options.source
      ? counts[options.source]
      : Object.values(counts).reduce((a, b) => a + b, 0),
    counts,
    nextCursor:
      ordered.length > 12 && last
        ? btoa(
            JSON.stringify({
              time: last.requestedAt,
              key: last.source + ":" + last.id,
            }),
          )
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "")
        : null,
  };
}

export async function readApprovalDetail(
  env: Env,
  userId: string,
  source: ApprovalSource,
  id: string,
) {
  const sources = await queries(env, userId, Date.now());
  const query = sources?.find((s) => s.source === source);
  if (!query) return null;
  const row = await env.DB.prepare(`SELECT * FROM (${query.sql}) WHERE id=?`)
    .bind(...query.values, id)
    .first<Row>();
  if (!row) return null;
  const role = await platformRoleForUser(env.DB, userId);
  return {
    ...item(source, row, role!),
    contextId: row.context_id || null,
    detail: row.detail || row.summary,
  };
}

/** Withdraw only an exact pending request. Native records and their audit survive. */
export async function withdrawApproval(env:Env,userId:string,source:ApprovalSource,id:string,revision:number){
 const detail=await readApprovalDetail(env,userId,source,id);
 if(!detail?.canWithdraw)return{code:'not_found',status:404 as const};
 if(detail.revision!==revision)return{code:'revision_conflict',status:409 as const};
 const timestamp=Math.max(Date.now(),revision+1),eventId=crypto.randomUUID();
 const definitions:Record<ApprovalSource,{table:string;where:string;values:(string|number)[];set:string;setValues:(string|number)[]}>= {
  agent:{table:'ai_approvals',where:"id=? AND revision=? AND status='pending' AND expires_at>?",values:[id,revision,Date.now()],set:"status='rejected',decided_by=?,decided_at=?,decision_note='Retrasă din centrul de aprobări',revision=revision+1",setValues:[userId,timestamp]},
  content:{table:'ai_content_items',where:"id=? AND updated_at=? AND status='pending_approval' AND (expires_at IS NULL OR expires_at>?)",values:[id,revision,Date.now()],set:"status='rejected',approved_by=NULL,approved_at=NULL,updated_at=?",setValues:[timestamp]},
  operation:{table:'operation_records',where:"id=? AND revision=? AND status='pending' AND archived_at IS NULL",values:[id,revision],set:'archived_at=?,updated_at=?,revision=revision+1',setValues:[timestamp,timestamp]},
  template:{table:'document_template_versions',where:"id=? AND version=? AND review_status='review_required'",values:[id,revision],set:"review_status='retired'",setValues:[]},
  carousel:{table:'example_carousel_configs',where:"page_key=? AND revision=? AND review_state='in_review'",values:[id,revision],set:"review_state='rejected',updated_by=?,updated_at=?",setValues:[userId,timestamp]},
  learning:{table:'ai_learning_queue',where:"id=? AND updated_at=? AND status='pending'",values:[id,revision],set:"status='rejected',updated_at=?",setValues:[timestamp]},
 };
 const definition=definitions[source];
 const statements=[env.DB.prepare(`INSERT INTO security_events(id,actor_user_id,actor_type,action,target_type,target_id,outcome,severity,metadata_json,created_at)
 SELECT ?,?,'user','os.approval.withdrawn',?,?,'allowed','info',?,? WHERE EXISTS(SELECT 1 FROM ${definition.table} WHERE ${definition.where})`)
 .bind(eventId,userId,source,id,JSON.stringify({revision}),timestamp,...definition.values),
 env.DB.prepare(`UPDATE ${definition.table} SET ${definition.set} WHERE ${definition.where} AND EXISTS(SELECT 1 FROM security_events WHERE id=?)`).bind(...definition.setValues,...definition.values,eventId)];
 if(source==='agent')statements.push(
 env.DB.prepare("UPDATE ai_run_steps SET status='denied' WHERE id=(SELECT step_id FROM ai_approvals WHERE id=?) AND status='awaiting_approval' AND EXISTS(SELECT 1 FROM security_events WHERE id=?)").bind(id,eventId),
 env.DB.prepare("UPDATE ai_runs SET status='denied' WHERE id=(SELECT run_id FROM ai_approvals WHERE id=?) AND status='awaiting_approval' AND EXISTS(SELECT 1 FROM security_events WHERE id=?)").bind(id,eventId));
 if(source==='content')statements.push(env.DB.prepare("UPDATE ai_social_jobs SET status='skipped',updated_at=? WHERE content_id=? AND status NOT IN('generating','completed','skipped') AND EXISTS(SELECT 1 FROM security_events WHERE id=?)").bind(timestamp,id,eventId));
 const [claim]=await env.DB.batch(statements);
 return Number(claim.meta.changes)?{ok:true}:{code:'revision_conflict',status:409 as const};
}
