import type {Env} from './types';
import {retentionCandidates,type BackupRun,type BackupSettings} from './backups';
const prefix='os-backups/';
export async function storageUsed(env:Env){let cursor:string|undefined,total=0;for(let page=0;page<1000;page++){const list=await env.FILES.list({prefix,limit:1000,...(cursor?{cursor}:{})});total+=list.objects.reduce((sum,o)=>sum+o.size,0);if(!list.truncated)return total;cursor=list.cursor;}throw new Error('storage_inventory_limit');}
export async function purgeBackups(env:Env,settings:BackupSettings){
 // GC only removes whole expired runs and blobs with no remaining references.
 const runs=(await env.DB.prepare("SELECT * FROM backup_runs WHERE status IN ('complete','failed','deleting') ORDER BY created_at DESC").all<BackupRun>()).results;
 for(const run of retentionCandidates(runs,settings)){
  const token=crypto.randomUUID();
  const claim=await env.DB.prepare("UPDATE backup_runs SET status='deleting',cleanup_token=?,cleanup_locked_until=? WHERE id=? AND protected=0 AND (cleanup_locked_until IS NULL OR cleanup_locked_until<?) AND NOT EXISTS(SELECT 1 FROM backup_runs WHERE status IN ('queued','running'))").bind(token,Date.now()+3600000,run.id,Date.now()).run();if(!claim.meta.changes)continue;
  await env.DB.prepare('DELETE FROM backup_objects WHERE run_id=? AND EXISTS(SELECT 1 FROM backup_runs WHERE id=? AND protected=0)').bind(run.id,run.id).run();
  for(const suffix of ['data.sql','manifest.json','credentials.json'])await env.FILES.delete(`${prefix}${run.id}/${suffix}`);
  // The unique active index includes deleting: no new snapshot can start during GC.
  let cursor:string|undefined;
  do {const owns=await env.DB.prepare("UPDATE backup_runs SET cleanup_locked_until=? WHERE id=? AND cleanup_token=? AND status='deleting'").bind(Date.now()+3600000,run.id,token).run();if(!owns.meta.changes)throw new Error('cleanup_lease_lost');const page=await env.FILES.list({prefix:`${prefix}blobs/`,limit:100,...(cursor?{cursor}:{})});
   for(const blob of page.objects){if(!await env.DB.prepare('SELECT 1 FROM backup_objects WHERE blob_key=? LIMIT 1').bind(blob.key).first()){await env.FILES.delete(blob.key);await env.DB.prepare('DELETE FROM backup_blobs WHERE key=?').bind(blob.key).run();}}
   cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
  await env.DB.prepare("UPDATE backup_runs SET status='deleted',cleanup_token=NULL,cleanup_locked_until=NULL WHERE id=? AND protected=0 AND cleanup_token=?").bind(run.id,token).run();
 }
}
/** R2 multipart avoids buffering a dump or requiring a Content-Length on streaming exports. */
export async function storeSqlExport(bucket:R2Bucket,key:string,body:ReadableStream<Uint8Array>,maxBytes:number){
 const upload=await bucket.createMultipartUpload(key,{httpMetadata:{contentType:'application/sql'}}),reader=body.getReader(),parts:R2UploadedPart[]=[];
 const partSize=16*1024*1024;let buffer=new Uint8Array(partSize),filled=0,total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes)throw new Error('backup_capacity_exceeded');let offset=0;
  while(offset<value.byteLength){const length=Math.min(partSize-filled,value.byteLength-offset);buffer.set(value.subarray(offset,offset+length),filled);filled+=length;offset+=length;if(filled===partSize){parts.push(await upload.uploadPart(parts.length+1,buffer));buffer=new Uint8Array(partSize);filled=0;}}
 }
 if(filled)parts.push(await upload.uploadPart(parts.length+1,buffer.subarray(0,filled)));if(!parts.length)throw new Error('empty_sql_export');return await upload.complete(parts);
 }catch(error){await reader.cancel().catch(()=>{});await upload.abort();throw error;}finally{reader.releaseLock();}
}
