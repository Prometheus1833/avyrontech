import { cleanLogoProductConfig,logoRequestMode } from "@/shared/logoPipeline";
import { cleanBrief } from "@/data/logoStudio";
import type { LeadDetail } from "@/lib/leadsApi";
export default function LogoLeadDetails({lead}:{lead:LeadDetail}){
  if(lead.product!=="logo-studio"&&lead.product!=="logo-studio-3d")return null;
  let raw:Record<string,unknown>;
  try{raw=JSON.parse(lead.config_json||"{}");if(!raw||typeof raw!=="object")return null;}catch{return null;}
  const mode=logoRequestMode(lead),configuration=mode==="3d"?cleanLogoProductConfig(raw.configuration):null;
  const brief=mode!=="3d"?cleanBrief((raw.brief||{}) as Record<string,unknown>):null;
  const fields=configuration?[["Produs","Logo Studio 3D"],["Generare","Motor 3D în browser, fără AI"],["Text",configuration.text],["Simbol",configuration.symbol],["Material",configuration.material],["Culori",`${configuration.colorA} / ${configuration.colorB}`],["Adâncime / spațiere",`${configuration.depth} / ${configuration.letterSpacing}`],["Rotire",configuration.spin?"Activă":"Oprită"]]:brief?[["Tip",brief.kind==="static"?"Simulare Logo 2D":"Serviciu de logo dinamic 3D — separat de produs"],["Generare",raw.source==="ai"?"Asistată AI":"Standard fără AI"],["Nume",brief.name],["Slogan",brief.tagline],["Domeniu",brief.industry],["Stil",brief.style],["Culoare",brief.color],["Detalii introduse",brief.notes]]:[];
  if(!fields.length)return null;
  return <section aria-label="Configurație logo" className="space-y-3 rounded-xl border p-3"><h3 className="text-sm font-semibold">Configurație și brief logo</h3><dl className="grid gap-2 sm:grid-cols-2">{fields.map(([label,value])=><div key={label} className="min-w-0"><dt className="text-[11px] text-slate-400">{label}</dt><dd className="break-words whitespace-pre-wrap text-sm">{value||"Nespecificat"}</dd></div>)}</dl><p className="text-xs text-slate-500">Estimarea și interesul comercial nu confirmă plata sau livrarea. Comenzile se verifică în fluxul financiar nativ.</p></section>;
}
