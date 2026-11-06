/** Real provider acceptance. Synthetic content only. Never prints credentials or file bytes.
 * Run against an isolated, authenticated local Worker; no production deploy is performed.
 * node scripts/test-bouncer-live.mjs --base http://127.0.0.1:8788 --token-file /private/path/token
 */
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const args=process.argv.slice(2),arg=name=>args[args.indexOf(name)+1];
const base=arg('--base'),file=arg('--token-file');
if(!args.includes('--base')||!args.includes('--token-file'))throw new Error('Specify --base and --token-file. Do not pass tokens on the command line.');
const target=new URL(base);if(!['localhost','127.0.0.1'].includes(target.hostname)||target.protocol!=='http:')throw new Error('Live scanner acceptance must use an isolated local Worker, never a production account.');
const token=(await readFile(file,'utf8')).trim();if(!token||token.length>8192)throw new Error('Invalid local fixture token file');
async function request(path,body){const r=await fetch(target.origin+'/api/antivirus'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json','idempotency-key':crypto.randomUUID()}:{})},...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json();}catch{throw new Error('Invalid local API response');}if(!r.ok)throw new Error('Antivirus API rejected operation: '+r.status+' '+String(data.error?.code||'unavailable'));return data;}
const before=await request('');assert.equal(before.configured,true,'Bouncer secret missing');assert.equal(before.enabled,true,'Scanner disabled');assert.equal(before.storageVerified,true,'Local private storage gate missing');assert.equal(before.sensitiveApproved,false,'Do not approve confidential processing for synthetic acceptance');
await request('/usage/sync',{confirmed:true});const usage=(await request('')).quota;assert.ok(usage);assert.ok(500-Math.max(usage.reserved,usage.provider_used)>=3,'At least three Free slots are required');
const results=[];
for(const sample of ['clean','eicar','large_clean']){
 const start=Date.now();let r=await request('/test',{confirmed:true,sample});assert.ok(r.scanId,'No scan record');
 while(['pending','submitting','unknown','quarantined'].includes(r.status)&&Date.now()-start<120000){await new Promise(resolve=>setTimeout(resolve,2200));r=await request('/jobs/'+r.scanId+'/poll',{confirmed:true});}
 const ok=sample==='eicar'?['malicious','suspicious'].includes(r.status):r.status==='clean';results.push({sample,scanId:r.scanId,status:r.status,elapsedMs:Date.now()-start,passed:ok});
 console.log(JSON.stringify(results.at(-1)));if(!ok)throw new Error('Real Bouncer acceptance failed for '+sample+'; leave PR #69 draft.');
 // These are only synthetic test copies created by this acceptance run.
 await request('/jobs/'+r.scanId+'/purge',{confirmed:true});
}
const after=await request('');assert.ok(Math.max(after.quota.reserved,after.quota.provider_used)<=500);console.log(JSON.stringify({provider:'bouncer',syntheticOnly:true,passed:true,results,quotaReserved:after.quota.reserved}));
