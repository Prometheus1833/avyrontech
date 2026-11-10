/** Native Request/fetch contract, synthetic providers only: no credentials, charges or network. */
import {mkdtempSync,writeFileSync,openSync,closeSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
const root=process.cwd(),work=mkdtempSync(join(tmpdir(),'avyron-provider-http-'));
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));
const src=resolve(root,'cloudflare/workers/api/src');
writeFileSync(join(work,'worker.ts'),`
import {verifyFinancialConnection} from ${JSON.stringify(src+'/financialConnectionVerification.ts')};
import {issueOblioInvoice} from ${JSON.stringify(src+'/invoicingOblio.ts')};
import {clientPortalConfiguration} from ${JSON.stringify(src+'/billingPortal.ts')};
import {boundedProviderJson} from ${JSON.stringify(src+'/integrationAdapters.ts')};
const env={OBLIO_CLIENT_ID:'synthetic',OBLIO_CLIENT_SECRET:'synthetic-secret',OBLIO_CIF:'123456',OBLIO_SERIES:'AVY',OBLIO_VAT_NAME:'Neplatitor TVA',OBLIO_VAT_PERCENTAGE:'0',OBLIO_AUTO_ISSUE_ENABLED:'true',STRIPE_SECRET_KEY:'sk_test_synthetic'};
const input={orderId:'synthetic-order',buyer:{name:'Synthetic Buyer'},lines:[{name:'Synthetic Service',quantity:1,unitPriceMinor:1000}],currency:'RON',issuedAt:0,payment:{reference:'pi_synthetic',amountMinor:1000,capturedAt:0}};
export default {async fetch(incoming){
 const scenario=new URL(incoming.url).pathname.slice(1),calls=[];const original=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{
  // Actual workerd Request construction rejects unsupported redirect modes.
  const request=new Request(url,init),target=new URL(request.url);calls.push({host:target.hostname,path:target.pathname,method:request.method});
  if(!['www.oblio.eu','api.stripe.com','api.github.com'].includes(target.hostname))throw Error('Unexpected provider destination');
  if(scenario==='redirect'||scenario==='integration-redirect')return new Response(null,{status:302,headers:{location:'https://must-not-receive-credentials.invalid/'}});
  if(target.pathname==='/api/authorize/token')return Response.json({access_token:'synthetic-token'});
  if(target.pathname==='/api/nomenclature/series')return Response.json({data:[{type:'Factura',name:'AVY',start:'0001',next:'0001'}]});
  if(target.pathname==='/api/docs/invoice'){const payload=await request.json();if(payload.seriesName!=='AVY'||payload.sendEmail!==false||payload.products[0].vatName!=='Neplatitor TVA'||payload.products[0].vatPercentage!==0||payload.collect?.type!=='Card'||payload.collect?.documentNumber!=='pi_synthetic'||payload.collect?.value!==10)throw Error('Fiscal payload mismatch');return Response.json({data:{seriesName:'AVY',number:'0001'}});}
  if(target.pathname==='/v1/billing_portal/configurations')return Response.json({data:[{id:'bpc_synthetic',active:true,metadata:{avyron_profile:'avyron-client-billing-v1'}}],has_more:false});
  throw Error('Unexpected provider request');
 };
 try {
  let result;
  if(scenario==='verify'||scenario==='redirect')result=await verifyFinancialConnection(env,'oblio');
  else if(scenario==='invoice')result=await issueOblioInvoice(env,input);
  else if(scenario==='nonvat')result=await issueOblioInvoice(env,{...input,lines:[{...input.lines[0],vatBasisPoints:2100}]});
  else if(scenario==='portal')result=await clientPortalConfiguration(env,'https://avyron.ro/profil');
  else if(scenario==='integration-redirect'){try{await boundedProviderJson('https://api.github.com/user','synthetic-token','github');result='unexpected_success';}catch(error){result=error.code;}}
  else throw Error('Unknown scenario');
  return Response.json({result,calls});
 } finally {globalThis.fetch=original;}
}};
`);
writeFileSync(join(work,'wrangler.json'),JSON.stringify({name:'avyron-provider-http-local',main:join(work,'worker.ts'),compatibility_date:'2026-10-09',compatibility_flags:['nodejs_compat'],observability:{enabled:false}}));
const log=openSync(join(work,'runtime.log'),'w',0o600);
const child=spawn(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--local','--config',join(work,'wrangler.json'),'--port',String(port)],{cwd:root,stdio:['ignore',log,log],env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});
let failure;
try{
 const base='http://127.0.0.1:'+port;let first;
 for(let n=0;n<100;n++){try{first=await fetch(base+'/verify',{signal:AbortSignal.timeout(1000)});break;}catch{if(child.exitCode!==null)throw Error('Native runtime did not start');await new Promise(r=>setTimeout(r,150));}}
 if(!first)throw Error('Native runtime readiness timed out');
 const verified=await first.json();assert.equal(verified.result.ok,true);assert.equal(verified.calls.length,2);
 const run=async path=>{const r=await fetch(base+'/'+path,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);return r.json();};
 const redirected=await run('redirect');assert.equal(redirected.result.ok,false);assert.equal(redirected.result.code,'oblio_auth_302_invalid_response');assert.equal(redirected.calls.length,1);
 const invoice=await run('invoice');assert.equal(invoice.result.issued,true);assert.equal(invoice.result.series,'AVY');assert.equal(invoice.calls.length,2);
 const blocked=await run('nonvat');assert.equal(blocked.result.reason,'invalid_vat');assert.equal(blocked.calls.length,0);
 const portal=await run('portal');assert.equal(portal.result,'bpc_synthetic');assert.equal(portal.calls.length,1);
 const adapter=await run('integration-redirect');assert.equal(adapter.result,'provider_unavailable');assert.equal(adapter.calls.length,1);
 console.log('Native provider HTTP: 6 PASS (Oblio, non-VAT invoice, Stripe portal, redirect isolation). No external provider traffic.');
}catch(error){failure=error;console.error(readFileSync(join(work,'runtime.log'),'utf8').slice(-5000));}
finally{child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);if(child.exitCode===null)child.kill('SIGKILL');closeSync(log);rmSync(work,{recursive:true,force:true});}
if(failure)throw failure;
