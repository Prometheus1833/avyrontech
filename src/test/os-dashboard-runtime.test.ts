// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dashboardRouter } from '../../cloudflare/workers/api/src/osDashboard';
import { bucharestMonthStart } from '../../cloudflare/workers/api/src/financialTotals';
import { aiProjectsRouter } from '../../cloudflare/workers/api/src/aiProjects';
import { operationsRouter } from '../../cloudflare/workers/api/src/operations';

// Node 22 supports SQLite but does not list this experimental module among all
// builtinModules. Load it natively rather than asking Vite to bundle it.
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

// Execute the production router's SQL against every versioned migration. This
// adapter models D1 batch atomicity; it does not replace remote Workers checks.
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: SqliteDatabase, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe('OS dashboard — migrated SQLite and actual Hono handlers', () => {
  let db: SqliteDatabase;
  let app: Hono;
  let actor: 'owner' | 'client' | 'super' | 'staff';
  const stamp = Date.now();

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of readdirSync('cloudflare/d1/migrations').filter(f => f.endsWith('.sql')).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, 'utf8'));
    }
    db.prepare(`INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES (?,?,?,1,?,?)`).run('owner','prometheus@avyron.ro','fixture-not-a-password',stamp,stamp);
    db.prepare(`INSERT INTO user_roles VALUES ('owner','admin')`).run();
    db.prepare(`INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)`).run('client','client@example.test','fixture-not-a-password',stamp,stamp);
    actor = 'owner';
    const binding = {
      prepare: (sql: string) => new Statement(db,sql),
      batch: async (statements: Statement[]) => {
        db.exec('BEGIN');
        try { const result = []; for (const statement of statements) result.push(await statement.run()); db.exec('COMMIT'); return result; }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      },
    };
    app = new Hono();
    app.use('*', async (c,next) => {
      Object.assign(c.env, {DB:binding,FILES:{list:async()=>({objects:[{key:'private/never-return-this-key'}]})},MEDIA:{},AI:{},KV:{get:async()=>null},MFA_AUTH_ENABLED:'false'});
      c.set('userId',actor); c.set('roles',actor==='staff'?['staff']:actor !== 'client' ? ['admin'] : ['user']);
      c.set('mfaVerified',false);
      await next();
    });
    app.onError(() => new Response('safe failure',{status:500}));
    app.route('/',dashboardRouter);
    app.route('/',aiProjectsRouter);
    app.route('/',operationsRouter);
  });
  afterEach(() => db.close());

  async function overview() {
    const response = await app.request('/api/os/overview',{},{});
    expect(response.status).toBe(200);
    return response.json();
  }
  function seedApproval(id = 'approval') {
    const version = db.prepare('SELECT id,agent_slug FROM ai_agent_versions LIMIT 1').get();
    db.prepare(`INSERT INTO ai_runs(id,agent_slug,agent_version_id,status,input_hash,created_at) VALUES (?,?,?,'awaiting_approval','fixture',?)`).run(`run-${id}`,version!.agent_slug,version!.id,stamp);
    db.prepare(`INSERT INTO ai_run_steps(id,run_id,sequence,kind,name,status,created_at) VALUES (?,?,0,'tool','fixture','awaiting_approval',?)`).run(`step-${id}`,`run-${id}`,stamp);
    db.prepare(`INSERT INTO ai_approvals(id,run_id,step_id,action_class,summary,request_json,requested_at,expires_at) VALUES (?,?,?,'write','Fixture','{}',?,?)`).run(id,`run-${id}`,`step-${id}`,stamp,stamp+60000);
  }
  const decide = (body: unknown) => app.request('/api/os/approvals/approval',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)},{});
  const inbox = async (query='') => {
    const response=await app.request('/api/os/approval-center'+query,{},{});
    expect(response.status).toBe(200);return response.json();
  };
  function seedContent(id='content', age=0) {
    const project=db.prepare("SELECT id FROM ai_projects WHERE slug='avyron-web'").get()!;
    db.prepare("INSERT INTO ai_content_items(id,project_id,format,objective,title,caption,status,expires_at,created_at,updated_at) VALUES (?,?,'post','visibility','Material de verificat','Textul versiunii în aprobare','pending_approval',?,?,?)").run(id,project.id,stamp+86400000,stamp-age,stamp-age);
    return project.id;
  }
  it('reads every original approval source and separates drafts from requests',async()=>{
    seedApproval();seedContent();
    db.prepare("INSERT INTO operation_records(id,kind,title,status,created_by,created_at,updated_at) VALUES ('op','contract','Contract în aprobare','pending','owner',?,?)").run(stamp,stamp);
    db.prepare("INSERT INTO ai_learning_queue(id,agent_slug,question,created_at,updated_at) VALUES ('learn','avy','Întrebare de verificat',?,?)").run(stamp,stamp);
    const page=await inbox();
    expect(page.counts).toEqual({agent:1,content:1,operation:1,template:11,learning:1});
    expect(page.total).toBe(15);
    expect(page.data.some(row=>row.source==='learning')).toBe(true);
    const content=await (await app.request('/api/os/approval-center/content/content',{},{})).json();
    expect(content.detail).toContain('Textul versiunii');expect(content.contextId).toBeTruthy();
  });
  it('paginates tied timestamps without duplicates and rejects invalid cursors',async()=>{
    for(let i=0;i<28;i++)seedApproval(`page-${String(i).padStart(2,'0')}`);
    const ids:string[]=[];let cursor:string|null=null;
    do {const page=await inbox(cursor?'?cursor='+encodeURIComponent(cursor):'');ids.push(...page.data.map(row=>row.source+row.id));cursor=page.nextCursor;}while(cursor);
    expect(ids).toHaveLength(39);expect(new Set(ids).size).toBe(39);
    expect((await inbox('?source=agent')).total).toBe(28);
    expect((await app.request('/api/os/approval-center?cursor=malformed',{},{})).status).toBe(400);
    expect((await app.request('/api/os/approval-center?source=documents_private',{},{})).status).toBe(400);
  });
  it('omits expired material and rereads decisions without copying approval records',async()=>{
    seedApproval();seedContent('stale',4*86400000);
    expect((await inbox()).counts.content).toBe(0);
    expect((await decide({revision:1,decision:'approved'})).status).toBe(200);
    expect((await inbox()).counts.agent).toBe(0);
    expect((await app.request('/api/os/approval-center/agent/approval',{},{})).status).toBe(404);
  });
  it('denies client listings and details, and grants corporate proposals to an authorized Super Admin',async()=>{
    db.prepare("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES ('super','super@fixture.test','fixture',1,?,?)").run(stamp,stamp);
    db.exec("INSERT INTO user_roles VALUES('super','admin'); INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES('super@fixture.test','superadmin','active',1,1)");
    db.prepare("INSERT INTO documents(id,number,scope,created_by,created_at,updated_at) VALUES ('company-doc','PRIVATE-TEST','company','owner',?,?)").run(stamp,stamp);
    db.prepare("INSERT INTO document_templates(id,family,name,visibility,source_document_id,created_at) VALUES ('private-model','custom','Secret model de test','private_proposal','company-doc',?)").run(stamp);
    db.prepare("INSERT INTO document_template_versions(id,template_id,version,payload_json,required_fields_json,created_at) VALUES ('private-version','private-model',1,'{}','[]',?)").run(stamp);
    expect((await inbox()).counts.template).toBe(12);
    actor='super';expect((await inbox()).counts.template).toBe(12);
    expect((await app.request('/api/os/approval-center/template/private-version',{},{})).status).toBe(200);
    actor='client';expect((await app.request('/api/os/approval-center',{},{})).status).toBe(403);
    expect((await app.request('/api/os/approval-center/template/private-version',{},{})).status).toBe(404);
  });
  it('refuses content approval when the reviewed version changed',async()=>{
    const project=seedContent();
    db.prepare("UPDATE ai_content_items SET caption='Versiune schimbată',updated_at=? WHERE id='content'").run(stamp+1);
    const response=await app.request(`/api/ai-projects/${project}/content/content`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'approved',expectedUpdatedAt:stamp})},{});
    expect(response.status).toBe(409);expect(db.prepare("SELECT status FROM ai_content_items WHERE id='content'").get()!.status).toBe('pending_approval');
    const ok=await app.request(`/api/ai-projects/${project}/content/content`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'approved',expectedUpdatedAt:stamp+1})},{});
    expect(ok.status).toBe(200);expect((await inbox()).counts.content).toBe(0);
    seedContent('expired-after-review');
    db.prepare("UPDATE ai_content_items SET expires_at=? WHERE id='expired-after-review'").run(Date.now()-1);
    const expired=await app.request(`/api/ai-projects/${project}/content/expired-after-review`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'approved',expectedUpdatedAt:stamp})},{});
    expect(expired.status).toBe(410);expect(db.prepare("SELECT status FROM ai_content_items WHERE id='expired-after-review'").get()!.status).toBe('pending_approval');
  });
  it('verifies storage reads without exposing keys and refuses client probes',async()=>{
    const response=await app.request('/api/os/storage',{},{});expect(response.status).toBe(200);
    const result=await response.json();expect(result.resources.find(row=>row.id==='files').status).toBe('funcțional');
    expect(result.resources.find(row=>row.id==='media').status).toBe('eroare');
    expect(JSON.stringify(result)).not.toContain('never-return-this-key');
    actor='client';expect((await app.request('/api/os/storage',{},{})).status).toBe(403);
  });
  it('decides the original operational record and removes it from the inbox',async()=>{
    db.prepare("INSERT INTO operation_records(id,kind,title,status,created_by,created_at,updated_at) VALUES ('op','contract','Contract în aprobare','pending','owner',?,?)").run(stamp,stamp);
    const response=await app.request('/api/operations/records/op/approve',{method:'POST',headers:{'content-type':'application/json','idempotency-key':'center-operation-approval-1'},body:JSON.stringify({revision:1})},{});
    expect(response.status).toBe(200);expect((await inbox()).counts.operation).toBe(0);
    expect(db.prepare("SELECT approved_revision FROM operation_records WHERE id='op'").get()!.approved_revision).toBe(1);
  });
  it('keeps project overview counts and names within explicit staff access',async()=>{
    db.prepare("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES ('staff','staff@fixture.test','fixture',1,?,?)").run(stamp,stamp);
    db.exec("INSERT INTO user_roles VALUES('staff','staff'); INSERT INTO clients(id,company_name,email,created_at) VALUES ('ca','Beneficiar A','a@fixture.test',1),('cb','Beneficiar B','b@fixture.test',1); INSERT INTO projects(id,client_id,name,slug,created_at) VALUES ('mine','ca','Proiect alocat','allocated',1),('other','cb','Proiect privat','private-project',1); INSERT INTO project_staff(project_id,user_id,assigned_at) VALUES('mine','staff',1)");
    actor='staff';const data=await overview();expect(data.metrics.projects).toBe(1);expect(data.activeProjects.map(row=>row.id)).toEqual(['mine']);
    db.exec("DELETE FROM project_staff WHERE user_id='staff'");expect((await overview()).metrics.projects).toBe(0);
  });
  it('includes projects authorized through the client organization and follows revocation',async()=>{
    db.exec("INSERT INTO organizations(id,slug,name,created_at,updated_at) VALUES('org','fixture-org','Organizație de test',1,1); INSERT INTO organization_memberships(organization_id,user_id,role,status,approved_at,created_at,updated_at) VALUES('org','client','client_member','active',1,1,1); INSERT INTO clients(id,company_name,email,created_at) VALUES('ca','Beneficiar A','a@fixture.test',1); INSERT INTO projects(id,client_id,organization_id,name,slug,created_at) VALUES('org-project','ca','org','Proiect organizație','org-project',1)");
    actor='client';expect((await overview()).metrics.projects).toBe(1);
    db.exec("UPDATE organization_memberships SET status='revoked' WHERE user_id='client'");expect((await overview()).metrics.projects).toBe(0);
  });

  it('does not double count urgent leads that are also waiting',async () => {
    db.prepare(`INSERT INTO leads(id,status,urgent,created_at) VALUES ('lead','new',1,?)`).run(stamp-86400000);
    const data = await overview();
    expect(data.attention.find(i=>i.id === 'leaduri-necontactate').title).toMatch(/^1 lead /);
  });
  it('keeps client financial and operational data private',async () => {
    seedApproval(); actor='client';
    const data = await overview();
    expect(data.role).toBe('client'); expect(data.approvals).toEqual([]);
    expect(data.agentRuns).toEqual([]); expect(data.integrations).toEqual([]);
    expect((await decide({revision:1,decision:'approved'})).status).toBe(403);
  });
  it('rejects non-string notes without changing approval state',async () => {
    seedApproval();
    expect((await decide({revision:1,decision:'approved',note:{malicious:true}})).status).toBe(400);
    expect(db.prepare('SELECT status FROM ai_approvals').get()!.status).toBe('pending');
  });
  it('rejects a stale approval after the requested intent changes',async()=>{
    seedApproval();db.exec(`UPDATE ai_approvals SET request_json='{"action":"changed"}' WHERE id='approval'`);
    expect((await decide({decision:'approved',revision:1})).status).toBe(409);
    expect((await decide({decision:'approved',revision:2})).status).toBe(200);
    expect(db.prepare('SELECT approved_revision FROM ai_approvals').get()!.approved_revision).toBe(2);
  });
  it('rolls back the decision if the continuation write fails',async () => {
    seedApproval();
    db.exec(`CREATE TRIGGER fail_run BEFORE UPDATE ON ai_runs BEGIN SELECT RAISE(ABORT,'simulated database failure'); END`);
    expect((await decide({revision:1,decision:'approved'})).status).toBe(500);
    expect(db.prepare('SELECT status FROM ai_approvals').get()!.status).toBe('pending');
    expect(db.prepare("SELECT COUNT(*) total FROM security_events WHERE action LIKE 'ai.approval.%'").get()!.total).toBe(0);
  });
  it('counts all pending approvals while returning only a bounded recent list',async () => {
    for(let i=0;i<10;i++) seedApproval(`a${i}`);
    const data = await overview();
    expect(data.approvals).toHaveLength(8); expect(data.metrics.approvals).toBe(10);
    expect(data.agentRuns).toHaveLength(8);
  });
  it('records one decision and one audit event on duplicate submission',async () => {
    seedApproval();
    expect((await decide({revision:1,decision:'approved'})).status).toBe(200);
    expect((await decide({revision:1,decision:'rejected'})).status).toBe(409);
    expect(db.prepare("SELECT COUNT(*) total FROM security_events WHERE action LIKE 'ai.approval.%'").get()!.total).toBe(1);
    expect(db.prepare('SELECT status FROM ai_runs').get()!.status).toBe('queued');
  });
  it('does not present the presence of a binding as a successful provider probe',async () => {
    const data = await overview();
    expect(data.health.find(i=>i.id==='ai').status).toBe('configurat');
  });
  it('rejects expired approvals without an audit claim or state transition',async () => {
    seedApproval(); db.prepare('UPDATE ai_approvals SET expires_at=?').run(stamp-1000);
    expect((await decide({revision:1,decision:'approved'})).status).toBe(409);
    expect(db.prepare('SELECT status FROM ai_runs').get()!.status).toBe('awaiting_approval');
  });
  it('does not resume a run while another step awaits approval',async () => {
    seedApproval();
    db.prepare(`INSERT INTO ai_run_steps(id,run_id,sequence,kind,name,status,created_at) VALUES ('step-2','run-approval',1,'tool','fixture','awaiting_approval',?)`).run(stamp);
    db.prepare(`INSERT INTO ai_approvals(id,run_id,step_id,action_class,summary,request_json,requested_at,expires_at) VALUES ('approval-2','run-approval','step-2','write','Fixture','{}',?,?)`).run(stamp,stamp+60000);
    expect((await decide({revision:1,decision:'approved'})).status).toBe(200);
    expect(db.prepare('SELECT status FROM ai_runs').get()!.status).toBe('awaiting_approval');
  });
  it('uses Romanian month boundaries through winter and summer time',() => {
    expect(new Date(bucharestMonthStart(Date.parse('2026-01-15T12:00:00Z'))).toISOString()).toBe('2025-12-31T22:00:00.000Z');
    expect(new Date(bucharestMonthStart(Date.parse('2026-07-15T12:00:00Z'))).toISOString()).toBe('2026-06-30T21:00:00.000Z');
    expect(new Date(bucharestMonthStart(Date.parse('2026-06-30T22:00:00Z'))).toISOString()).toBe('2026-06-30T21:00:00.000Z');
  });
  it('excludes drafts, future revenue and foreign amounts without an explicit RON equivalent',async () => {
    const insert = db.prepare(`INSERT INTO financial_revenues(id,revenue_type,service_name,status,currency,gross_amount_minor,amount_ron_minor,payment_date,created_at,updated_at)
      VALUES (?,'other','Fixture',?,?,?,?,?,?,?)`);
    insert.run('paid','paid','RON',10000,null,stamp,stamp,stamp);
    insert.run('draft','draft','RON',999999,null,stamp,stamp,stamp);
    insert.run('future','paid','RON',999999,null,stamp+86400000,stamp,stamp);
    insert.run('unknown-fx','paid','EUR',999999,null,stamp,stamp,stamp);
    insert.run('converted','paid','EUR',1000,5000,stamp,stamp,stamp);
    const data = await overview();
    expect(data.metrics.revenuesMinor).toBe(15000);
  });
  it('keeps the Social Manager, production task and central approvals synchronized without publishing variants',async()=>{
    const project=seedContent();
    db.prepare("INSERT INTO ai_social_jobs(id,project_id,schedule_key,kind,format,primary_channel,topic,status,due_at,content_id,created_at,updated_at) VALUES('social-job',?,'fixture-editorial','daily_post','post','facebook','Activitate viitoare','awaiting_approval',?,'content',?,?)").run(project,stamp+3600000,stamp,stamp);
    let response=await app.request('/api/ai-projects/avyron-web/social-manager',{},{});expect(response.status).toBe(200);let result=await response.json();expect(result.permission.canReview).toBe(true);expect(result.counts.pending_approval).toBe(1);expect(result.activities[0].status).toBe('awaiting_approval');
    response=await app.request(`/api/ai-projects/${project}/content/content`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'approved',expectedUpdatedAt:stamp})},{});expect(response.status).toBe(200);
    result=await (await app.request('/api/ai-projects/avyron-web/social-manager?status=approved',{},{})).json();expect(result.counts.approved).toBe(1);expect(result.activities[0].status).toBe('approved');expect((await inbox()).counts.content).toBe(0);
    expect(db.prepare("SELECT count(*) total FROM ai_project_events WHERE action='ai_project.content.approved'").get()!.total).toBe(1);
  });
  it('moves drafts through review before approval and synchronizes rejection and reopening',async()=>{
    const project=seedContent();db.exec("UPDATE ai_content_items SET status='draft' WHERE id='content'");
    db.prepare("INSERT INTO ai_social_jobs(id,project_id,schedule_key,kind,format,primary_channel,topic,status,due_at,content_id,created_at,updated_at) VALUES('social-job',?,'fixture-editorial','daily_post','post','facebook','Material','draft_ready',?,'content',?,?)").run(project,stamp+3600000,stamp,stamp);
    const action=async(status:string,revision:number)=>(await app.request(`/api/ai-projects/${project}/content/content`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status,expectedUpdatedAt:revision})},{}));
    expect((await action('approved',stamp)).status).toBe(409);
    expect((await action('pending_approval',stamp)).status).toBe(200);let current=db.prepare("SELECT updated_at FROM ai_content_items WHERE id='content'").get()!.updated_at as number;
    expect((await action('rejected',current)).status).toBe(200);expect(db.prepare("SELECT status FROM ai_social_jobs WHERE id='social-job'").get()!.status).toBe('skipped');current=db.prepare("SELECT updated_at FROM ai_content_items WHERE id='content'").get()!.updated_at as number;
    expect((await action('draft',current)).status).toBe(200);expect(db.prepare("SELECT status FROM ai_social_jobs WHERE id='social-job'").get()!.status).toBe('draft_ready');
  });
  it('filters expired editorial material, validates filters and refuses an unrelated client',async()=>{
    seedContent('expired',4*86400000);
    const result=await (await app.request('/api/ai-projects/avyron-web/social-manager',{},{})).json();expect(result.content).toEqual([]);
    expect((await app.request('/api/ai-projects/avyron-web/social-manager?status=private',{},{})).status).toBe(400);
    actor='client';expect((await app.request('/api/ai-projects/avyron-web/social-manager',{},{})).status).toBe(404);
  });

});
