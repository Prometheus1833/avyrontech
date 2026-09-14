import { Hono } from 'hono';
import { z } from 'zod';
import type { AppBindings } from './types';
import { hasCapability, platformRoleForUser } from './authorization';
import { sha256 } from './security';
export const receiptsRouter=new Hono<AppBindings>();
const schema=z.object({revenue_id:z.string().min(1).max(100),amount_minor:z.number().int().positive().max(9000000000000),amount_ron_minor:z.number().int().positive().max(9000000000000).nullable(),reference:z.string().trim().min(1).max(200),paid_at:z.number().int().positive()}).strict();
receiptsRouter.get('/api/finance/receipts',async c=>{
 const principal=await platformRoleForUser(c.env.DB,c.get('userId'));
 if (!principal && !await hasCapability(c.env.DB,c.get('userId'),'finance.read')) return c.json({error:{code:'forbidden'}},403);
 const offset=Number(c.req.query('offset')||0);
 if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)return c.json({error:{code:'invalid_pagination'}},400);
 const {results}=await c.env.DB.prepare(`SELECT receipt.id,receipt.revenue_id,receipt.amount_minor,receipt.amount_ron_minor,receipt.currency,receipt.reference,receipt.paid_at,revenue.service_name,revenue.invoice_number
   FROM financial_receipts receipt JOIN financial_revenues revenue ON revenue.id=receipt.revenue_id ORDER BY receipt.paid_at DESC,receipt.id LIMIT 50 OFFSET ?`).bind(offset).all();
 const totals=await c.env.DB.prepare('SELECT currency,SUM(amount_minor) amount_minor,COUNT(*) count FROM financial_receipts GROUP BY currency').all();
 return c.json({data:results,totals:totals.results,canWrite:principal==='platform_owner'||await hasCapability(c.env.DB,c.get('userId'),'finance.write')});
});
receiptsRouter.post('/api/finance/receipts',async c=>{
 if (await platformRoleForUser(c.env.DB,c.get('userId'))!=='platform_owner' && !await hasCapability(c.env.DB,c.get('userId'),'finance.write')) return c.json({error:{code:'forbidden'}},403);
 const parsed=schema.safeParse(await c.req.json().catch(()=>null));
 if(!parsed.success || parsed.data.paid_at>Date.now())return c.json({error:{code:'invalid_receipt'}},400);
 const b=parsed.data,key=c.req.header('idempotency-key')||'';
 if(!/^[A-Za-z0-9_.:-]{16,128}$/.test(key))return c.json({error:{code:'idempotency_key_required'}},400);
 const scope=`finance.receipt:${c.get('userId')}`,hash=await sha256(JSON.stringify(b));
 const prior=()=>c.env.DB.prepare('SELECT request_hash,response_json FROM idempotency_keys WHERE scope=? AND idempotency_key=?').bind(scope,key).first<{request_hash:string;response_json:string}>();
 const replay=(old:{request_hash:string;response_json:string})=>old.request_hash===hash?c.json(JSON.parse(old.response_json)):c.json({error:{code:'idempotency_key_reused'}},409);
 const old=await prior();if(old)return replay(old);
 const revenue=await c.env.DB.prepare('SELECT currency FROM financial_revenues WHERE id=? AND archived_at IS NULL').bind(b.revenue_id).first<{currency:string}>();
 if(!revenue)return c.json({error:{code:'revenue_not_found'}},404);
 if(!['RON','EUR','USD','GBP','CHF'].includes(revenue.currency))return c.json({error:{code:'unsupported_receipt_currency'}},400);
 const id=crypto.randomUUID(),t=Date.now(),result={id};
 try{
  await c.env.DB.batch([
   c.env.DB.prepare(`INSERT INTO idempotency_keys(scope,idempotency_key,request_hash,response_status,response_json,created_at,expires_at) VALUES (?,?,?,200,?,?,?)`).bind(scope,key,hash,JSON.stringify(result),t,t+86400000),
   c.env.DB.prepare('INSERT INTO financial_receipts(id,revenue_id,amount_minor,amount_ron_minor,currency,reference,paid_at,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,b.revenue_id,b.amount_minor,revenue.currency==='RON'?b.amount_minor:b.amount_ron_minor,revenue.currency,b.reference,b.paid_at,c.get('userId'),t),
   c.env.DB.prepare(`INSERT INTO financial_audit_events(id,actor_user_id,action,resource_type,resource_id,after_json,source,created_at) VALUES (?,?,'receipt.recorded','receipt',?,?,'manual',?)`).bind(crypto.randomUUID(),c.get('userId'),id,JSON.stringify(b),t),
  ]);
 }catch(error){
  const concurrent=await prior();if(concurrent)return replay(concurrent);
  if(/receipt_revenue_not_payable|receipt_exceeds_balance|UNIQUE constraint failed: financial_receipts/.test(String(error)))return c.json({error:{code:'receipt_conflict',message:'Documentul este deja încasat, suma depășește soldul sau referința există deja.'}},409);
  throw error;
 }
 return c.json(result);
});
