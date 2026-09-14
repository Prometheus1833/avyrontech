import { useCallback, useEffect, useState } from 'react';
import { workspaceApi, type WorkItem } from '@/lib/workspaceApi';
import { cfAuth } from '@/lib/cfAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
const kinds = {task:'Task',deliverable:'Livrabil',onboarding:'Onboarding',offboarding:'Offboarding',maintenance:'Mentenanță'};
const statuses = {open:'Deschis',in_progress:'În lucru',blocked:'Blocat',done:'Finalizat',cancelled:'Anulat'};
const inputClass = 'rounded-lg border border-border bg-background p-2 text-sm';
export function ProjectWorkItems({projectId, onlyKind}:{projectId:string;onlyKind?:WorkItem['kind']}) {
  const [items,setItems]=useState<WorkItem[]>([]),[canWrite,setCanWrite]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [editing,setEditing]=useState<WorkItem|null>(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[due,setDue]=useState(''),[kind,setKind]=useState<WorkItem['kind']>(onlyKind || 'task');
  const load=useCallback(async()=>{
    setError('');
    try { const result=await cfAuth.request<{data:WorkItem[];canWrite:boolean}>(`/api/workspace/work-items/${encodeURIComponent(projectId)}`);setItems(result.data);setCanWrite(result.canWrite); }
    catch(e){setError(e instanceof Error?e.message:'Datele nu pot fi încărcate.');}
  },[projectId]);
  useEffect(()=>{void load();},[load]);
  const reset=()=>{setEditing(null);setTitle('');setDescription('');setDue('');};
  async function save(event:React.FormEvent) {
    event.preventDefault();setBusy(true);
    try {
      const body={kind,title,description:description||null,due_at:due?new Date(due).getTime():null,status:editing?.status||'open',...(editing?{revision:editing.revision}:{})};
      await workspaceApi.write(`work-items/${projectId}${editing?`/${editing.id}`:''}`,body,editing?'PATCH':'POST');
      reset();await load();
    } catch(e){toast.error(e instanceof Error?e.message:'Salvarea a eșuat.');} finally {setBusy(false);}
  }
  async function changeStatus(item:WorkItem,status:WorkItem['status']) {
    setBusy(true);
    try {await workspaceApi.write(`work-items/${projectId}/${item.id}`,{kind:item.kind,title:item.title,description:item.description,due_at:item.due_at,status,revision:item.revision},'PATCH');await load();}
    catch(e){toast.error(e instanceof Error?e.message:'Modificarea a eșuat.');await load();} finally {setBusy(false);}
  }
  const rows=onlyKind?items.filter(i=>i.kind===onlyKind):items;
  return <section className="my-4 rounded-xl border bg-card p-4 space-y-4">
    <header><h2 className="text-lg font-semibold">{onlyKind?kinds[onlyKind]:'Livrare și checklisturi'}</h2><p className="text-sm text-muted-foreground">Termene, progres și responsabilități pentru acest proiect.</p></header>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!error && !rows.length && <p className="text-sm text-muted-foreground">Niciun element înregistrat.</p>}
    <div className="space-y-2">{rows.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{kinds[item.kind]}</p><p className="font-medium break-words">{item.title}</p>{item.description&&<p className="text-sm whitespace-pre-wrap text-muted-foreground">{item.description}</p>}<p className={`text-xs ${item.due_at&&item.due_at<Date.now()&&!['done','cancelled'].includes(item.status)?'text-rose-400':'text-muted-foreground'}`}>{item.due_at?`Termen: ${new Date(item.due_at).toLocaleString('ro-RO')}`:'Fără termen'}</p></div>
      <select aria-label={`Stare ${item.title}`} disabled={!canWrite||busy} value={item.status} onChange={e=>void changeStatus(item,e.target.value as WorkItem['status'])} className={inputClass}>{Object.entries(statuses).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
      {canWrite&&<Button variant="outline" disabled={busy} onClick={()=>{setEditing(item);setTitle(item.title);setDescription(item.description||'');setKind(item.kind);setDue(item.due_at?new Date(item.due_at-new Date(item.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'');}}>Editează</Button>}
    </article>)}</div>
    {canWrite&&<form onSubmit={save} className="grid gap-3 border-t pt-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Titlu<input required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1 text-sm">Tip<select disabled={!!onlyKind} value={kind} onChange={e=>setKind(e.target.value as WorkItem['kind'])} className={inputClass}>{Object.entries(kinds).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Termen<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)} className={inputClass}/></label>
      <label className="grid gap-1 text-sm">Detalii<textarea maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)} className={inputClass}/></label>
      <div className="flex gap-2"><Button disabled={busy||!title.trim()}>{editing?'Salvează':'Adaugă'}</Button>{editing&&<Button type="button" variant="ghost" onClick={reset}>Anulează</Button>}</div>
    </form>}
  </section>;
}
