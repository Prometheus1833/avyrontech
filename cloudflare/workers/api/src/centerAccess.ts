import type { Context } from 'hono';
import type { AppBindings } from './types';
import { platformRoleForUser } from './authorization';
import { centerIds, defaultReads, ownerOnly, type CenterId, type Department, type StaffPolicy } from '../../../../src/shared/osCatalog';
export async function staffPolicy(db:D1Database,userId:string):Promise<StaffPolicy> {
 const row=await db.prepare('SELECT department,job_title,read_json,write_json,revision FROM staff_dashboard_access WHERE user_id=?').bind(userId).first<{department:Department;job_title:string;read_json:string;write_json:string;revision:number}>();
 if(row)return {department:row.department,job_title:row.job_title,read:JSON.parse(row.read_json),write:JSON.parse(row.write_json),revision:row.revision};
 return {department:'general',job_title:'',read:defaultReads('general'),write:[],revision:0};
}
export async function centerAllowed(c:Context<AppBindings>,center:string,write=false) {
 if(!centerIds.includes(center as CenterId))return false;
 if(await platformRoleForUser(c.env.DB,c.get('userId')))return true;
 if(!c.get('roles')?.some(r=>r==='staff'||r==='admin')||ownerOnly.includes(center as CenterId))return false;
 const policy=await staffPolicy(c.env.DB,c.get('userId'));
 return (write?policy.write:policy.read).includes(center as CenterId);
}
