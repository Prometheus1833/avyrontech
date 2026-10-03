import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { sectionsFor, type Access, type SectionId } from "@/lib/access";
import { DASHBOARD_SECTION_META } from "@/components/dashboard/dashboardNavigation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: Access;
  onNavigate: (section: SectionId) => void;
};

export default function CommandCenter({ open, onOpenChange, access, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  const commands = useMemo(() => sectionsFor(access).map((section) => ({
    section: section.id,
    ...DASHBOARD_SECTION_META[section.id],
    searchText: `${DASHBOARD_SECTION_META[section.id].commandLabel} ${DASHBOARD_SECTION_META[section.id].hint} ${section.keywords.join(" ")}`,
  })), [access]);

  const normalized = query.trim().toLocaleLowerCase("ro");
  const filtered = commands.filter((command) => !normalized || command.searchText.toLocaleLowerCase("ro").includes(normalized));
  const navigate = (section: SectionId) => { onNavigate(section); onOpenChange(false); };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl overflow-hidden border-white/10 bg-[#0b1020] p-0 text-slate-100 shadow-[0_40px_120px_-30px_rgba(99,102,241,.75)]">
      <DialogHeader className="sr-only"><DialogTitle>Centru de comandă</DialogTitle><DialogDescription>Navigare rapidă în AVYRON OS</DialogDescription></DialogHeader>
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4"><Search className="size-4 text-violet-300" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută proiecte, leaduri, facturi, agenți…" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600" /><kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-slate-500">ESC</kbd></div>
      <div className="max-h-[55vh] overflow-y-auto p-2">
        <p className="px-2 pb-2 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">Comenzi disponibile</p>
        {filtered.map((command) => { const Icon = command.icon; return <button key={command.section} type="button" onClick={() => navigate(command.section)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-violet-400/[0.08]"><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><Icon className="size-4" /></span><span><span className="block text-sm font-medium text-slate-200">{command.commandLabel}</span><span className="block text-xs text-slate-600">{command.hint}</span></span></button>; })}
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Nu există o comandă autorizată pentru această căutare.</div>}
      </div>
      <div className="border-t border-white/[0.08] px-4 py-3 text-[11px] text-slate-600">Comenzile care modifică date, publică sau consumă resurse vor necesita confirmare și aprobare.</div>
    </DialogContent>
  </Dialog>;
}
