import {SearchableSelect} from "@/components/ui/searchable-select";
import { useEffect, useState } from 'react';
import { internApi } from '@/lib/internApi';
import { MediaAttachments } from './MediaAttachments';
import { ProjectWorkItems } from './ProjectWorkItems';
export function ProjectWorkspacePicker({mode}:{mode:'media'|'maintenance'}) {
  const [projects,setProjects]=useState<{id:string;slug:string;name:string}[]>([]),[selected,setSelected]=useState(''),[canWrite,setCanWrite]=useState(false),[error,setError]=useState('');
  useEffect(()=>{void internApi.listProjects().then(r=>setProjects(r.data)).catch(e=>setError(String(e.message)));},[]);
  useEffect(()=>{let current=true;setCanWrite(false);const project=projects.find(p=>p.id===selected);if(project)void internApi.getProject(project.slug).then(r=>{if(current)setCanWrite(r.permission.write);}).catch(e=>{if(current)setError(String(e.message));});return()=>{current=false;};},[selected,projects]);
  return <div className="space-y-4"><h2 className="text-2xl font-semibold">{mode==='media'?'Materiale și documente':'Mentenanță'}</h2><p className="text-sm text-muted-foreground">Selectează proiectul pentru a accesa materialele și activitățile sale.</p><SearchableSelect label="Proiect" value={selected} onChange={id=>{setSelected(id);setError('')}} options={projects.map(p=>({value:p.id,label:p.name}))} placeholder="Caută proiectul"/>{error&&<p role="alert" className="text-destructive">{error}</p>}{selected&&(mode==='media'?<MediaAttachments key={selected} projectId={selected} canWrite={canWrite}/>:<ProjectWorkItems key={selected} projectId={selected} onlyKind="maintenance"/>)}</div>;
}
