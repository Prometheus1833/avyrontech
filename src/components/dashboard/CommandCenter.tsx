import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Command, FileText, FolderKanban, Search, Target, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canOpenSection } from "@/lib/access";
import { commandIntent } from "@/shared/commandIntent";
import { Button } from "@/components/ui/button";
import { centersApi } from "@/lib/centersApi";
import { useSearchParams } from "react-router-dom";
import type { Access, SectionId } from "@/lib/access";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: Access;
  onNavigate: (section: SectionId, center?:string) => void;
};

export default function CommandCenter({ open, onOpenChange, access, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [active,setActive]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [result,setResult]=useState<{title:string;text?:string;note?:string;id?:string;data?:Record<string,unknown>[]} | null>(null);
  const sequence=useRef(0),locked=useRef(false);
  const intent=commandIntent(query);
  const execute=async(path:string,body?:unknown)=>{
    if(locked.current)return;locked.current=true;setBusy(true);setError("");const seq=++sequence.current;
    try{const value=body?await centersApi.write<NonNullable<typeof result>>(path,body):await centersApi.get<NonNullable<typeof result>>(path);if(seq===sequence.current)setResult(value);}
    catch(e){if(seq===sequence.current)setError(e instanceof Error?e.message:"Comanda a eșuat.");}
    finally{locked.current=false;setBusy(false);}
  };
  const [,setParams]=useSearchParams();
  const [modules,setModules]=useState<{id:string;name:string;detail:string}[]>([]);
  useEffect(()=>{let cancelled=false;if(open&&access.isStaff)void centersApi.get<{modules:{id:string;name:string;detail:string}[]}>('catalog').then(r=>{if(!cancelled)setModules(r.modules);}).catch(()=>setModules([]));return()=>{cancelled=true;};},[open,access.isStaff]);
  useEffect(() => { if (!open) {setQuery("");setResult(null);setError("");sequence.current++;} }, [open]);

  const commands = useMemo(() => [
    {label:"Creează lead",hint:"Deschide formularul CRM",section:"leads" as SectionId,icon:Target,allowed:canOpenSection("leads",access)},
    { label: "Deschide proiectele", hint: "Proiecte, status și livrare", section: "projects" as SectionId, icon: FolderKanban, allowed: true },
    { label: "Arată leadurile", hint: "Pipeline și leaduri fără răspuns", section: "leads" as SectionId, icon: Target, allowed: access.isStaff },
    { label: "Deschide situația financiară", hint: "Facturi, costuri, venituri și bugete", section: "finance" as SectionId, icon: Wallet, allowed: access.isSuperAdmin },
    { label: "Deschide agenții AVY", hint: "Agenți, activitate și cunoaștere", section: "ai-os" as SectionId, icon: Bot, allowed: access.isSuperAdmin },
    { label: "Deschide centrul de documente", hint: "Documents Hub, căutare AI și auditor", section: "os-centers" as SectionId, icon: FileText, allowed: access.isSuperAdmin, center:"documents" },
    { label: "Vezi toate centrele AVYRON OS", hint: "Securitate, automatizări, integrări și operațiuni", section: "os-centers" as SectionId, icon: Command, allowed: access.isStaff },
  ].filter((command) => command.allowed && canOpenSection(command.section,access)), [access]);

  const normalize=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro");
  const normalized = normalize(query.trim());
  const allCommands = [...commands.map(c=>({...c,center:c.center as string|undefined})),...modules.map(m=>({label:m.name,hint:m.detail,section:"os-centers" as SectionId,icon:Command,allowed:true,center:m.id}))];
  const filtered = allCommands.filter((command) => !normalized || (intent?.type==='lead'&&command.label==='Creează lead') || normalize(`${command.label} ${command.hint}`).includes(normalized));
  const actions:{label:string;hint:string;run:()=>void}[]=[];
  if(access.isSuperAdmin){
    if(!query||intent?.type==='invoices')actions.push({label:'Arată facturile neachitate',hint:'Facturi emise, trimise, restante și plătite parțial',run:()=>void execute('commands/query?type=invoices')});
    if(!query||intent?.type==='wcag')actions.push({label:'Rulează scanarea WCAG',hint:'Verificare preliminară pe avyron.ro; salvează raport în Documents Hub',run:()=>void execute('commands/wcag',{path:'/'})});
    if(intent?.type==='client')actions.push({label:`Deschide clientul ${intent.query}`,hint:'Caută în registrul de clienți și deschide fișa',run:()=>void execute(`commands/query?type=client&q=${encodeURIComponent(intent.query)}`)});
    if(intent?.type==='report')actions.push({label:`Generează raportul ${intent.month}`,hint:'Raport operațional lunar UTC, salvat ca document ciornă',run:()=>void execute('commands/report',{month:intent.month})});
  }
  const choose=(command:typeof allCommands[number])=>{onNavigate(command.section,command.center);onOpenChange(false);if(command.label==='Creează lead')setParams(previous=>{const next=new URLSearchParams(previous);next.set('action','new-lead');return next;});};
  const options=[...actions,...filtered.map(command=>({label:command.label,hint:command.hint,run:()=>choose(command)}))];
  const labels:Record<string,string>={company_name:'Client',contact_name:'Contact',email:'Email',phone:'Telefon',status:'Stare',name:'Proiect',domain:'Domeniu',invoice_number:'Număr factură',service_name:'Serviciu',due_date:'Scadență',gross_amount_minor:'Valoare brută',currency:'Monedă'};

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl overflow-hidden border-white/10 bg-[#0b1020] p-0 text-slate-100 shadow-[0_40px_120px_-30px_rgba(99,102,241,.75)]">
      <DialogHeader className="sr-only"><DialogTitle>Centru de comandă</DialogTitle><DialogDescription>Navigare rapidă în AVYRON OS</DialogDescription></DialogHeader>
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4"><Search className="size-4 text-violet-300" /><input autoFocus value={query} onChange={(event) => {setQuery(event.target.value);setActive(0);setResult(null);setError("");sequence.current++;}} aria-label="Comandă rapidă" role="combobox" aria-expanded={options.length>0} aria-controls="command-options" aria-activedescendant={options.length?`command-option-${Math.min(active,options.length-1)}`:undefined} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setActive(n=>Math.max(0,Math.min(options.length-1,n+(event.key==='ArrowDown'?1:-1))));}if(event.key==='Enter'&&!busy){event.preventDefault();options[Math.min(active,options.length-1)]?.run();}}} placeholder="Caută proiecte, leaduri, facturi, agenți…" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600" /><kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">ESC</kbd></div>
      <div className="max-h-[55vh] overflow-y-auto p-2">
        <p className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">Comenzi disponibile</p>
        <div id="command-options" role="listbox" aria-label="Comenzi">
        {options.map((option,index)=><button id={`command-option-${index}`} role="option" aria-selected={active===index} key={option.label} disabled={busy} type="button" onClick={option.run} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-violet-400/[0.08] ${active===index?'bg-violet-400/10':''}`}><Command className="size-4 shrink-0 text-violet-300"/><span className="min-w-0"><span className="block break-words text-sm font-medium text-slate-200">{option.label}</span><span className="block text-xs text-slate-400">{option.hint}</span></span></button>)}
        </div>
        {options.length===0&&<p className="p-4 text-sm text-slate-400">Încearcă „creează lead”, „arată facturile neachitate”, „deschide clientul X” sau „generează raportul august 2026”. Sunt disponibile doar acțiunile autorizate.</p>}
        {busy&&<p role="status" className="p-3 text-sm">Se execută comanda…</p>}{error&&<p role="alert" className="p-3 text-sm text-rose-300">{error}</p>}
        {result&&<section className="m-2 space-y-3 rounded-xl border border-violet-300/20 p-3"><h3 className="font-semibold">{result.title}</h3>{result.text&&<p className="whitespace-pre-wrap break-words text-sm">{result.text}</p>}{result.note&&<p className="text-xs text-amber-200">{result.note}</p>}{result.data?.map((row,index)=><article key={String(row.id||index)} className="min-w-0 border-t border-white/10 pt-3"><dl className="grid gap-1">{Object.entries(row).filter(([key])=>labels[key]).map(([key,value])=><div key={key} className="min-w-0 text-sm"><dt className="text-xs text-slate-500">{labels[key]}</dt><dd className="break-words">{value===null?'Necunoscut':key==='due_date'?new Date(Number(value)).toLocaleDateString('ro-RO'):key==='gross_amount_minor'?`${(Number(value)/100).toLocaleString('ro-RO')} ${row.currency}`:String(value)}</dd></div>)}</dl>{result.title==='Clienți'&&<Button variant="outline" className="mt-2" disabled={busy} onClick={()=>void execute(`commands/client/${encodeURIComponent(String(row.id))}`)}>Deschide fișa clientului</Button>}</article>)}{result.data?.length===0&&<p className="text-sm text-slate-400">Nu există rezultate.</p>}{result.id&&<Button onClick={()=>{onNavigate('os-centers','documents');onOpenChange(false);}}>Deschide Documents Hub</Button>}</section>}

      </div>
      <div className="border-t border-white/[0.08] px-4 py-3 text-[11px] text-slate-600">↑ ↓ pentru selectare · Enter pentru executare · Rapoartele rămân ciorne private.</div>
    </DialogContent>
  </Dialog>;
}
