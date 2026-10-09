import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, KeyRound, LockKeyhole, LogOut, Power, RotateCcw, Search, Settings2, ShieldCheck, UserCheck, UserPlus, Users } from "lucide-react";
import { workspaceApi } from "@/lib/workspaceApi";
import { internApi, type AccountOption, type ClientOption } from "@/lib/internApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminOperationsApi, type AdminProjectOption } from "@/lib/adminOperationsApi";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  staff: "Membru staff",
  user: "Client",
};

export default function TeamStaffTab() {
  const { isSuperAdmin } = useAuth();
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AccountOption | null>(null);
  const [accessLevel, setAccessLevel] = useState<"user" | "staff" | "admin">("staff");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [linksReady, setLinksReady] = useState(false);
  const [projects, setProjects] = useState<AdminProjectOption[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [operatorPassword, setOperatorPassword] = useState("");
  const [operatorSyncing, setOperatorSyncing] = useState(false);
  const [codexOperator, setCodexOperator] = useState<{ exists: boolean; synchronized: boolean; bindings?: Array<{ agent_slug: string; status: string }> } | null>(null);
  const [create, setCreate] = useState({ email: "", username: "", displayName: "", temporaryPassword: "", accessLevel: "user" as "user" | "staff" | "admin" });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    await (isSuperAdmin ? Promise.all([internApi.listAccounts(), adminOperationsApi.staff()]).then(([users, staff]) => {
      setProjects(staff.projects);
      setAccounts(users.data);
    }) : internApi.listAccounts().then((result) => setAccounts(result.data.filter((account) => /(^|,)(staff|admin)(,|$)/.test(account.roles || "")))))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Echipa nu a putut fi încărcată."))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const loadCodexOperator = useCallback(async () => {
    if (!isSuperAdmin) return;
    await internApi.codexOperator().then((result) => setCodexOperator(result.data)).catch(() => setCodexOperator(null));
  }, [isSuperAdmin]);

  useEffect(() => { void loadCodexOperator(); }, [loadCodexOperator]);

  const synchronizeCodexOperator = async () => {
    if (!codexOperator?.exists && operatorPassword.length < 10) {
      toast.error("Pentru contul nou este necesară o parolă temporară sigură.");
      return;
    }
    setOperatorSyncing(true);
    try {
      await internApi.synchronizeCodexOperator(operatorPassword || undefined);
      toast.success("Contul Codex a fost sincronizat cu Leads și AI AVY Prod, cu privilegii minime.");
      setOperatorPassword("");
      setOperatorOpen(false);
      await Promise.all([loadAccounts(), loadCodexOperator()]);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Sincronizarea contului Codex nu a reușit.");
    } finally { setOperatorSyncing(false); }
  };

  const openAccess = async (account: AccountOption) => {
    setLinksReady(false);setClientIds([]);
    try {
      const [list, linked, staffData] = await Promise.all([internApi.listClients(),workspaceApi.list<{client_id:string}>(`account-access/${account.id}`),adminOperationsApi.staff()]);
      setClients(list.data);setClientIds(linked.data.map(r=>r.client_id));setLinksReady(true);
      const staff = staffData.data.find((item) => item.id === account.id);
      setProjects(staffData.projects); setProjectIds((staff?.project_ids || "").split(",").filter(Boolean));
    } catch (error) { toast.error(error instanceof Error ? error.message : "Asocierile nu pot fi încărcate."); }
    const roles = (account.roles || "").split(",");
    setAccessLevel(roles.includes("admin") ? "admin" : roles.includes("staff") ? "staff" : "user");
    setSelected(account);
  };

  const saveAccess = async () => {
    if (!selected || !isSuperAdmin || !linksReady) return;
    setSaving(true);
    try {
      await workspaceApi.write(`account-access/${selected.id}`, {client_ids:clientIds,access_level:accessLevel}, "PUT");
      if (accessLevel === "staff" || accessLevel === "admin") await adminOperationsApi.setStaffProjects(selected.id, projectIds);
      toast.success("Accesul și asocierile client au fost actualizate și auditate.");
      setSelected(null);
      await loadAccounts();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Nivelul de acces nu a putut fi actualizat.");
    } finally {
      setSaving(false);
    }
  };

  const createAccount = async () => {
    setSaving(true);
    try {
      await internApi.createAccount(create);
      toast.success("Contul a fost creat cu parolă temporară.");
      setCreateOpen(false);
      setCreate({ email: "", username: "", displayName: "", temporaryPassword: "", accessLevel: "user" });
      await loadAccounts();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Contul nu a putut fi creat."); }
    finally { setSaving(false); }
  };

  const accountAction = async (action: "status" | "password" | "sessions") => {
    if (!selected) return;
    setSaving(true);
    try {
      if (action === "status") await internApi.setAccountEnabled(selected.id, Boolean(selected.disabled_at));
      if (action === "password") {
        if (temporaryPassword.length < 10) throw new Error("Parola temporară trebuie să aibă minimum 10 caractere.");
        await internApi.setTemporaryPassword(selected.id, temporaryPassword);
        setTemporaryPassword("");
      }
      if (action === "sessions") await internApi.revokeAccountSessions(selected.id);
      toast.success(action === "status" ? "Starea contului a fost actualizată." : action === "password" ? "Parola temporară a fost setată, iar sesiunile au fost revocate." : "Sesiunile active au fost revocate.");
      await loadAccounts();
      setSelected(null);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Acțiunea nu a reușit."); }
    finally { setSaving(false); }
  };

  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("ro");
    if (!value) return accounts;
    return accounts.filter((account) => [account.display_name, account.company_name, account.email, account.roles]
      .some((field) => String(field || "").toLocaleLowerCase("ro").includes(value)));
  }, [accounts, query]);

  return (
    <div className="space-y-4 text-slate-100">
      <header className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.14] via-[#11182d] to-cyan-400/[0.06] p-5 sm:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-violet-200/70">Organizație și acces</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="font-display text-2xl font-bold text-white">Utilizatori și STAFF</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Conturi, roluri, stare, sesiuni și proiecte alocate. Toate acțiunile privilegiate sunt validate și auditate în Worker.</p></div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300"><ShieldCheck className="size-3.5" /> RBAC server-side activ</span>{isSuperAdmin && <Button type="button" size="sm" variant="outline" onClick={() => setOperatorOpen(true)} className="gap-2 border-cyan-300/20 bg-cyan-400/5 text-cyan-200 hover:bg-cyan-400/10"><Bot className="size-4" /> Agent Codex</Button>}{isSuperAdmin && <Button type="button" size="sm" onClick={() => setCreateOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-500"><UserPlus className="size-4" /> Cont nou</Button>}</div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Conturi", value: accounts.length, icon: Users },
          { label: "Administratori", value: accounts.filter((item) => (item.roles || "").split(",").includes("admin")).length, icon: LockKeyhole },
          { label: "Politică acces", value: "Privilegii minime", icon: KeyRound },
          { label: "Codex · 2 agenți", value: codexOperator?.synchronized ? "Sincronizat" : codexOperator?.exists ? "Necesită sincronizare" : "Neconfigurat", icon: Bot },
        ].map((item) => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 font-display text-xl font-semibold text-white">{item.value}</p></div><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><item.icon className="size-4" /></span></div></div>)}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-display text-lg font-semibold text-white">Administrare conturi</h2><p className="text-xs text-slate-500">Super Admin vede toate conturile; STAFF primește numai datele operaționale mascate.</p></div>
          <label className="relative block sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-600" /><span className="sr-only">Caută membru</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută membru sau rol…" className="w-full rounded-xl border border-white/[0.08] bg-black/20 py-2.5 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-400/40" /></label>
        </div>
        <div className="mt-4 space-y-2">
          {loading && <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />}
          {error && <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div>}
          {!loading && !error && filtered.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Nu există membri care corespund căutării.</div>}
          {filtered.map((account) => {
            const roles = (account.roles || "user").split(",").filter(Boolean);
            const primaryRole = roles.includes("admin") ? "admin" : roles.includes("staff") ? "staff" : "user";
            const name = account.display_name || account.company_name || account.email;
            return <div key={account.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3 sm:flex-row sm:items-center">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-400/10 font-display text-sm font-bold text-violet-200">{name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{name}</p><p className="truncate text-xs text-slate-600">{account.email}{account.username ? ` · @${account.username}` : ""}</p><p className="mt-1 text-[10px] text-slate-600">{account.must_change_password ? "Parolă temporară" : "Parolă personală"} · {account.active_sessions || 0} sesiuni active</p></div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-violet-300/10 bg-violet-400/[0.08] px-2.5 py-1 text-[11px] text-violet-200">{roleLabels[primaryRole]}</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] text-emerald-300"><UserCheck className="size-3" /> {account.disabled_at ? "Dezactivat" : "Activ"}</span>{isSuperAdmin && <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 border-white/10 bg-white/[0.03] text-xs text-slate-300 hover:bg-violet-400/10 hover:text-white" onClick={() => openAccess(account)}><Settings2 className="size-3.5" /> Gestionează</Button>}</div>
            </div>;
          })}
        </div>
        {!isSuperAdmin && <p className="mt-4 text-[11px] leading-relaxed text-slate-600">Modificarea rolurilor și privilegiilor este disponibilă exclusiv Super Adminului cu verificare și audit.</p>}
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open && !saving) setSelected(null); }}>
        <DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-white">Gestionează accesul</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selected?.display_name || selected?.company_name || selected?.email}. Modificarea este verificată server-side și înregistrată în audit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="team-access-level" className="text-slate-300">Nivel de acces</Label>
            <select id="team-access-level" value={accessLevel} onChange={(event) => setAccessLevel(event.target.value as "user" | "staff" | "admin")} className="w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-violet-400/50">
              <option value="user">Client — fără acces operațional implicit</option>
              <option value="staff">Membru staff — acces operațional limitat</option>
              <option value="admin">Administrator — acces operațional extins</option>
            </select>
            <p className="text-xs leading-relaxed text-amber-200/70">Identitățile protejate ale platformei nu pot fi retrogradate. Super Admin rămâne o atribuire separată, controlată de infrastructură.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-white/[0.07] p-3">
            <Label htmlFor="temporary-password" className="text-slate-300">Parolă temporară nouă</Label>
            <input id="temporary-password" type="password" autoComplete="new-password" value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} placeholder="Minimum 10 caractere, literă mare și cifră" className="w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm outline-none" />
            <div className="grid gap-2 sm:grid-cols-3"><Button type="button" size="sm" variant="outline" onClick={() => void accountAction("password")} disabled={saving || temporaryPassword.length < 10} className="gap-1.5"><RotateCcw className="size-3.5" /> Setează parola</Button><Button type="button" size="sm" variant="outline" onClick={() => void accountAction("sessions")} disabled={saving} className="gap-1.5"><LogOut className="size-3.5" /> Revocă sesiuni</Button><Button type="button" size="sm" variant="outline" onClick={() => void accountAction("status")} disabled={saving} className="gap-1.5"><Power className="size-3.5" /> {selected?.disabled_at ? "Reactivează" : "Dezactivează"}</Button></div>
          </div>
          <fieldset disabled={!linksReady || saving} className="space-y-2 max-h-48 overflow-y-auto">
            <legend className="text-sm font-medium">Acces la facturarea și suportul clienților</legend>
            {!linksReady && <p className="text-xs text-muted-foreground">Asocierile se încarcă sau nu sunt disponibile.</p>}
            {clients.map(client=><label key={client.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={clientIds.includes(client.id)} onChange={e=>setClientIds(current=>e.target.checked?[...current,client.id]:current.filter(id=>id!==client.id))}/>{client.company_name}</label>)}
          </fieldset>
          {(accessLevel === "staff" || accessLevel === "admin") && <fieldset disabled={!linksReady || saving} className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-white/[0.07] p-3">
            <legend className="px-1 text-sm font-medium text-slate-200">Proiecte alocate</legend>
            <p className="pb-1 text-[11px] text-slate-500">Alocările controlează accesul operațional real în Worker.</p>
            {projects.map((project) => <label key={project.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-slate-300"><input type="checkbox" checked={projectIds.includes(project.id)} onChange={(event) => setProjectIds((current) => event.target.checked ? [...current, project.id] : current.filter((id) => id !== project.id))} /> <span className="min-w-0 flex-1 truncate">{project.name}</span><span className="text-[10px] text-slate-600">{project.status}</span></label>)}
          </fieldset>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Anulează</Button>
            <Button type="button" onClick={() => void saveAccess()} disabled={saving || !linksReady} className="bg-violet-600 hover:bg-violet-500">{saving ? "Se salvează…" : "Salvează accesul"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => { if (!saving) setCreateOpen(open); }}>
        <DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Creează cont</DialogTitle><DialogDescription className="text-slate-400">Contul este confirmat administrativ și va cere schimbarea parolei la prima autentificare.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <Label>Nume<input value={create.displayName} onChange={(event) => setCreate({ ...create, displayName: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></Label>
            <Label>Email<input type="email" value={create.email} onChange={(event) => setCreate({ ...create, email: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></Label>
            <Label>Username<input autoComplete="off" value={create.username} onChange={(event) => setCreate({ ...create, username: event.target.value.toLowerCase() })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></Label>
            <Label>Parolă temporară<input type="password" autoComplete="new-password" value={create.temporaryPassword} onChange={(event) => setCreate({ ...create, temporaryPassword: event.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></Label>
            <Label>Rol<select value={create.accessLevel} onChange={(event) => setCreate({ ...create, accessLevel: event.target.value as typeof create.accessLevel })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm"><option value="user">Client</option><option value="staff">STAFF</option><option value="admin">Administrator</option></select></Label>
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} disabled={saving}>Anulează</Button><Button type="button" onClick={() => void createAccount()} disabled={saving || !create.email || !create.username || !create.displayName || create.temporaryPassword.length < 10}>{saving ? "Se creează…" : "Creează cont"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={operatorOpen} onOpenChange={(open) => { if (!operatorSyncing) setOperatorOpen(open); }}>
        <DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display text-white">Cont operațional Codex</DialogTitle><DialogDescription className="text-slate-400">Un singur cont dedicat, legat de agenții canonici Leads și AI AVY Prod. Nu primește administrare utilizatori, financiar, secrete, conectare de conturi sau publicare automată.</DialogDescription></DialogHeader>
          <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/5 p-3 text-xs leading-relaxed text-cyan-100/80">
            Rutina de cercetare, clasificare și redactare este delegată AI Core. Codex rămâne pentru verificare, aprobare și publicarea manuală exactă.
          </div>
          <Label>Parolă temporară {codexOperator?.exists ? "(opțional, pentru rotire)" : "(obligatorie)"}<input type="password" autoComplete="new-password" value={operatorPassword} onChange={(event) => setOperatorPassword(event.target.value)} placeholder="Minimum 10 caractere, literă mare și cifră" className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></Label>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setOperatorOpen(false)} disabled={operatorSyncing}>Anulează</Button><Button type="button" onClick={() => void synchronizeCodexOperator()} disabled={operatorSyncing || (!codexOperator?.exists && operatorPassword.length < 10)}>{operatorSyncing ? "Se sincronizează…" : codexOperator?.exists ? "Sincronizează accesul" : "Creează și sincronizează"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
