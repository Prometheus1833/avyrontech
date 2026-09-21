import SurveyAdmin from '@/pages/surveys/Admin';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Access, SectionId } from '@/lib/access';
import type { CenterId, StaffPolicy } from '@/shared/osCatalog';
import OperationsConsole, { Automations, Integrations, Records } from './OperationsConsole';
import { ApprovalsPanel, BriefingPanel, CommentsPanel, Notice, RegistryPanel, ReportPanel, WorkPanel } from './CenterPanels';
import {inputClass,panelClass,useCenterData} from './centerHooks';
import DocumentsHub from './DocumentsHub';
import AccountsPanel from './AccountsPanel';
import MarketingPanel from './MarketingPanel';
import BackupsPanel from './BackupsPanel';
import { centerFields } from './centerForms';
type Module={id:CenterId;name:string;group:string;detail:string;canWrite:boolean};
const recordKinds={contracts:'contract',changes:'change_request',appointments:'appointment',privacy:'privacy_request',compliance:'compliance',experiments:'experiment'} as const;
export default function OsCentersTab({access}:{access:Access;onNavigate:(section:SectionId)=>void}){
 const [params,setParams]=useSearchParams(),[search,setSearch]=useState('');
 const {data,error,loading,reload}=useCenterData<{modules:Module[];policy:StaffPolicy}>('catalog');
 const selected=data?.modules.find(m=>m.id===params.get('center'));
 const open=(id:string|null)=>setParams(previous=>{const next=new URLSearchParams(previous);if(id)next.set('center',id);else next.delete('center');return next;});
 const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const visible=data?.modules.filter(m=>normalized(`${m.name} ${m.detail}`).includes(normalized(search)))||[];
 const render=(m:Module)=>{
  const id=m.id;
  if(id==='accounts')return <AccountsPanel/>;
  if(id==='marketing')return <MarketingPanel canWrite={m.canWrite}/>;
  if(id==='backup')return <BackupsPanel canWrite={m.canWrite}/>;
  if(id==='surveys')return <SurveyAdmin embedded/>;
  if(id==='documents')return <DocumentsHub canWrite={m.canWrite}/>;
  if(id==='approvals')return <ApprovalsPanel/>;
  if(id==='briefing')return <BriefingPanel/>;
  if(id==='automations')return <Automations/>;
  if(id==='integrations')return <><Integrations/><div className={`${panelClass} mt-4`}><h3 className="font-semibold">Următoarele conexiuni</h3><p className="mt-2 text-sm text-slate-400">Meta: configurare în Conturi & dispozitive și publicare în Marketing Studio. FGO, NETOPIA și Google: adaptoarele se activează în etapele dedicate. Email: necesită dovadă de livrare. Supabase: legacy, nu este backendul AVYRON OS.</p></div></>;
  if(id in recordKinds)return <><Records key={id} initialKind={recordKinds[id as keyof typeof recordKinds]}/>{id==='privacy'&&<div className="mt-5"><h3 className="mb-3 font-semibold">Jurnal de consimțământ newsletter</h3><ReportPanel center="privacy" canWrite={false}/></div>}</>;
  if(['deliverables','onboarding','offboarding'].includes(id))return <WorkPanel center={id} canWrite={m.canWrite}/>;
  if(id==='comments')return <CommentsPanel canWrite={m.canWrite}/>;
  if(id in centerFields)return <>{['profitability','security'].includes(id)&&<div className="mb-6"><ReportPanel center={id} canWrite={m.canWrite}/></div>}<RegistryPanel kind={id} canWrite={m.canWrite}/></>;
  return <ReportPanel center={id} canWrite={m.canWrite}/>;
 };
 return <div className="space-y-5 text-slate-100"><header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-[#10162a] p-5"><p className="text-xs uppercase tracking-widest text-violet-300">AVYRON OS · spațiu operațional</p><h1 className="mt-2 font-display text-2xl font-semibold">{selected?.name||'Centre AVYRON OS'}</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">{selected?.detail||'Toate modulele autorizate, cu date persistente și acțiuni controlate. Selectează un centru pentru detalii.'}</p></header>
 <Notice error={error} loading={loading}/>{error&&<Button onClick={()=>void reload()}>Reîncearcă</Button>}
 {selected?<><Button variant="outline" onClick={()=>open(null)}><ArrowLeft className="mr-2 size-4"/>Toate centrele</Button><div key={selected.id}>{render(selected)}</div></>:<><label className="flex items-center gap-2"><Search className="size-4 text-violet-300"/><input aria-label="Caută funcționalități" placeholder="Caută un centru…" value={search} onChange={e=>setSearch(e.target.value)} className={inputClass}/></label>{Array.from(new Set(visible.map(m=>m.group))).map(group=><section key={group}><h2 className="mb-3 text-sm font-semibold text-slate-300">{group}</h2><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.filter(m=>m.group===group).map(m=><button key={m.id} onClick={()=>open(m.id)} className={`${panelClass} group text-left transition hover:border-violet-400/40 focus-visible:outline-violet-400`}><span className="flex items-center justify-between gap-2 text-sm font-semibold">{m.name}<ArrowUpRight className="size-4 shrink-0 text-violet-300"/></span><span className="mt-2 block text-xs leading-relaxed text-slate-400">{m.detail}</span><span className="mt-3 block text-[10px] uppercase tracking-wider text-violet-300">{m.canWrite?'Gestionare':'Consultare'}</span></button>)}</div></section>)}{!loading&&!visible.length&&!error&&<p className="text-sm text-slate-400">Niciun centru disponibil pentru această căutare și rol.</p>}{access.isSuperAdmin&&!search&&<details className={panelClass}><summary className="cursor-pointer">Consola operațională existentă</summary><div className="mt-5"><OperationsConsole/></div></details>}</>}
 </div>;
}
