import MaintenanceSubscriptions from "./MaintenanceSubscriptions";
export default function ClientMaintenanceTab() {
  return <div className="min-w-0 space-y-4 text-slate-100">
    <header><p className="text-xs uppercase tracking-widest text-cyan-200">Activități Recurente</p><h1 className="mt-2 text-2xl font-semibold">Mentenanță Clienți</h1><p className="mt-1 text-sm text-slate-400">Proiecte, planuri lunare, materiale și membri alocați.</p></header>
    <MaintenanceSubscriptions />
  </div>;
}
