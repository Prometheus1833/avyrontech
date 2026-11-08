// @vitest-environment node
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {Hono} from 'hono';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {newsletterOperationsRouter} from '../../cloudflare/workers/api/src/newsletterOperations';
import type {AppBindings,Env} from '../../cloudflare/workers/api/src/types';
class Statement{values:SQLInputValue[]=[];constructor(readonly db:DatabaseSync,readonly sql:string){}bind(...v:SQLInputValue[]){this.values=v;return this}async first(){return this.db.prepare(this.sql).get(...this.values)||null}async all(){return{results:this.db.prepare(this.sql).all(...this.values)}}async run(){return{meta:this.db.prepare(this.sql).run(...this.values)}}}
let db:DatabaseSync,env:Env,app:Hono<AppBindings>,actor:string,mfa:boolean,beforeBatch:(()=>void)|null;
beforeEach(()=>{
 db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');for(const f of readdirSync('cloudflare/d1/migrations').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('cloudflare/d1/migrations/'+f,'utf8'));
 for(const [id,email,role] of [['owner','prometheus@avyron.ro','admin'],['staff','staff@example.test','staff'],['client','client@example.test','user']]){db.prepare('INSERT INTO users(id,email,password_hash,email_verified,created_at,updated_at) VALUES(?,?,?,1,1,1)').run(id,email,'synthetic');db.prepare('INSERT INTO user_roles VALUES(?,?)').run(id,role)}
 db.exec("INSERT INTO newsletter_campaigns(id,name,language,subject,preheader,content,status,segment_json,created_by,updated_by,created_at,updated_at,provider_broadcast_id,provider_status) VALUES('one','Campanie demonstrativă','ro','Subiect de verificat','','Conținut sintetic verificabil','ready','{}','owner','owner',1,1,'broadcast-1','queued')");
 env={MFA_AUTH_ENABLED:'true',RESEND_API_KEY:'synthetic-api-key',RESEND_MARKETING_FROM:'AVYRON <news@news.example.test>',RESEND_MARKETING_SEGMENT_ID:'segment-1',DB:{prepare:(q:string)=>new Statement(db,q),batch:async(ss:Statement[])=>{beforeBatch?.();beforeBatch=null;db.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());db.exec('COMMIT');return r}catch(e){db.exec('ROLLBACK');throw e}}}} as unknown as Env;
 actor='owner';mfa=true;beforeBatch=null;app=new Hono<AppBindings>();app.use('*',async(c,next)=>{c.set('userId',actor);c.set('roles',[actor==='owner'?'admin':actor==='staff'?'staff':'user']);c.set('mfaVerified',mfa);await next()});app.route('/',newsletterOperationsRouter);
});
afterEach(()=>{expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);db.close();vi.restoreAllMocks()});
const request=(path:string,body?:unknown,method='GET')=>app.request('/api/newsletter/admin/'+path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})},env);
it('isolates operations from staff/clients and separates configured secrets from real feedback',async()=>{
 const r=await request('operations');expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('private, no-store');const data=await r.json();expect(data.provider.configured).toBe(true);expect(data.lastWebhook).toBeNull();expect(data.events).toEqual([]);expect(JSON.stringify(data)).not.toContain('synthetic-api-key');
 actor='staff';expect((await request('operations')).status).toBe(403);actor='client';expect((await request('operations')).status).toBe(403);
});
it('assigns only active staff with MFA and rejects stale or racing writes',async()=>{
 mfa=false;expect((await request('campaigns/one/assignment',{userId:'staff',revision:1},'PATCH')).status).toBe(403);mfa=true;
 expect((await request('campaigns/one/assignment',{userId:'client',revision:1},'PATCH')).status).toBe(400);
 expect((await request('campaigns/one/assignment',{userId:'staff',revision:1},'PATCH')).status).toBe(200);expect(db.prepare("SELECT assigned_user_id FROM newsletter_campaigns WHERE id='one'").get()!.assigned_user_id).toBe('staff');
 expect((await request('campaigns/one/assignment',{userId:null,revision:1},'PATCH')).status).toBe(409);
 beforeBatch=()=>db.exec("UPDATE newsletter_campaigns SET operations_revision=3 WHERE id='one'");expect((await request('campaigns/one/assignment',{userId:null,revision:2},'PATCH')).status).toBe(409);expect(db.prepare("SELECT assigned_user_id FROM newsletter_campaigns WHERE id='one'").get()!.assigned_user_id).toBe('staff');
});
it('reconciles only a native broadcast through GET and preserves sent versus delivered',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'broadcast-1',status:'sent',segment_id:'segment-1',sent_at:'2026-11-08T08:00:00Z'}),{status:200}));
 const r=await request('operations/reconcile',{campaignId:'one'},'POST');expect(r.status).toBe(200);expect((await r.json()).data).toEqual([{id:'one',status:'sent'}]);expect(fetch.mock.calls[0][0]).toBe('https://api.resend.com/broadcasts/broadcast-1');expect(fetch.mock.calls[0][1]?.method).toBe('GET');expect(db.prepare("SELECT provider_status FROM newsletter_campaigns WHERE id='one'").get()!.provider_status).toBe('sent');
 expect((await(await request('operations')).json()).events).toEqual([]);
});
it('does not replace local state on a wrong segment, provider error or missing configuration',async()=>{
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'broadcast-1',status:'sent',segment_id:'other-project'}),{status:200}));const r=await request('operations/reconcile',{campaignId:'one'},'POST');expect((await r.json()).data[0].status).toBe('failed');expect(db.prepare("SELECT provider_status FROM newsletter_campaigns WHERE id='one'").get()!.provider_status).toBe('queued');
 vi.mocked(fetch).mockRejectedValueOnce(new Error('Provider unavailable'));expect((await(await request('operations/reconcile',{campaignId:'one'},'POST')).json()).data[0].status).toBe('failed');env.RESEND_API_KEY=undefined;expect((await request('operations/reconcile',{},'POST')).status).toBe(503);
});
