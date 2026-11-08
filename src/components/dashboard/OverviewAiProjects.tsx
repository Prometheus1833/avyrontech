import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {Bot,ArrowUpRight} from 'lucide-react';
import {aiProjectsApi,type AiProjectListRow} from '@/lib/aiProjectsApi';
export default function OverviewAiProjects(){
 const [rows,setRows]=useState<AiProjectListRow[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void aiProjectsApi.list().then(next=>{if(!Array.isArray(next.data))throw Error('Răspunsul proiectelor AI nu este valid. Reîncearcă.');if(active){setRows(next.data);setSelected(old=>next.data.some(p=>p.id===old)?old:next.data[0]?.id||'');}}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Proiectele AI nu pot fi citite.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[retry]);
 const project=rows.find(row=>row.id===selected);
 return <section aria-labelledby="overview-ai-title" className="min-w-0 rounded-2xl border border-violet-400/15 bg-[#10162a]/90 p-4 sm:p-5">
 <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-200/70">Producție conectată</p><h2 id="overview-ai-title" className="mt-1 flex items-center gap-2 text-lg font-semibold"><Bot className="size-4 text-violet-300"/>Proiecte AI</h2></div><Link to="/profil?tab=ai-projects" className="text-xs text-violet-200">Vezi portofoliul</Link></div>
 {error?<p role="alert" className="mt-3 text-xs text-amber-200">{error} <button className="underline" onClick={()=>setRetry(n=>n+1)}>Reîncearcă</button></p>:<>
 <label className="mt-3 block text-xs text-slate-400">Selectează proiectul AI<select value={selected} disabled={loading||!rows.length} onChange={e=>setSelected(e.target.value)} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-[#10162a] px-3 text-base text-slate-100 sm:text-sm"><option value="" disabled>{loading?'Se citesc proiectele…':!rows.length?'Niciun proiect alocat':'Alege proiectul'}</option>{rows.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 {project&&<div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="max-w-2xl break-words text-sm text-slate-300">{project.summary}</p><p className="mt-1 text-xs text-slate-500">{({active:'Activ',setup:'În configurare',paused:'În pauză',archived:'Arhivat'})[project.status]} · {project.agents_ready}/{project.agents_total} agenți pregătiți · {project.content_pending} materiale de verificat</p></div><Link to={`/intern/ai-projects/${encodeURIComponent(project.slug)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500/20 px-3 text-sm font-medium text-violet-100">Deschide proiectul AI<ArrowUpRight className="size-4"/></Link></div>}
 </>}
 </section>;
}
