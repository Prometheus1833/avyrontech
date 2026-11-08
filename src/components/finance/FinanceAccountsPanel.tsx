import { useState } from 'react';
import { Building2, CreditCard, Plus, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { financeApi, type FinanceAccount, type FinancePaymentMethod } from '@/lib/financeApi';
type Selected = {
    kind: 'account';
    row: FinanceAccount | null;
} | {
    kind: 'method';
    row: FinancePaymentMethod | null;
};
const labels: Record<string, string> = { active: 'Activ', inactive: 'Inactiv', needs_configuration: 'De configurat', archived: 'Arhivat' };
const empty = { name: '', institution: '', internalAlias: '', currency: 'RON', accountType: 'bank', ibanLast4: '', purpose: '', status: 'needs_configuration', provider: '', alias: '', accountId: '', last4: '' };
const control = 'mt-1 min-h-10 w-full rounded-lg border border-white/15 bg-background px-3 py-2 text-base sm:text-sm';
export default function FinanceAccountsPanel({ accounts, methods, canEdit, onSaved }: {
    accounts: FinanceAccount[];
    methods: FinancePaymentMethod[];
    canEdit: boolean;
    onSaved: () => Promise<void>;
}) {
    const [selected, setSelected] = useState<Selected | null>(null), [draft, setDraft] = useState(empty), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
    const open = (selection: Selected) => {
        const r = selection.row;
        setSelected(selection);
        setConfirmed(false);
        setDraft(!r ? { ...empty, status: selection.kind === 'method' ? 'inactive' : 'needs_configuration' } : 'name' in r ? { ...empty, name: r.name, institution: r.institution, internalAlias: r.internal_alias, currency: r.currency, accountType: r.account_type, ibanLast4: r.iban_last4 || '', purpose: r.purpose, status: r.status } : { ...empty, provider: r.provider, alias: r.alias, accountId: r.account_id || '', last4: r.last4 || '', currency: r.currency || 'RON', purpose: r.purpose, status: r.status });
    };
    const save = async () => {
        if (!selected || busy || !confirmed)
            return;
        setBusy(true);
        try {
            const body = selected.kind === 'account' ? { name: draft.name, institution: draft.institution, internalAlias: draft.internalAlias, currency: draft.currency, accountType: draft.accountType, ibanLast4: draft.ibanLast4 || null, purpose: draft.purpose, status: draft.status } : { provider: draft.provider, alias: draft.alias, accountId: draft.accountId || null, last4: draft.last4 || null, currency: draft.currency, purpose: draft.purpose, status: draft.status };
            if (selected.row) {
                await (selected.kind === 'account' ? financeApi.updateAccount : financeApi.updatePaymentMethod)(selected.row.id, { ...body, expectedUpdatedAt: selected.row.updated_at, confirmed: true });
            }
            else
                await (selected.kind === 'account' ? financeApi.createAccount : financeApi.createPaymentMethod)(body);
            setSelected(null);
            await onSaved();
            toast.success('Configurarea a fost salvată și auditată.');
        }
        catch (e) {
            toast.error(e instanceof Error ? e.message : 'Configurarea nu a fost salvată.');
        }
        finally {
            setBusy(false);
        }
    };
    const field = (key: keyof typeof empty, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <label className="block text-xs text-muted-foreground">{label}<input className={control} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} {...props}/></label>;
    return <section className="grid items-start gap-3 xl:grid-cols-2" aria-label="Configurare conturi financiare">
    {[{ kind: 'account' as const, title: 'Conturi interne', rows: accounts, icon: Building2 }, { kind: 'method' as const, title: 'Metode de plată mascate', rows: methods, icon: CreditCard }].map(group => <div key={group.kind} className="min-w-0 rounded-2xl border border-border/70 bg-card/70 p-4"><div className="flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold"><group.icon className="size-4 text-violet-400"/>{group.title}</h2>{canEdit && <Button size="sm" variant="outline" onClick={() => open(group.kind === 'account' ? { kind: 'account', row: null } : { kind: 'method', row: null })}><Plus className="size-3.5"/>Adaugă</Button>}</div><p className="mt-1 text-xs text-muted-foreground">{group.kind === 'account' ? 'Evidență administrativă. Activarea în registru nu conectează banca.' : 'Aliasuri și ultimele patru cifre; fără număr complet de card sau CVV.'}</p><div className="mt-3 space-y-2">{group.rows.map(row => <article key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3"><div className="min-w-0"><h3 className="break-words text-sm font-medium">{'name' in row ? row.name : row.alias}</h3><p className="text-xs text-muted-foreground">{'institution' in row ? row.institution : row.provider} · {row.currency || '—'} · {labels[row.status] || row.status}</p><p className="mt-1 break-words text-xs text-muted-foreground">{row.purpose || 'Scop necompletat'}{'iban_last4' in row && row.iban_last4 ? ` · •••• ${row.iban_last4}` : 'last4' in row && row.last4 ? ` · •••• ${row.last4}` : ''}</p></div>{canEdit && <Button size="sm" variant="outline" onClick={() => open('name' in row ? { kind: 'account', row } : { kind: 'method', row })}><Settings2 className="size-3.5"/>Configurează</Button>}</article>)}{!group.rows.length && <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Nicio înregistrare. Adaugă și configurează prima fișă.</p>}</div></div>)}
    <Dialog open={!!selected} onOpenChange={value => { if (!value && !busy)
        setSelected(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{selected?.row ? 'Configurează' : 'Adaugă'} {selected?.kind === 'account' ? 'contul financiar' : 'metoda de plată'}</DialogTitle><DialogDescription>Salvarea modifică registrul intern și păstrează auditul. Nu autorizează transferuri, debitări sau acces API.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2">{selected?.kind === 'account' ? <>{field('name', 'Denumire *', { maxLength: 160 })}{field('institution', 'Instituție *', { maxLength: 120 })}{field('internalAlias', 'Alias intern *', { maxLength: 100 })}{field('ibanLast4', 'Ultimele 2–4 caractere IBAN', { maxLength: 4, autoComplete: 'off' })}<label className="text-xs text-muted-foreground">Tip cont<select aria-label="Tip cont" className={control} value={draft.accountType} onChange={e => setDraft({ ...draft, accountType: e.target.value })}>{[['bank', 'Bancar'], ['wallet', 'Portofel'], ['processor', 'Procesator'], ['cash', 'Numerar'], ['other', 'Altul']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label></> : <>{field('provider', 'Furnizor *', { maxLength: 100 })}{field('alias', 'Alias *', { maxLength: 100 })}{field('last4', 'Ultimele 4 cifre', { maxLength: 4, inputMode: 'numeric', autoComplete: 'off' })}<label className="text-xs text-muted-foreground">Cont asociat<select aria-label="Cont asociat" className={control} value={draft.accountId} onChange={e => setDraft({ ...draft, accountId: e.target.value })}><option value="">Fără asociere</option>{accounts.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label></>}
      <label className="text-xs text-muted-foreground">Monedă<select aria-label="Monedă" className={control} value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value })}>{[...new Set(['RON', 'EUR', 'USD',draft.currency])].map(v => <option key={v}>{v}</option>)}</select></label>{field('purpose', 'Scop', { maxLength: 300 })}<label className="text-xs text-muted-foreground">Stare<select aria-label="Stare" className={control} value={draft.status} onChange={e => { setDraft({ ...draft, status: e.target.value }); setConfirmed(false); }}>{Object.entries(labels).filter(([value]) => !(value === 'needs_configuration' && selected?.kind === 'method') && !(value === 'archived' && !selected?.row)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/><span>{draft.status === 'archived' ? 'Confirm arhivarea fișei; tranzacțiile și istoricul se păstrează.' : 'Confirm datele și starea în registrul intern.'}</span></label><div className="flex justify-end gap-2"><Button variant="ghost" disabled={busy} onClick={() => setSelected(null)}>Anulează</Button><Button disabled={busy || !confirmed} onClick={() => void save()}>{busy ? 'Se salvează…' : draft.status === 'active' ? 'Salvează și activează' : draft.status === 'archived' ? 'Arhivează' : 'Salvează'}</Button></div></DialogContent></Dialog>
  </section>;
}
