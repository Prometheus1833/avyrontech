// @vitest-environment node
import type { DatabaseSync as SqliteDatabase, SQLInputValue } from 'node:sqlite';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dashboardRouter } from '../../cloudflare/workers/api/src/osDashboard';
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

describe('Overview actions — native handlers and full migrated SQLite', () => {
  let db: SqliteDatabase;
  let app: Hono;
  let actor: 'owner' | 'client' | 'super' | 'staff';
  let stamp: number;
  let resources:Record<string,unknown>;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of readdirSync('cloudflare/d1/migrations').filter(f => f.endsWith('.sql')).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, 'utf8'));
    }
    stamp = Date.now(); resources={};
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
      Object.assign(c.env, {DB:binding,FILES:{list:async()=>({objects:[{key:'private/never-return-this-key'}]})},MEDIA:{},AI:{},KV:{get:async()=>null},MFA_AUTH_ENABLED:'false'},resources);
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
  function seedContent(id='content', age=0) {
    const project=db.prepare("SELECT id FROM ai_projects WHERE slug='avyron-web'").get()!;
    db.prepare("INSERT INTO ai_content_items(id,project_id,format,objective,title,caption,status,expires_at,created_at,updated_at) VALUES (?,?,'post','visibility','Material de verificat','Textul versiunii în aprobare','pending_approval',?,?,?)").run(id,project.id,stamp+86400000,stamp-age,stamp-age);
    return project.id;
  }

  const withdraw=(source:string,id:string,revision:number)=>app.request(`/api/os/approval-center/${source}/${id}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({confirmed:true,revision})},{});
  const probe=(key='health-request-123')=>app.request('/api/os/health/ai',{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':key},body:JSON.stringify({confirmed:true})},{});
  const useCache=()=>{const cache=new Map<string,string>();resources.KV={get:async(key:string)=>cache.get(key)||null,put:async(key:string,value:string)=>{cache.set(key,value);}};return cache;};
  it('shows registered agent names and never substitutes a slug for an available name',async()=>{
    seedApproval();const snapshot=await overview();expect(snapshot.agentRuns[0].agent_name).toBe(db.prepare('SELECT name FROM ai_agents WHERE slug=?').get(snapshot.agentRuns[0].agent_slug)!.name);
  });
  it('checks R2 reads once per cached window, without disclosing keys or claiming writes',async()=>{
    useCache();const list=vi.fn(async()=>({objects:[{key:'private-raw-object-name'}]}));resources.FILES={list};resources.MEDIA={list};
    const first=await overview();await overview();expect(list).toHaveBeenCalledTimes(2);expect(first.health.find((r:{id:string})=>r.id==='files')).toMatchObject({status:'funcțional',detail:expect.stringContaining('Scrierea')});expect(JSON.stringify(first)).not.toContain('private-raw-object-name');
  });
  it('classifies a refused R2 read safely and does not infer AI success from binding or reservations',async()=>{
    resources.FILES={list:async()=>{throw Error('403 access denied private credential');}};const data=await overview();expect(data.health.find((r:{id:string})=>r.id==='files')).toMatchObject({status:'eroare',code:'access_denied'});expect(data.health.find((r:{id:string})=>r.id==='ai').status).not.toBe('funcțional');expect(JSON.stringify(data)).not.toContain('private credential');
  });
  it('tests AI through the native free guard and reuses diagnostic evidence without a second inference',async()=>{
    useCache();const run=vi.fn(async()=>({response:'OK'}));resources.AI={run};
    expect((await probe()).status).toBe(200);const repeated=await(await probe()).json();expect(repeated.status).toBe('funcțional');expect(run).toHaveBeenCalledTimes(1);expect(run.mock.calls[0][1].max_tokens).toBeLessThanOrEqual(64);expect(db.prepare("SELECT count(*) n FROM financial_usage_events WHERE operation='os_health_probe' AND decision='allowed'").get()!.n).toBe(1);
  });
  it('blocks paid models and prevents a diagnostic retry from duplicating inference when cache writes fail',async()=>{
    const run=vi.fn(async()=>({response:'OK'}));resources.AI={run};
    db.exec("UPDATE ai_model_registry SET requires_billing=1 WHERE role IN('primary','secondary')");expect((await(await probe()).json()).code).toBe('free_model_required');expect(run).not.toHaveBeenCalled();
    db.exec("DELETE FROM rate_limit_counters;UPDATE ai_model_registry SET requires_billing=0 WHERE role IN('primary','secondary')");await probe();expect((await(await probe()).json()).code).toBe('probe_result_unknown');expect(run).toHaveBeenCalledTimes(1);
  });
  it('uses the existing free secondary model when the primary role cannot reserve a minimal test',async()=>{
    const run=vi.fn(async()=>({choices:[{message:{content:'OK'}}],usage:{prompt_tokens:5,completion_tokens:1}}));resources.AI={run};db.exec("UPDATE ai_model_registry SET daily_neuron_limit=5 WHERE role='primary'");expect((await(await probe()).json()).status).toBe('funcțional');expect(run.mock.calls[0][0]).toBe(db.prepare("SELECT model_id FROM ai_model_registry WHERE role='secondary'").get()!.model_id);expect(db.prepare("SELECT daily_neuron_limit FROM ai_model_registry WHERE role='primary'").get()!.daily_neuron_limit).toBe(5);
  });
  it('honors the native global kill switch even when a prior successful probe was cached',async()=>{
    useCache();const run=vi.fn(async()=>({response:'OK'}));resources.AI={run};await probe();db.exec("INSERT INTO ai_kill_switches(scope_type,scope_id,enabled,reason,changed_at) VALUES ('global','*',1,'Human pause',1)");expect((await(await probe('second-health-probe')).json()).code).toBe('ai_paused');expect(run).toHaveBeenCalledTimes(1);
  });
  it('does not expose provider exceptions or grant client access to diagnostic execution',async()=>{
    resources.AI={run:async()=>{throw Error('provider private token');}};const result=await(await probe()).json();expect(result.status).not.toBe('funcțional');expect(JSON.stringify(result)).not.toContain('private token');actor='client';expect((await probe('another-request')).status).toBe(403);
  });
  it('withdraws exact pending native requests, preserves rows and denies duplicate/stale decisions',async()=>{
    seedApproval();seedContent();db.prepare("INSERT INTO operation_records(id,kind,title,status,created_by,created_at,updated_at) VALUES ('op','contract','Test contract','pending','owner',?,?)").run(stamp,stamp);
    for(const [source,id,revision] of [['agent','approval',1],['content','content',stamp],['operation','op',1]] as const){expect((await withdraw(source,id,revision)).status).toBe(200);expect((await withdraw(source,id,revision)).status).not.toBe(200);}
    expect(db.prepare("SELECT status FROM ai_content_items WHERE id='content'").get()!.status).toBe('rejected');expect(db.prepare("SELECT status FROM ai_runs WHERE id='run-approval'").get()!.status).toBe('denied');expect(db.prepare("SELECT archived_at FROM operation_records WHERE id='op'").get()!.archived_at).toBeTruthy();expect(db.prepare("SELECT count(*) n FROM security_events WHERE action='os.approval.withdrawn'").get()!.n).toBe(3);
  });
  it('retires an unapproved template version without deleting or approving its content',async()=>{
    // The approval center intentionally exposes only the latest master version.
    // Older review_required versions remain immutable history after migration 0099.
    const row=db.prepare("SELECT v.id,v.template_id,v.version,v.payload_json FROM document_template_versions v WHERE v.review_status='review_required' AND v.version=(SELECT max(version) FROM document_template_versions WHERE template_id=v.template_id) ORDER BY v.id LIMIT 1").get()!;
    const historical=db.prepare("SELECT id,version,payload_json FROM document_template_versions WHERE template_id=? AND version<? ORDER BY version DESC LIMIT 1").get(row.template_id,row.version)!;
    expect(historical).toBeTruthy();
    expect((await withdraw('template',String(historical.id),Number(historical.version))).status).toBe(404);
    expect(db.prepare('SELECT payload_json FROM document_template_versions WHERE id=?').get(historical.id)!.payload_json).toBe(historical.payload_json);expect((await withdraw('template',String(row.id),Number(row.version))).status).toBe(200);expect(db.prepare('SELECT review_status,payload_json FROM document_template_versions WHERE id=?').get(row.id)).toMatchObject({review_status:'retired',payload_json:row.payload_json});
    actor='client';expect((await withdraw('template',String(row.id),Number(row.version))).status).toBe(404);
  });
  it('withdraws learning and carousel requests while preserving answers and the published carousel revision',async()=>{
    db.prepare("INSERT INTO ai_learning_queue(id,agent_slug,question,draft_answer,created_at,updated_at) VALUES ('learn','avy','Question','Draft answer',?,?)").run(stamp,stamp);
    db.exec("INSERT INTO example_carousel_configs(page_key,revision,draft_json,review_state,updated_by,updated_at) VALUES ('website-presentation',2,'{}','in_review','owner',1);INSERT INTO example_carousel_versions(page_key,revision,content_json,actor_user_id,created_at) VALUES ('website-presentation',1,'{}','owner',1);UPDATE example_carousel_configs SET published_revision=1 WHERE page_key='website-presentation'");
    expect((await withdraw('learning','learn',stamp)).status).toBe(200);expect(db.prepare("SELECT status,draft_answer FROM ai_learning_queue WHERE id='learn'").get()).toMatchObject({status:'rejected',draft_answer:'Draft answer'});
    expect((await withdraw('carousel','website-presentation',2)).status).toBe(200);expect(db.prepare("SELECT review_state,published_revision FROM example_carousel_configs WHERE page_key='website-presentation'").get()).toMatchObject({review_state:'rejected',published_revision:1});expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('keeps owner-only learning withdrawal permissions on the server',async()=>{
    db.exec("INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES ('super','super@fixture.test','fixture',1,1,1);INSERT INTO user_roles VALUES('super','admin');INSERT INTO platform_principals(email,role,status,created_at,updated_at) VALUES ('super@fixture.test','superadmin','active',1,1)");
    db.prepare("INSERT INTO ai_learning_queue(id,agent_slug,question,created_at,updated_at) VALUES ('owner-learning','avy','Question',?,?)").run(stamp,stamp);actor='super';expect((await withdraw('learning','owner-learning',stamp)).status).toBe(404);expect(db.prepare("SELECT status FROM ai_learning_queue WHERE id='owner-learning'").get()!.status).toBe('pending');
  });
  it('rolls back a withdrawal when its audit cannot be written',async()=>{
    seedContent();db.exec("CREATE TRIGGER reject_withdraw BEFORE INSERT ON security_events BEGIN SELECT RAISE(ABORT,'failure'); END");expect((await withdraw('content','content',stamp)).status).toBe(500);expect(db.prepare("SELECT status FROM ai_content_items WHERE id='content'").get()!.status).toBe('pending_approval');
  });
  it('lists actual attention events with authorization, pagination and immediate revocation',async()=>{
    db.exec("INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES ('staff','staff@fixture.test','fixture',1,1);INSERT INTO user_roles VALUES('staff','staff');INSERT INTO clients(id,company_name,email,created_at) VALUES ('ca','A','a@fixture.test',1),('cb','B','b@fixture.test',1);INSERT INTO projects(id,client_id,name,slug,created_at) VALUES ('mine','ca','Assigned','assigned',1),('other','cb','Other private project','other-private',1);INSERT INTO project_staff(project_id,user_id,assigned_at) VALUES('mine','staff',1)");
    const insert=db.prepare("INSERT INTO project_work_items(id,project_id,kind,title,due_at,created_by,created_at,updated_at) VALUES (?,?,'task',?,?,'owner',1,1)");for(let i=0;i<30;i++)insert.run('item'+i,'mine','Authorized task '+i,stamp-1000);insert.run('private-item','other','Private task',stamp-1000);
    actor='staff';const response=await app.request('/api/os/attention/termene-proiecte',{},{});expect(response.status).toBe(200);const page=await response.json();expect(page.total).toBe(30);expect(page.data).toHaveLength(25);expect(page.nextOffset).toBe(25);expect(JSON.stringify(page)).not.toContain('Private task');expect(page.data[0].href).toBe('/intern/projects/assigned');
    db.exec("DELETE FROM project_staff WHERE user_id='staff'");expect((await(await app.request('/api/os/attention/termene-proiecte',{},{})).json()).data).toEqual([]);expect((await app.request('/api/os/attention/securitate',{},{})).status).toBe(404);
  });
  it('returns financial alert actions and blocks client or unsupported attention sources',async()=>{
    db.exec("INSERT INTO financial_alerts(id,kind,severity,title,message,detected_at) VALUES ('alert','quota','warning','Check budget','Review this budget',1)");const result=await(await app.request('/api/os/attention/alerte-financiare',{},{})).json();expect(result.data[0]).toMatchObject({id:'alert',action:'acknowledge'});actor='client';expect((await app.request('/api/os/attention/alerte-financiare',{},{})).status).toBe(404);expect((await app.request('/api/os/attention/unknown',{},{})).status).toBe(404);expect((await app.request('/api/os/attention/securitate?offset=-1',{},{})).status).toBe(400);
  });
});
