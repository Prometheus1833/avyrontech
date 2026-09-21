/** Export analysis never requests credentials or executes an unfollow. */
export function socialHandles(raw:string):string[]{
 if(raw.length>2_000_000)throw new Error('Export prea mare (maximum 2 MB).');
 const found:string[]=[];
 const add=(value:unknown)=>{if(typeof value!=='string')return;const handle=value.trim().replace(/^@/,'').toLowerCase();if(/^[a-z0-9._]{1,30}$/.test(handle))found.push(handle);};
 if(raw.trim().startsWith('{')||raw.trim().startsWith('[')){
  const walk=(value:unknown,depth=0)=>{if(depth>8)return;if(Array.isArray(value)){for(const item of value)walk(item,depth+1);}else if(value&&typeof value==='object'){const row=value as Record<string,unknown>;if(Array.isArray(row.string_list_data))for(const item of row.string_list_data)add((item as {value?:unknown}).value);else for(const v of Object.values(row))walk(v,depth+1);}};
  walk(JSON.parse(raw));
 }else for(const line of raw.split(/[\r\n,;]+/))add(line);
 const unique=[...new Set(found)];if(unique.length>30000)throw new Error('Maximum 30.000 conturi per listă.');return unique;
}
export function unfollowCandidates(followers:string[],following:string[],protectedHandles:string[]=[]){const keep=new Set([...followers,...protectedHandles]);return [...new Set(following)].filter(h=>!keep.has(h)).sort().slice(0,50);}
export function campaignMetrics(row:{cost_minor:number;revenue_minor:number;clicks:number;leads:number;conversions:number;budget_minor:number}){return {remaining_minor:row.budget_minor-row.cost_minor,cpc_minor:row.clicks?row.cost_minor/row.clicks:null,cpl_minor:row.leads?row.cost_minor/row.leads:null,cpa_minor:row.conversions?row.cost_minor/row.conversions:null,roas:row.cost_minor?row.revenue_minor/row.cost_minor:null};}
