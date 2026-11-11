import { Building2, Pencil } from "lucide-react";
import { documentCompanyIdentity } from "@/shared/documents/autofill";
export default function CompanySummary({ company, onEdit }: { company: Record<string,string|null>; onEdit: () => void }) {
  company = documentCompanyIdentity(company);
  return <section className="dc-panel dc-grid" aria-label="Datele societății AVYRON">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold"><Building2 className="size-4" />Datele societății AVYRON</h3><p className="mt-1 text-xs text-slate-400">Datele confirmate se preiau în documentele noi. Versiunile existente își păstrează conținutul.</p></div><button className="dc-button" onClick={onEdit}><Pencil className="size-3.5" />Completează datele firmei</button></div>
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">{[["legal_name","Denumire"],["tax_id","CUI"],["registration_number","Registrul Comerțului"],["share_capital","Capital social"],["address","Adresă de corespondență · Iași"],["registered_address","Sediu social · identificare juridică"],["representative","Reprezentant"],["contact_email","E-mail"]].map(([key,label]) => <div key={key} className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-3"><dt className="text-[11px] text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium">{company[key] || <span className="text-amber-200">Necompletat</span>}</dd></div>)}</dl>
  </section>;
}
