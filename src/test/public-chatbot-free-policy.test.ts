// @vitest-environment node
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { reserveAiCost } from '../../cloudflare/workers/api/src/aiCostGuard';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const migration=readFileSync('cloudflare/d1/migrations/0102_public_chatbot_free_policy.sql','utf8');
function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')&&f<'0102').sort())db.exec(readFileSync(`cloudflare/d1/migrations/${file}`,'utf8'));
  return db;
}
function adapter(db:InstanceType<typeof DatabaseSync>){
  return {prepare(sql:string){const statement=db.prepare(sql);let values:import('node:sqlite').SQLInputValue[]=[];return {
    bind(...args:import('node:sqlite').SQLInputValue[]){values=args;return this;},
    async first(){return statement.get(...values)??null;},
    async run(){const r=statement.run(...values);return {success:true,meta:{changes:Number(r.changes)}};},
  };}} as unknown as D1Database;
}
describe('Public chatbot Free activation',()=>{
  it('allows zero-cost inference, blocks paid/over-quota requests and keeps an idempotent audit',async()=>{
    const db=fixture();try{
      const quotas=db.prepare('SELECT * FROM financial_provider_quotas').all();
      db.exec(migration);db.exec(migration);
      expect(db.prepare("SELECT status,daily_budget_minor,monthly_budget_minor,max_request_cost_minor FROM financial_agent_provider_policies WHERE agent_slug='avy'").get()).toMatchObject({status:'active',daily_budget_minor:0,monthly_budget_minor:0,max_request_cost_minor:0});
      expect(db.prepare('SELECT * FROM financial_provider_quotas').all()).toEqual(quotas);
      expect(db.prepare("SELECT COUNT(*) n FROM financial_audit_events WHERE id='fin_audit_avy_free_release_20261107'").get()!.n).toBe(1);
      const request={db:adapter(db),agentSlug:'avy',vendorId:'fin_vendor_cloudflare_ai',operation:'public_chat_generation',requestedUnits:1,estimatedCostMinor:0,idempotencyKey:'free-activation-test'};
      expect((await reserveAiCost(request)).decision).toBe('allowed');
      expect((await reserveAiCost({...request,estimatedCostMinor:1,idempotencyKey:'paid-rejected'})).decision).not.toBe('allowed');
      expect((await reserveAiCost({...request,requestedUnits:999999,idempotencyKey:'quota-rejected'})).decision).not.toBe('allowed');
    }finally{db.close();}
  });
  it.each([
    "UPDATE financial_agent_provider_policies SET status='paused' WHERE agent_slug='avy'",
    "UPDATE financial_agent_provider_policies SET status='active',daily_budget_minor=100 WHERE agent_slug='avy'",
    "UPDATE financial_agent_provider_policies SET monthly_budget_minor=100 WHERE agent_slug='avy'",
    "UPDATE financial_provider_quotas SET status='paused' WHERE vendor_id='fin_vendor_cloudflare_ai'",
    "UPDATE financial_provider_quotas SET hard_stop_before_paid=0 WHERE vendor_id='fin_vendor_cloudflare_ai'",
    "UPDATE ai_model_registry SET requires_billing=1 WHERE role='primary'",
  ])('preserves an explicit setting or unsafe provider state: %s',(setup)=>{
    const db=fixture();try{db.exec(setup);const policy=db.prepare('SELECT * FROM financial_agent_provider_policies').all();db.exec(migration);expect(db.prepare('SELECT * FROM financial_agent_provider_policies').all()).toEqual(policy);expect(db.prepare("SELECT COUNT(*) n FROM financial_audit_events WHERE id='fin_audit_avy_free_release_20261107'").get()!.n).toBe(0);}finally{db.close();}
  });
});
