import {useEffect,useState} from "react";
import {useQuery,useQueryClient} from "@tanstack/react-query";
import {ArrowUpRight,BriefcaseBusiness,RefreshCw} from "lucide-react";
import Link from "@/components/site/WorkspaceLink";
import {useAuth} from "@/hooks/useAuth";
import {internApi} from "@/lib/internApi";
import {PROJECT_KIND_LABELS,projectKindLabel,projectStageLabel} from "@/shared/projectSummary";
import {projectStage} from "@/shared/projectLifecycle";

export default function ClientServicesTab(){
  const {user}=useAuth(),client=useQueryClient();
  const [visible,setVisible]=useState(20);
  const key=["client-services",user?.id];
  const query=useQuery({queryKey:key,enabled:!!user?.id,queryFn:({signal})=>internApi.listClientServices(signal),refetchOnWindowFocus:true,refetchInterval:60000,refetchIntervalInBackground:false,retry:false});
  useEffect(()=>{
    const changed=()=>void client.invalidateQueries({queryKey:["client-services",user?.id]});
    window.addEventListener("avyron:projects-changed",changed);
    return()=>window.removeEventListener("avyron:projects-changed",changed);
  },[client,user?.id]);
  const services=query.data?.services||[];
  const projects=(query.data?.data||[]).map(project=>{
    const names=[...new Set(services.filter(s=>s.project_id===project.id).map(s=>s.service_name))];
    if(!names.length&&project.kind!=="external_asset"&&Object.prototype.hasOwnProperty.call(PROJECT_KIND_LABELS,project.kind)&&projectStage(project)!=="proposed")names.push(projectKindLabel(project.kind));
    return {project,names};
  }).filter(row=>row.names.length);
  const purchases=query.data?.servicePurchases||[];
  return <section className="min-w-0 space-y-4" aria-label="Serviciile mele">
    <header className="flex items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Serviciile mele</h1><p className="mt-1 text-sm text-slate-300">Serviciile din proiectele tale, inclusiv cele finalizate, și achizițiile confirmate de la AVYRON.</p></div>
      <button type="button" aria-label="Actualizează serviciile mele" disabled={query.isFetching} onClick={()=>void query.refetch()} className="shrink-0 rounded-xl border border-white/10 p-3 text-slate-300 hover:bg-white/5 disabled:opacity-50"><RefreshCw aria-hidden className="size-4"/></button>
    </header>
    {query.isError?<div role="alert" className="rounded-2xl border border-amber-400/20 p-4 text-sm text-amber-100">Serviciile nu au putut fi încărcate. <button className="underline" onClick={()=>void query.refetch()}>Reîncearcă</button></div>:query.isPending?<p role="status" className="text-sm text-slate-300">Se încarcă serviciile tale…</p>:<>
      {!projects.length&&!purchases.length&&<div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><BriefcaseBusiness aria-hidden className="mb-3 size-6 text-violet-300"/><p className="text-sm text-slate-200">Nu ai încă servicii alocate sau achiziții de servicii confirmate.</p><p className="mt-1 text-xs leading-5 text-slate-400">Acestea vor apărea aici după alocarea la un proiect sau confirmarea plății.</p></div>}
      {!!projects.length&&<div className="space-y-3" aria-label="Servicii din proiecte">{projects.slice(0,visible).map(({project,names})=><article key={project.id} className="rounded-2xl border border-white/10 bg-[#10162a]/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="min-w-0 break-words text-sm font-semibold">{project.name}</h2><span className="rounded-lg bg-violet-500/15 px-2 py-1 text-xs text-violet-200">{projectStageLabel(project)}</span></div>
        <ul className="mt-3 space-y-1 text-sm text-slate-300">{names.map(name=><li key={name} className="break-words">{name}</li>)}</ul>
        <Link to={`/intern/projects/${encodeURIComponent(project.slug)}`} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-violet-200">Deschide proiectul <ArrowUpRight aria-hidden className="size-3.5"/></Link>
      </article>)}</div>}
      {!!purchases.length&&<section className="rounded-2xl border border-white/10 bg-[#10162a]/70 p-4" aria-label="Achiziții de servicii confirmate"><h2 className="text-sm font-semibold">Achiziții confirmate</h2><ul className="mt-2 divide-y divide-white/10">{purchases.slice(0,visible).map(item=><li key={`${item.order_id}:${item.line_index}`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3"><span className="break-words text-sm text-slate-200">{item.name}</span><span className="text-xs text-emerald-300">Plată confirmată</span></li>)}</ul></section>}
      {(projects.length>visible||purchases.length>visible)&&<button className="min-h-11 rounded-xl border border-white/10 px-4 text-sm" onClick={()=>setVisible(n=>n+20)}>Afișează mai multe</button>}
    </>}
  </section>;
}
