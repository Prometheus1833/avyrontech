// @vitest-environment node
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const { DatabaseSync }=createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
const oldModel='@cf/qwen/qwen3-30b-a3b-fp8';
const newModel='@cf/mistralai/mistral-small-3.1-24b-instruct';
const migration=readFileSync('cloudflare/d1/migrations/0103_replace_retiring_qwen.sql','utf8');
function fixture(){
  const db=new DatabaseSync(':memory:');
  for(const file of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')&&f<'0103').sort())db.exec(readFileSync(`cloudflare/d1/migrations/${file}`,'utf8'));
  return db;
}
describe('Retiring Qwen replacement',()=>{
  it('migrates the primary runtime and approved snapshots without rewriting history or permissions',()=>{
    const db=fixture();try{
      const versions=db.prepare('SELECT * FROM ai_agent_versions ORDER BY id').all();
      const agents=db.prepare('SELECT * FROM ai_agents ORDER BY slug').all();
      const quota=db.prepare('SELECT * FROM financial_provider_quotas').all();
      const policies=db.prepare('SELECT * FROM financial_agent_provider_policies').all();
      const registry=db.prepare('SELECT * FROM ai_model_registry ORDER BY role').all();
      db.exec(migration);
      expect(db.prepare("SELECT model_id FROM ai_model_registry WHERE role='primary'").get()!.model_id).toBe(newModel);
      expect(db.prepare("SELECT * FROM ai_model_registry WHERE role<>'primary' ORDER BY role").all()).toEqual(registry.filter(r=>r.role!=='primary'));
      for(const old of versions)expect(db.prepare('SELECT * FROM ai_agent_versions WHERE id=?').get(old.id!)).toEqual(old);
      for(const old of agents){
        const current=db.prepare('SELECT * FROM ai_agents WHERE slug=?').get(old.slug!)!;
        const {model:previousModel,current_version:previousVersion,updated_at:previousUpdate,...previousFields}=old;
        const {model,current_version,updated_at,...currentFields}=current;
        expect(currentFields).toEqual(previousFields);
        if(previousModel!==oldModel)continue;
        expect(model).toBe(newModel);expect(Number(current_version)).toBeGreaterThan(Number(previousVersion));
        expect(Number(updated_at)).toBeGreaterThanOrEqual(Number(previousUpdate));
        const before=versions.find(v=>v.agent_slug===old.slug&&v.version===previousVersion)!;
        const next=db.prepare('SELECT * FROM ai_agent_versions WHERE agent_slug=? AND version=?').get(old.slug!,current_version!)!;
        for(const key of ['status','system_prompt','guardrails','tools_json','temperature','max_tokens','autonomy'])expect(next[key]).toEqual(before[key]);
        const tools=(id:import('node:sqlite').SQLInputValue)=>db.prepare('SELECT tool_slug,mode,allowed_scopes_json,max_calls_per_run FROM ai_agent_tool_policies WHERE agent_version_id=? ORDER BY tool_slug').all(id);
        expect(tools(next.id!)).toEqual(tools(before.id!));
      }
      expect(db.prepare('SELECT * FROM financial_provider_quotas').all()).toEqual(quota);
      expect(db.prepare('SELECT * FROM financial_agent_provider_policies').all()).toEqual(policies);
      const once=db.prepare('SELECT * FROM ai_agent_versions ORDER BY id').all();db.exec(migration);
      expect(db.prepare('SELECT * FROM ai_agent_versions ORDER BY id').all()).toEqual(once);
      expect(db.prepare("SELECT COUNT(*) n FROM audit_log WHERE action='ai.model.replaced'").get()!.n).toBe(1);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    }finally{db.close();}
  },15000);
  it('preserves paused agents, drafts, custom models and future unapproved edits',()=>{
    const db=fixture();try{
      db.exec("UPDATE ai_agents SET status='paused' WHERE slug='avy-finance'; UPDATE ai_agents SET model='custom-model' WHERE slug='knowledge-auditor'");
      db.exec("INSERT INTO ai_agent_versions(id,agent_slug,version,status,model,temperature,max_tokens,autonomy,system_prompt,guardrails,tools_json,change_note,created_at) SELECT 'future-edit',slug,current_version+1,'draft',model,temperature,max_tokens,autonomy,'Unapproved future text',guardrails,tools_json,'fixture',1 FROM ai_agents WHERE slug='avy'");
      const future=db.prepare("SELECT * FROM ai_agent_versions WHERE id='future-edit'").get();
      const custom=db.prepare("SELECT * FROM ai_agents WHERE slug='knowledge-auditor'").get();
      db.exec(migration);
      expect(db.prepare("SELECT status FROM ai_agents WHERE slug='avy-finance'").get()!.status).toBe('paused');
      expect(db.prepare("SELECT status FROM ai_agent_versions WHERE id='agent_version_mistral_0103_content'").get()!.status).toBe('draft');
      expect(db.prepare("SELECT * FROM ai_agent_versions WHERE id='future-edit'").get()).toEqual(future);
      expect(db.prepare("SELECT * FROM ai_agents WHERE slug='knowledge-auditor'").get()).toEqual(custom);
      expect(db.prepare("SELECT current_version FROM ai_agents WHERE slug='avy'").get()!.current_version).toBe(Number(future!.version)+1);
    }finally{db.close();}
  });
  it('keeps consumed quotas and disables an old route without activating an existing blocked replacement',()=>{
    const db=fixture();try{
      db.exec("UPDATE financial_provider_quotas SET quota_used=2898 WHERE vendor_id='fin_vendor_cloudflare_ai'");
      db.exec("INSERT INTO ai_core_reservations(idempotency_hash,usage_day,model_role,agent_slug,priority,estimated_neurons,created_at) VALUES('fixture',date('now'),'primary','avy','user',2898,1)");
      db.prepare("INSERT INTO ai_social_model_routes(project_id,route_key,provider,model_id,modality,execution_mode,billing_mode,status,priority,max_output_tokens,daily_unit_limit,source_url,notes,updated_at) VALUES('aip_avyron_web','routine_copy','cloudflare_workers_ai',?,'text','remote_api','free_only','disabled',5,700,3000,'https://example.test','Owner disabled',1)").run(newModel);
      const reservations=db.prepare('SELECT * FROM ai_core_reservations').all();
      db.exec(migration);
      expect(db.prepare('SELECT * FROM ai_core_reservations').all()).toEqual(reservations);
      expect(db.prepare("SELECT quota_used FROM financial_provider_quotas WHERE vendor_id='fin_vendor_cloudflare_ai'").get()!.quota_used).toBe(2898);
      expect(db.prepare("SELECT status,notes FROM ai_social_model_routes WHERE model_id=? AND project_id='aip_avyron_web' AND route_key='routine_copy'").get(newModel)).toMatchObject({status:'disabled',notes:'Owner disabled'});
      expect(db.prepare("SELECT COUNT(*) n FROM ai_social_model_routes WHERE model_id=? AND status='available'").get(oldModel)!.n).toBe(0);
    }finally{db.close();}
  });
});
