import { cfAuth } from './cfAuth';
export const workspaceApi = {
  list: <T,>(path: string) => cfAuth.request<{data:T[]}>(`/api/workspace/${path}`),
  write: <T = {ok:true},>(path: string, body: unknown, method = 'POST', key = crypto.randomUUID()) =>
    cfAuth.request<T>(`/api/workspace/${path}`,{method,headers:{'Idempotency-Key':key},...(body===undefined?{}:{body:JSON.stringify(body)})}),
};
export type WorkItem = {id:string;project_id:string;kind:'task'|'deliverable'|'onboarding'|'offboarding'|'maintenance';title:string;description:string|null;status:'open'|'in_progress'|'blocked'|'done'|'cancelled';assignee_id:string|null;due_at:number|null;completed_at:number|null;revision:number};
