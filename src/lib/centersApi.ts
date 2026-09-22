import { cfAuth } from './cfAuth';
export const centersApi={
 get:<T,>(path:string)=>cfAuth.request<T>(`/api/centers/${path}`),
 write:<T={ok:true},>(path:string,body:unknown={},method='POST')=>cfAuth.request<T>(`/api/centers/${path}`,{method,headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(body)}),
};
