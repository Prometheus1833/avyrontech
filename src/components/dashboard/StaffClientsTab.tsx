import { useCallback, useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CreditCard, Search, ShoppingCart, UserRoundCog, Users } from "lucide-react";
import { toast } from "sonner";
import { adminOperationsApi, type AdminClient } from "@/lib/adminOperationsApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { internApi } from "@/lib/internApi";

const inputClass = "w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50";

export function StaffClientsTab() {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminClient | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof adminOperationsApi.client>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ companyName: "", contactName: "", email: "", phone: "", status: "active" });
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [projectId, setProjectId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) setItems((await adminOperationsApi.clients()).data);
      else setItems((await internApi.listClients()).data.map((client) => ({ ...client, phone: null, created_at: 0, project_count: 0, active_subscription_count: 0, account_count: 0, status: client.status as AdminClient["status"] })));
    }
    catch { toast.error("Registrul de clienți nu a putut fi încărcat."); }
    finally { setLoading(false); }
  }, [isSuperAdmin]);
  useEffect(() => { void load(); }, [load]);

  const openClient = async (client: AdminClient) => {
    setSelected(client); setDetail(null);
    setDraft({ companyName: client.company_name, contactName: client.contact_name || "", email: client.email, phone: client.phone || "", status: client.status });
    try {
      const data = await adminOperationsApi.client(client.id);
      setDetail(data); setAccountIds(data.accounts.map((account) => account.id));
    } catch { toast.error("Fișa clientului nu a putut fi încărcată."); }
  };

  const save = async () => {
    if (!selected || !detail) return;
    setSaving(true);
    try {
      await adminOperationsApi.updateClient(selected.id, draft);
      await adminOperationsApi.setClientAccounts(selected.id, accountIds);
      if (projectId) await adminOperationsApi.assignClientProjects(selected.id, [projectId]);
      toast.success("Fișa clientului, accesul și proiectele au fost sincronizate.");
      setSelected(null); setProjectId(""); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Clientul nu a putut fi actualizat."); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const value = q.trim().toLocaleLowerCase("ro");
    return value ? items.filter((client) => [client.company_name, client.contact_name, client.email, client.phone].some((field) => String(field || "").toLocaleLowerCase("ro").includes(value))) : items;
  }, [items, q]);

  return <div className="space-y-4 text-slate-100">
    <header className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.10] via-[#11182d] to-violet-500/[0.10] p-5 sm:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200/70">Relații comerciale</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-white">Clienți</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">Doar clienții comerciali apar aici. Conturile STAFF sunt excluse server-side; fiecare fișă reunește proiecte, abonamente, conturi și coșuri.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={Users} label="Clienți" value={items.length} /><Metric icon={BriefcaseBusiness} label="Proiecte alocate" value={items.reduce((sum, item) => sum + Number(item.project_count), 0)} /><Metric icon={CreditCard} label="Abonamente active" value={items.reduce((sum, item) => sum + Number(item.active_subscription_count), 0)} /></div>
    <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><span className="sr-only">Caută client</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Caută companie, contact, email sau telefon…" className="w-full rounded-xl border border-white/[0.08] bg-[#10162a]/90 py-3 pl-10 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-violet-400/40" /></label>
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#10162a]/90">
      <div className="hidden grid-cols-[minmax(200px,1.3fr)_minmax(180px,1fr)_100px_110px_92px] gap-3 border-b border-white/[0.07] px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-slate-600 md:grid"><span>Client</span><span>Contact</span><span>Proiecte</span><span>Abonamente</span><span>Stare</span></div>
      {loading && <div className="h-28 animate-pulse bg-white/[0.03]" />}
      {!loading && filtered.map((client) => <button key={client.id} type="button" onClick={() => isSuperAdmin && void openClient(client)} disabled={!isSuperAdmin} className="grid w-full gap-3 border-b border-white/[0.05] p-4 text-left transition last:border-0 enabled:hover:bg-violet-400/[0.05] disabled:cursor-default md:grid-cols-[minmax(200px,1.3fr)_minmax(180px,1fr)_100px_110px_92px] md:items-center">
        <span className="min-w-0"><strong className="block truncate text-sm text-slate-200">{client.company_name}</strong><span className="block truncate text-[11px] text-slate-600">{client.contact_name || "Contact necompletat"}</span></span>
        <span className="min-w-0 text-xs text-slate-400"><span className="block truncate">{client.email}</span><span className="block truncate text-[10px] text-slate-600">{client.phone || "Fără telefon"}</span></span>
        <span className="text-sm font-semibold text-white">{client.project_count}</span><span className="text-sm font-semibold text-white">{client.active_subscription_count}</span><span className={`w-fit rounded-full px-2 py-1 text-[10px] ${client.status === "active" ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}>{client.status}</span>
      </button>)}
      {!loading && filtered.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Nu există clienți pentru filtrul curent.</p>}
    </section>
    <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !saving) setSelected(null); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#10162a] text-slate-100 sm:max-w-3xl">
        <DialogHeader><DialogTitle className="font-display text-white">Fișă Super Admin — {selected?.company_name}</DialogTitle><DialogDescription className="text-slate-400">Identitate, acces, proiecte, abonamente și comenzi într-un singur flux.</DialogDescription></DialogHeader>
        {!detail ? <div className="h-48 animate-pulse rounded-xl bg-white/[0.04]" /> : <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Companie" value={draft.companyName} onChange={(companyName) => setDraft((v) => ({ ...v, companyName }))} /><Field label="Persoană de contact" value={draft.contactName} onChange={(contactName) => setDraft((v) => ({ ...v, contactName }))} /><Field label="Email" value={draft.email} onChange={(email) => setDraft((v) => ({ ...v, email }))} type="email" /><Field label="Telefon" value={draft.phone} onChange={(phone) => setDraft((v) => ({ ...v, phone }))} /><label className="text-xs text-slate-400">Stare<select className={`${inputClass} mt-1`} value={draft.status} onChange={(e) => setDraft((v) => ({ ...v, status: e.target.value }))}><option value="active">Activ</option><option value="paused">În pauză</option><option value="archived">Arhivat</option></select></label></div>
          <section><h3 className="flex items-center gap-2 text-sm font-semibold"><UserRoundCog className="size-4 text-violet-300" /> Conturi client</h3><p className="mb-2 text-[11px] text-slate-500">Utilizatorii primesc doar zona lor de abonamente, proiecte, coș și suport. STAFF nu poate fi selectat.</p><div className="grid gap-2 sm:grid-cols-2">{detail.accountOptions.map((account) => <label key={account.id} className="flex items-center gap-2 rounded-xl border border-white/[0.07] p-2.5 text-xs"><input type="checkbox" checked={accountIds.includes(account.id)} onChange={(e) => setAccountIds((current) => e.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id))} /><span className="min-w-0"><strong className="block truncate text-slate-300">{account.display_name || account.company_name || account.email}</strong><span className="block truncate text-slate-600">{account.email}</span></span></label>)}</div></section>
          <section className="grid gap-3 md:grid-cols-2"><div><h3 className="text-sm font-semibold">Proiectele clientului</h3><div className="mt-2 space-y-1">{detail.projects.map((project) => <p key={project.id} className="rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-slate-300">{project.name} <span className="float-right text-slate-600">{project.status}</span></p>)}{detail.projects.length === 0 && <p className="text-xs text-slate-600">Niciun proiect alocat.</p>}</div></div><div><h3 className="text-sm font-semibold">Alocă un proiect existent</h3><select className={`${inputClass} mt-2`} value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">Alege proiectul…</option>{detail.availableProjects.filter((project) => project.client_id !== selected?.id).map((project) => <option key={project.id} value={project.id}>{project.name} · {project.status}</option>)}</select></div></section>
          <section className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/[0.07] p-3"><p className="flex items-center gap-2 text-xs text-slate-500"><CreditCard className="size-4" /> Abonamente</p><p className="mt-1 text-xl font-semibold">{detail.subscriptions.length}</p>{detail.subscriptions.slice(0, 3).map((item) => <p key={item.id} className="mt-1 truncate text-[11px] text-slate-500">{item.service_name} · {item.status}</p>)}</div><div className="rounded-xl border border-white/[0.07] p-3"><p className="flex items-center gap-2 text-xs text-slate-500"><ShoppingCart className="size-4" /> Coșuri active / comenzi</p><p className="mt-1 text-xl font-semibold">{detail.carts.length} / {detail.orders.length}</p>{detail.carts.slice(0, 2).map((cart) => <p key={String(cart.user_id)} className="mt-1 truncate text-[11px] text-cyan-300/70">Coș: {itemNames(cart.items_json)}</p>)}{detail.orders.slice(0, 3).map((order) => <p key={String(order.id)} className="mt-1 truncate text-[11px] text-slate-500">{String(order.id).slice(0, 8).toUpperCase()} · {itemNames(order.items_json)} · {Number(order.total_cents || 0) / 100} {String(order.currency || "RON")}</p>)}</div></section>
        </div>}
        <DialogFooter><Button variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Închide</Button><Button onClick={() => void save()} disabled={saving || !detail} className="bg-violet-600 hover:bg-violet-500">{saving ? "Se sincronizează…" : "Salvează și sincronizează"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}

const Metric = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) => <div className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><p className="flex items-center gap-2 text-xs text-slate-500"><Icon className="size-4 text-violet-300" /> {label}</p><p className="mt-2 font-display text-2xl font-semibold text-white">{value}</p></div>;
const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <label className="text-xs text-slate-400">{label}<input type={type} className={`${inputClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
const itemNames = (value: unknown) => { try { const rows = JSON.parse(String(value || "[]")); return Array.isArray(rows) && rows.length ? rows.slice(0, 4).map((item) => String(item?.name || item?.title || item?.sku || "produs")).join(", ") : "gol"; } catch { return "date indisponibile"; } };
