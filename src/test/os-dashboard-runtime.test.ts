import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dashboardRouter } from '../../cloudflare/workers/api/src/osDashboard';
import { bucharestMonthStart } from '../../cloudflare/workers/api/src/financialTotals';

// Execute the production router's SQL against every versioned migration. This
// adapter models D1 batch atomicity; it does not replace remote Workers checks.
class Statement {
  values: SQLInputValue[] = [];
  constructor(readonly db: DatabaseSync, readonly sql: string) {}
  bind(...values: SQLInputValue[]) { this.values = values; return this; }
  async first() { return this.db.prepare(this.sql).get(...this.values) ?? null; }
  async all() { return { results: this.db.prepare(this.sql).all(...this.values) }; }
  async run() { return { meta: this.db.prepare(this.sql).run(...this.values) }; }
}

describe('OS dashboard — migrated SQLite and actual Hono handlers', () => {
  let db: DatabaseSync;
  let app: Hono;
  let actor: 'owner' | 'client';
  const stamp = Date.now();

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    for (const file of readdirSync('cloudflare/d1/migrations').filter(f => f.endsWith('.sql')).sort()) {
      db.exec(readFileSync(`cloudflare/d1/migrations/${file}`, 'utf8'));
    }
    db.prepare(`INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)`).run('owner','prometheus@avyron.ro','fixture-not-a-password',stamp,stamp);
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
      Object.assign(c.env, {DB:binding,FILES:{},MEDIA:{},AI:{}});
      c.set('userId',actor); c.set('roles',actor === 'owner' ? ['admin'] : ['user']);
      await next();
    });
    app.onError(() => new Response('safe failure',{status:500}));
    app.route('/',dashboardRouter);
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
    expect((await decide({decision:'approved'})).status).toBe(403);
  });
  it('rejects non-string notes without changing approval state',async () => {
    seedApproval();
    expect((await decide({decision:'approved',note:{malicious:true}})).status).toBe(400);
    expect(db.prepare('SELECT status FROM ai_approvals').get()!.status).toBe('pending');
  });
  it('rolls back the decision if the continuation write fails',async () => {
    seedApproval();
    db.exec(`CREATE TRIGGER fail_run BEFORE UPDATE ON ai_runs BEGIN SELECT RAISE(ABORT,'simulated database failure'); END`);
    expect((await decide({decision:'approved'})).status).toBe(500);
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
    expect((await decide({decision:'approved'})).status).toBe(200);
    expect((await decide({decision:'rejected'})).status).toBe(409);
    expect(db.prepare("SELECT COUNT(*) total FROM security_events WHERE action LIKE 'ai.approval.%'").get()!.total).toBe(1);
    expect(db.prepare('SELECT status FROM ai_runs').get()!.status).toBe('queued');
  });
  it('does not present the presence of a binding as a successful provider probe',async () => {
    const data = await overview();
    expect(data.health.find(i=>i.id==='ai').status).toBe('configurat');
  });
  it('rejects expired approvals without an audit claim or state transition',async () => {
    seedApproval(); db.prepare('UPDATE ai_approvals SET expires_at=?').run(stamp-1000);
    expect((await decide({decision:'approved'})).status).toBe(409);
    expect(db.prepare('SELECT status FROM ai_runs').get()!.status).toBe('awaiting_approval');
  });
  it('does not resume a run while another step awaits approval',async () => {
    seedApproval();
    db.prepare(`INSERT INTO ai_run_steps(id,run_id,sequence,kind,name,status,created_at) VALUES ('step-2','run-approval',1,'tool','fixture','awaiting_approval',?)`).run(stamp);
    db.prepare(`INSERT INTO ai_approvals(id,run_id,step_id,action_class,summary,request_json,requested_at,expires_at) VALUES ('approval-2','run-approval','step-2','write','Fixture','{}',?,?)`).run(stamp,stamp+60000);
    expect((await decide({decision:'approved'})).status).toBe(200);
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
});
