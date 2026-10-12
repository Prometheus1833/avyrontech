import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceApi } from '@/lib/workspaceApi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
type Member={id:string;display_name:string;staff_role:string|null};
type Message={id:string;author_id:string;content:string;created_at:string};
const channels={general:'General',dev:'Dezvoltare',design:'Design',marketing:'Marketing',random:'Pauză'};
export function StaffChatTab(){
 const {user}=useAuth();
 const [params,setParams]=useSearchParams();
 const requestVersion=useRef(0);
 const [members,setMembers]=useState<Member[]>([]),[messages,setMessages]=useState<Message[]>([]),[target,setTarget]=useState(()=>params.get('dm')?`dm:${params.get('dm')}`:'channel:general'),[content,setContent]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const [older,setOlder]=useState(false),[offset,setOffset]=useState(0);
 const channel=target.startsWith('channel:')?target.slice(8):'general',recipient=target.startsWith('dm:')?target.slice(3):null;
 useEffect(()=>{void workspaceApi.list<Member>('staff').then(r=>setMembers(r.data)).catch(e=>setError(e.message));},[]);
 useEffect(()=>{const dm=params.get('dm');if(dm)setTarget(`dm:${dm}`);},[params]);
 const invalidate=useCallback(()=>{requestVersion.current++;},[]);
 const load=useCallback(async()=>{
  const version=++requestVersion.current;
  try{const query=new URLSearchParams({channel,limit:'50',offset:String(offset)});if(recipient)query.set('recipient_id',recipient);
   const r=await workspaceApi.list<Message>(`chat?${query}`);if(version!==requestVersion.current)return;setMessages(r.data);setOlder(r.data.length===50);setError('');
  }catch(e){if(version!==requestVersion.current)return;setError(e instanceof Error?e.message:'Chatul nu poate fi încărcat.');}
 },[channel,recipient,offset]);
 useEffect(()=>{let active=true;void load();const timer=setInterval(()=>{if(active&&document.visibilityState==='visible')void load();},15000);return()=>{active=false;invalidate();clearInterval(timer);};},[load,invalidate]);
 async function send(e:React.FormEvent){e.preventDefault();if(!content.trim()||sending)return;setSending(true);try{await workspaceApi.write('chat',{content:content.trim(),channel,recipient_id:recipient});setContent('');if(offset) setOffset(0);else await load();}catch(e){toast.error(e instanceof Error?e.message:'Mesajul nu poate fi trimis.');}finally{setSending(false);}}
 const changeTarget=(value:string)=>{setTarget(value);setOffset(0);setMessages([]);const next=new URLSearchParams(params);if(value.startsWith('dm:'))next.set('dm',value.slice(3));else next.delete('dm');setParams(next,{replace:true});};
 return <section className="space-y-4"><header className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-cyan-400/5 p-5"><h2 className="text-2xl font-semibold text-white">Chat intern</h2><p className="mt-1 text-sm text-slate-400">Canale și mesaje directe ale echipei, inclusiv conturile agenților cu acces staff. Actualizare la 15 secunde.</p></header><label className="block text-sm text-slate-300">Conversație<select aria-label="Conversație" value={target} onChange={e=>changeTarget(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#10162a] p-3 text-slate-100"><optgroup label="Canale">{Object.entries(channels).map(([id,name])=><option key={id} value={`channel:${id}`}>{name}</option>)}</optgroup><optgroup label="Mesaj direct">{members.filter(m=>m.id!==user?.id).map(m=><option key={m.id} value={`dm:${m.id}`}>{m.display_name}</option>)}</optgroup></select></label>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!older} onClick={()=>setOffset(v=>v+50)}>Mai vechi</Button><Button size="sm" variant="outline" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Mai recente</Button></div>
 <div aria-live="polite" className="min-h-48 max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#10162a]/90 p-3 sm:p-4">{messages.map(m=><article key={m.id} className={`rounded-lg p-3 ${m.author_id===user?.id?'ml-4 bg-violet-500/15 sm:ml-8':'mr-4 bg-white/[0.04] sm:mr-8'}`}><p className="text-xs text-slate-400">{members.find(u=>u.id===m.author_id)?.display_name||'Membru'} · {new Date(m.created_at).toLocaleString('ro-RO')}</p><p className="whitespace-pre-wrap break-words text-sm text-slate-100">{m.content}</p></article>)}{!messages.length&&!error&&<p className="text-sm text-slate-400">Niciun mesaj în această conversație.</p>}</div>
 <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row"><textarea aria-label="Mesaj" value={content} onChange={e=>setContent(e.target.value)} maxLength={4000} className="min-h-20 min-w-0 flex-1 rounded-lg border border-white/10 bg-[#10162a] p-3 text-slate-100" placeholder="Scrie un mesaj…"/><Button className="w-full sm:w-auto" disabled={sending||!content.trim()}>{sending?'Se trimite…':'Trimite'}</Button></form></section>;
}
