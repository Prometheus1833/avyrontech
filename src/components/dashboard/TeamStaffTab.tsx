import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, LockKeyhole, Search, Settings2, ShieldCheck, UserCheck, Users } from "lucide-react";
import { internApi, type AccountOption } from "@/lib/internApi";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    await internApi.listAccounts()
      .then((result) => setAccounts(result.data.filter((account) => /(^|,)(staff|admin)(,|$)/.test(account.roles || ""))))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Echipa nu a putut fi încărcată."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const openAccess = (account: AccountOption) => {
    const roles = (account.roles || "").split(",");
    setAccessLevel(roles.includes("admin") ? "admin" : roles.includes("staff") ? "staff" : "user");
    setSelected(account);
  };

  const saveAccess = async () => {
    if (!selected || !isSuperAdmin) return;
    setSaving(true);
    try {
      await internApi.updateAccountAccess(selected.id, accessLevel);
      toast.success("Nivelul de acces a fost actualizat și auditat.");
      setSelected(null);
      await loadAccounts();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Nivelul de acces nu a putut fi actualizat.");
    } finally {
      setSaving(false);
    }
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
          <div><h1 className="font-display text-2xl font-bold text-white">Echipă și personal</h1><p className="mt-1 max-w-2xl text-sm text-slate-400">Membri, roluri și acces operațional. Permisiunile reale sunt validate în Worker, nu doar ascunse în interfață.</p></div>
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300"><ShieldCheck className="size-3.5" /> RBAC server-side activ</span>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          { label: "Membri staff", value: accounts.length, icon: Users },
          { label: "Administratori", value: accounts.filter((item) => (item.roles || "").split(",").includes("admin")).length, icon: LockKeyhole },
          { label: "Politică acces", value: "Privilegii minime", icon: KeyRound },
        ].map((item) => <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 font-display text-xl font-semibold text-white">{item.value}</p></div><span className="grid size-9 place-items-center rounded-xl bg-violet-400/10 text-violet-300"><item.icon className="size-4" /></span></div></div>)}
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-display text-lg font-semibold text-white">Membrii echipei</h2><p className="text-xs text-slate-500">Datele personale sunt mascate pentru rolurile fără acces complet.</p></div>
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
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-200">{name}</p><p className="truncate text-xs text-slate-600">{account.email}</p></div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-violet-300/10 bg-violet-400/[0.08] px-2.5 py-1 text-[11px] text-violet-200">{roleLabels[primaryRole]}</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] text-emerald-300"><UserCheck className="size-3" /> Activ</span>{isSuperAdmin && <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 border-white/10 bg-white/[0.03] text-xs text-slate-300 hover:bg-violet-400/10 hover:text-white" onClick={() => openAccess(account)}><Settings2 className="size-3.5" /> Gestionează</Button>}</div>
            </div>;
          })}
        </div>
        {!isSuperAdmin && <p className="mt-4 text-[11px] leading-relaxed text-slate-600">Modificarea rolurilor și privilegiilor este disponibilă exclusiv Super Adminului și va necesita MFA și audit.</p>}
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setSelected(null)} disabled={saving}>Anulează</Button>
            <Button type="button" onClick={() => void saveAccess()} disabled={saving} className="bg-violet-600 hover:bg-violet-500">{saving ? "Se salvează…" : "Salvează accesul"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
