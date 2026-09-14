import { useCallback, useEffect, useRef, useState } from 'react';
import { workspaceApi } from '@/lib/workspaceApi';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
type Member={id:string;display_name:string;staff_role:string|null};
type Message={id:string;author_id:string;content:string;created_at:string};
const channels={general:'General',dev:'Dezvoltare',design:'Design',marketing:'Marketing',random:'Pauză'};
export function StaffChatTab(){
 const {user}=useAuth();
 const requestVersion=useRef(0);
 const [members,setMembers]=useState<Member[]>([]),[messages,setMessages]=useState<Message[]>([]),[target,setTarget]=useState('channel:general'),[content,setContent]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);
 const [older,setOlder]=useState(false),[offset,setOffset]=useState(0);
 const channel=target.startsWith('channel:')?target.slice(8):'general',recipient=target.startsWith('dm:')?target.slice(3):null;
 useEffect(()=>{void workspaceApi.list<Member>('staff').then(r=>setMembers(r.data)).catch(e=>setError(e.message));},[]);
 const invalidate=useCallback(()=>{requestVersion.current++;},[]);
 const load=useCallback(async()=>{
  const version=++requestVersion.current;
  try{const query=new URLSearchParams({channel,limit:'50',offset:String(offset)});if(recipient)query.set('recipient_id',recipient);
   const r=await workspaceApi.list<Message>(`chat?${query}`);if(version!==requestVersion.current)return;setMessages(r.data);setOlder(r.data.length===50);setError('');
  }catch(e){if(version!==requestVersion.current)return;setError(e instanceof Error?e.message:'Chatul nu poate fi încărcat.');}
 },[channel,recipient,offset]);
 useEffect(()=>{let active=true;void load();const timer=setInterval(()=>{if(active&&document.visibilityState==='visible')void load();},15000);return()=>{active=false;invalidate();clearInterval(timer);};},[load,invalidate]);
 async function send(e:React.FormEvent){e.preventDefault();if(!content.trim()||sending)return;setSending(true);try{await workspaceApi.write('chat',{content,channel,recipient_id:recipient});setContent('');setOffset(0);await load();}catch(e){toast.error(e instanceof Error?e.message:'Mesajul nu poate fi trimis.');}finally{setSending(false);}}
 return <section className="space-y-4"><header><h2 className="text-2xl font-semibold">Chat intern</h2><p className="text-sm text-muted-foreground">Conversații ale echipei și mesaje directe. Actualizare la 15 secunde.</p></header><label className="block text-sm">Conversație<select aria-label="Conversație" value={target} onChange={e=>{setTarget(e.target.value);setOffset(0);setMessages([]);}} className="mt-1 w-full rounded-lg border bg-background p-3"><optgroup label="Canale">{Object.entries(channels).map(([id,name])=><option key={id} value={`channel:${id}`}>{name}</option>)}</optgroup><optgroup label="Mesaj direct">{members.filter(m=>m.id!==user?.id).map(m=><option key={m.id} value={`dm:${m.id}`}>{m.display_name}</option>)}</optgroup></select></label>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!older} onClick={()=>setOffset(v=>v+50)}>Mai vechi</Button><Button size="sm" variant="outline" disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Mai recente</Button></div>
 <div className="min-h-48 max-h-[50vh] overflow-y-auto space-y-3 rounded-xl border bg-card p-4">{messages.map(m=><article key={m.id} className={`rounded-lg p-3 ${m.author_id===user?.id?'ml-6 bg-primary/10':'mr-6 bg-muted/40'}`}><p className="text-xs text-muted-foreground">{members.find(u=>u.id===m.author_id)?.display_name||'Membru'} · {new Date(m.created_at).toLocaleString('ro-RO')}</p><p className="whitespace-pre-wrap break-words text-sm">{m.content}</p></article>)}{!messages.length&&!error&&<p className="text-sm text-muted-foreground">Niciun mesaj în această conversație.</p>}</div>
 <form onSubmit={send} className="flex gap-2"><textarea aria-label="Mesaj" value={content} onChange={e=>setContent(e.target.value)} maxLength={4000} className="flex-1 rounded-lg border bg-background p-3" placeholder="Scrie un mesaj…"/><Button disabled={sending||!content.trim()}>{sending?'Se trimite…':'Trimite'}</Button></form></section>;
}
