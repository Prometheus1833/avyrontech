import { useCallback,useEffect,useRef,useState } from 'react';
import { toast } from 'sonner';
import { centersApi } from '@/lib/centersApi';
export const inputClass='w-full min-w-0 rounded-xl border border-white/15 bg-[#10172a] p-2.5 text-sm text-slate-100';
export const panelClass='rounded-2xl border border-white/10 bg-[#10162a] p-4 sm:p-5';
export function useCenterData<T>(path:string){
 const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);const seq=useRef(0);
 const reload=useCallback(async()=>{const n=++seq.current;setLoading(true);setError('');try{const result=await centersApi.get<T>(path);if(n===seq.current)setData(result);}catch(e){if(n===seq.current)setError(e instanceof Error?e.message:'Date indisponibile.');}finally{if(n===seq.current)setLoading(false);}},[path]);
 const cancel=useCallback(()=>{seq.current++;},[]);
 useEffect(()=>{setData(null);void reload();const resume=()=>void reload();window.addEventListener('avyron:resume',resume);return()=>{cancel();window.removeEventListener('avyron:resume',resume);};},[reload,cancel]);return {data,error,loading,reload};
}
export function useCenterAction(){const [busy,setBusy]=useState(false);const lock=useRef(false);return {busy,act:async(fn:()=>Promise<unknown>)=>{if(lock.current)return;lock.current=true;setBusy(true);try{await fn();}catch(e){toast.error(e instanceof Error?e.message:'Acțiunea a eșuat.');}finally{lock.current=false;setBusy(false);}}};}
