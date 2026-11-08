import type { Env, Role } from './types';
import { managedStaff,managedPermission } from './staffAccessPolicy';
import { platformRoleForUser,clientProjectGrantSql } from './authorization';
export async function overviewScope(env:Env,userId:string,roles:Role[]){
 const staff=roles.includes('staff')||roles.includes('admin');
 const superAdmin=!!await platformRoleForUser(env.DB,userId),ranked=await managedStaff(env.DB,userId);
 const permitted=(key:string)=>!ranked||superAdmin||managedPermission(ranked,key);
 const projectScope=!permitted('projects.read')&&!permitted('maintenance.read')?{sql:'0=1',values:[] as string[]}:superAdmin||(ranked&&managedPermission(ranked,'projects.all'))?{sql:'1=1',values:[] as string[]}:{
 sql:`(project.owner_user_id=? OR EXISTS(SELECT 1 FROM organization_memberships membership WHERE membership.organization_id=project.organization_id AND membership.user_id=? AND membership.status='active') OR ${staff?'(project.organization_id IS NULL AND EXISTS(SELECT 1 FROM client_account_access granted WHERE granted.client_id=project.client_id AND granted.user_id=?)) OR EXISTS(SELECT 1 FROM project_staff assigned WHERE assigned.project_id=project.id AND assigned.user_id=?)':clientProjectGrantSql('project')})`,values:staff?[userId,userId,userId,userId]:[userId,userId,userId]};
 return{staff,superAdmin,permitted,projectScope};
}
