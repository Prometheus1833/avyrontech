import {WorkflowEntrypoint,type WorkflowEvent,type WorkflowStep} from 'cloudflare:workers';
import type {Env} from './types';
import {accountSecret,providerJson,type Account} from './accountVault';
import {type BackupRun,type BackupSettings} from './backups';
import {sha256} from './security';
import {storageUsed,purgeBackups,storeSqlExport} from './backupStorage';
const prefix='os-backups/';
export class AvyronBackupWorkflow extends WorkflowEntrypoint<Env,{runId:string}>{
 async run(event:WorkflowEvent<{runId:string}>,step:WorkflowStep){
  const env=this.env,id=event.payload.runId;
  try{
   const setup=await step.do('snapshot-configuration',async()=>{
    const run=await env.DB.prepare("SELECT * FROM backup_runs WHERE id=? AND status IN ('queued','running')").bind(id).first<BackupRun>();if(!run)throw new Error('run_unavailable');const settings=JSON.parse(run.config_json) as BackupSettings;
    const account=await env.DB.prepare("SELECT * FROM os_accounts WHERE id=? AND provider='cloudflare' AND status='verified'").bind(settings.account_id).first<Account>();if(!account)throw new Error('account_unavailable');
    const tableList=(await env.DB.prepare('PRAGMA table_list').all<{name:string;type:string}>()).results;
    const shadows=new Set(tableList.filter(t=>t.type==='shadow').map(t=>t.name));
    const tables=tableList.filter(t=>t.type==='table'&&!t.name.startsWith('sqlite_')&&!t.name.startsWith('_cf_')&&!['sessions','mfa_challenges','os_device_sessions','os_device_tasks','idempotency_keys'].includes(t.name)).map(t=>t.name);
    const schema=(await env.DB.prepare("SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all<{type:string;name:string;sql:string}>()).results.filter(r=>!shadows.has(r.name));
    const refs=(await env.DB.prepare('SELECT secret_reference ref FROM os_accounts WHERE secret_reference IS NOT NULL UNION SELECT secret_reference FROM integration_accounts WHERE secret_reference IS NOT NULL UNION SELECT secret_reference FROM os_center_records WHERE secret_reference IS NOT NULL').all<{ref:string}>()).results;
    const encrypted:Record<string,string>={};for(const {ref} of refs){const value=await env.KV.get(ref);if(!value)throw new Error('credential_snapshot_missing');encrypted[ref]=value;}
    await env.DB.prepare("UPDATE backup_runs SET status='running' WHERE id=?").bind(id).run();
    if((await storageUsed(env))+new TextEncoder().encode(JSON.stringify(encrypted)).length+1_000_000>settings.max_bytes)throw new Error('backup_capacity_exceeded');
    await env.FILES.put(`${prefix}${id}/credentials.json`,JSON.stringify(encrypted),{httpMetadata:{contentType:'application/json'}});
    // Tokens are fetched inside each step, never returned into Workflow persisted state.
    return {settings,accountId:account.id,externalId:account.external_id,tables,schema,credentialRefs:refs.map(r=>r.ref).sort(),startedAt:Date.now()};
   });
   const exportUrl=`https://api.cloudflare.com/client/v4/accounts/${setup.externalId}/d1/database/${env.BACKUP_DATABASE_ID}/export`;
   const callExport=async(bookmark?:string)=>{
    const account=await env.DB.prepare('SELECT * FROM os_accounts WHERE id=?').bind(setup.accountId).first<Account>();if(!account)throw new Error('account_unavailable');
    return providerJson(exportUrl,await accountSecret(env,account),'POST',{output_format:'polling',...(bookmark?{current_bookmark:bookmark}:{}),dump_options:{tables:setup.tables,no_schema:true}});
   };
   // Continuous polling in one step avoids leaving D1 paused between long cron intervals.
   await step.do('export-database',{retries:{limit:2,delay:'10 seconds',backoff:'exponential'},timeout:'15 minutes'},async()=>{
    const existing=await env.FILES.head(`${prefix}${id}/data.sql`);if(existing)return;
    const account=await env.DB.prepare('SELECT * FROM os_accounts WHERE id=?').bind(setup.accountId).first<Account>();if(!account)throw new Error('account_unavailable');const token=await accountSecret(env,account);
    let response=await callExport();let url='';
    for(let attempt=0;attempt<300;attempt++){
     const result=response.result as {status?:string;at_bookmark?:string;result?:{signed_url?:string};signed_url?:string;error?:string};if(result?.status==='error'||result?.error)throw new Error('export_failed');url=result?.result?.signed_url||result?.signed_url||'';if(url)break;
     if(!result?.at_bookmark)throw new Error('export_bookmark_missing');await new Promise(resolve=>setTimeout(resolve,2000));
     response=await providerJson(exportUrl,token,'POST',{output_format:'polling',current_bookmark:result.at_bookmark});
    }
    if(!url)throw new Error('export_timeout');const target=new URL(url);if(target.protocol!=='https:'||target.username||target.password||target.port||!/(^|\.)cloudflarestorage\.com$/.test(target.hostname))throw new Error('export_download_host_denied');
    const download=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(120000)});if(!download.ok||!download.body)throw new Error('export_download_failed');
    await storeSqlExport(env.FILES,`${prefix}${id}/data.sql`,download.body,setup.settings.max_bytes-(await storageUsed(env))-1_000_000);
   });
   for(const name of ['FILES','MEDIA'] as const){if(!(name==='FILES'?setup.settings.include_files:setup.settings.include_media))continue;let cursor:string|undefined;
    for(let page=0;page<1000;page++){
     const result=await step.do(`copy-${name}-${page}`,{timeout:'10 minutes'},async()=>{
      const list=await env[name].list({limit:5,...(cursor?{cursor}:{})});
      for(const object of list.objects){if(name==='FILES'&&object.key.startsWith(prefix))continue;
       const blobKey=`${prefix}blobs/${await sha256(`${name}\n${object.key}\n${object.etag}\n${object.version}`)}`;
       const existing=await env.FILES.head(blobKey);
       if(existing&&existing.size!==object.size)throw new Error('backup_blob_mismatch');
       if(!existing){if((await storageUsed(env))+object.size+1_000_000>setup.settings.max_bytes)throw new Error('backup_capacity_exceeded');const source=await env[name].get(object.key,{onlyIf:{etagMatches:object.etag}});if(!source||!('body' in source)||source.version!==object.version)throw new Error('source_changed_during_backup');await env.FILES.put(blobKey,source.body,{httpMetadata:source.httpMetadata,customMetadata:source.customMetadata});}
       await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO backup_blobs(key,size_bytes,etag,created_at) VALUES (?,?,?,?)').bind(blobKey,object.size,object.etag,Date.now()),env.DB.prepare('INSERT OR IGNORE INTO backup_objects(run_id,source_bucket,source_key,blob_key,source_etag,size_bytes) VALUES (?,?,?,?,?,?)').bind(id,name,object.key,blobKey,object.etag,object.size)]);
      }
      return {cursor:list.truncated?list.cursor:null,count:list.objects.filter(o=>!(name==='FILES'&&o.key.startsWith(prefix))).length};
     });if(!result.cursor)break;cursor=result.cursor;if(page===999)throw new Error('backup_inventory_limit');
    }
   }
   await step.do('manifest-and-protect',async()=>{
    const currentRefs=(await env.DB.prepare('SELECT secret_reference ref FROM os_accounts WHERE secret_reference IS NOT NULL UNION SELECT secret_reference FROM integration_accounts WHERE secret_reference IS NOT NULL UNION SELECT secret_reference FROM os_center_records WHERE secret_reference IS NOT NULL').all<{ref:string}>()).results.map(r=>r.ref).sort();if(JSON.stringify(currentRefs)!==JSON.stringify(setup.credentialRefs))throw new Error('credentials_changed_during_backup');
    const sql=await env.FILES.head(`${prefix}${id}/data.sql`);if(!sql)throw new Error('sql_missing');
    const inventory=(await env.DB.prepare('SELECT source_bucket,source_key,blob_key,source_etag,size_bytes FROM backup_objects WHERE run_id=?').bind(id).all()).results;
    const manifest={version:1,runId:id,databaseId:env.BACKUP_DATABASE_ID,startedAt:setup.startedAt,completedAt:Date.now(),sql:{key:sql.key,size:sql.size,etag:sql.etag},schema:setup.schema,credentialsKey:`${prefix}${id}/credentials.json`,objects:inventory,coverage:{d1:'data plus schema in this manifest',files:!!setup.settings.include_files,media:!!setup.settings.include_media,credentials:'encrypted referenced KV values only',excluded:['Worker secret keys','active sessions','Durable Object state','DNS and provider account configuration','Git source'],consistency:'D1 point-in-time; R2 objects copied over an interval. Restore to isolated resources and validate before cutover.'}};
    const json=JSON.stringify(manifest);if(new TextEncoder().encode(json).length>8_000_000||(await storageUsed(env))+new TextEncoder().encode(json).length>setup.settings.max_bytes)throw new Error('manifest_too_large');await env.FILES.put(`${prefix}${id}/manifest.json`,json,{httpMetadata:{contentType:'application/json'}});
    await env.DB.prepare("UPDATE backup_runs SET status='complete',protected=requested_baseline,sql_key=?,manifest_key=?,bytes=?,objects_count=?,completed_at=? WHERE id=?").bind(sql.key,`${prefix}${id}/manifest.json`,sql.size+inventory.reduce((sum,r)=>sum+Number(r.size_bytes),0),inventory.length,Date.now(),id).run();
   });
   await step.do('retention',()=>purgeBackups(env,setup.settings));
  }catch(error){
   const reason=error instanceof Error&&/^(backup_blob_mismatch|backup_capacity_exceeded|account_unavailable|credential_snapshot_missing|credentials_changed_during_backup|export_failed|export_timeout|export_bookmark_missing|export_download_host_denied|export_download_failed|source_changed_during_backup|backup_inventory_limit|manifest_too_large|sql_missing)$/.test(error.message)?error.message:'backup_failed_check_workflow';
   await step.do('record-failure',async()=>{await env.DB.prepare("UPDATE backup_runs SET status='failed',error_code=?,completed_at=? WHERE id=? AND status IN ('queued','running')").bind(reason,Date.now(),id).run();});throw new Error(reason);
  }
 }
}
