import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { productSalesApi } from '@/lib/productSalesApi';
import type { ProductSalesDetail } from '@/shared/productSales';
import type { AdminProductItem } from '@/lib/produseApi';
const cls = 'mt-1 w-full rounded-lg border border-white/15 bg-background p-2.5 text-base sm:text-sm';
// Matches the existing public FAQ; the operator must confirm applicability.
const existingTerms = 'Licența permite utilizarea în proiecte proprii și ale clienților, inclusiv comerciale. Este permisă vânzarea produselor finite realizate cu aceste componente. Nu este permisă revânzarea sau redistribuirea componentelor ca atare, într-un kit, bibliotecă sau marketplace. Bibliotecile și materialele terțe își păstrează licențele și atribuirile proprii. Drepturile specifice și excepțiile se confirmă înainte de vânzare.';
export default function ProductSalesEditor({ item, onClose, onSaved, onCommercial }: {
    item: AdminProductItem | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
    onCommercial: () => void;
}) {
    const [detail, setDetail] = useState<ProductSalesDetail | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [confirm, setConfirm] = useState(false), [version, setVersion] = useState('1.0.0');
    const [form, setForm] = useState({ licenseName: 'Licență comercială AVYRON', licenseTerms: existingTerms, licenseApproved: false, deliveryMode: 'download' as 'download' | 'assisted', deliveryInstructions: '' });
    const slug = item?.slug;
    const dirty=Boolean(detail&&(form.licenseName!==(detail.data.license_name||'Licență comercială AVYRON')||form.licenseTerms!==(detail.data.license_terms||existingTerms)||form.licenseApproved!==Boolean(detail.data.license_approved)||form.deliveryMode!==(detail.data.delivery_mode==='assisted'?'assisted':'download')||form.deliveryInstructions!==(detail.data.delivery_instructions||'')));
    const load = useCallback(async () => { if (!slug)
        return; setLoading(true); setError(''); setDetail(null); try {
        const d = await productSalesApi.detail(slug);
        setDetail(d);
        setForm({ licenseName: d.data.license_name || 'Licență comercială AVYRON', licenseTerms: d.data.license_terms || existingTerms, licenseApproved: !!d.data.license_approved, deliveryMode: d.data.delivery_mode === 'assisted' ? 'assisted' : 'download', deliveryInstructions: d.data.delivery_instructions || '' });
        setConfirm(false);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Configurarea nu poate fi citită.');
    }
    finally {
        setLoading(false);
    } }, [slug]);
    useEffect(() => { void load(); }, [load]);
    const action = async (fn: () => Promise<unknown>, message: string) => { setBusy(true); try {
        await fn();
        await load();
        await onSaved();
        toast.success(message);
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Operațiunea nu a reușit.');
        toast.error(e instanceof Error ? e.message : 'Operațiunea nu a reușit.');
    }
    finally {
        setBusy(false);
    } };
    return <Dialog open={!!item} onOpenChange={open => { if (!open && !busy)
        onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Pregătire vânzare · {item?.name_ro}</DialogTitle><DialogDescription>Identificare, facturare, licență și livrare privată. Activarea se face după verificarea condițiilor reale.</DialogDescription></DialogHeader>{loading && <p role="status">Se verifică produsul…</p>}{error && <p role="alert" className="rounded-xl border border-amber-500/30 p-3 text-sm text-amber-200">{error}</p>}{detail && <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2">{detail.checks.map(check => <div key={check.key} className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs"><span>{check.label}</span><span className={check.ok ? 'text-emerald-400' : 'text-amber-300'}>{check.ok ? 'Complet' : 'De completat'}</span></div>)}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={onCommercial}>Configurează coduri, preț și TVA</Button><Button asChild size="sm" variant="outline"><Link to="/profil?tab=finance&view=accounts" onClick={onClose}>Conturi și procesatori</Link></Button></div><p className="rounded-lg bg-muted/40 p-3 font-mono text-xs">SKU: {detail.data.sku || 'Lipsește'} · Articol: {detail.data.accounting_code || 'Lipsește'}</p>
 <section className="space-y-3 rounded-xl border p-3"><h3 className="font-medium">Licență și livrare</h3><p className="text-xs text-muted-foreground">Textul inițial pornește din condițiile publice existente. Confirmă drepturile aplicabile produsului; nu extinde drepturile asupra materialelor terțe.</p><label className="block text-xs">Denumire licență<input className={cls} value={form.licenseName} onChange={e => { setForm({ ...form, licenseName: e.target.value, licenseApproved: false }); setConfirm(false); }} maxLength={160}/></label><label className="block text-xs">Condiții de utilizare<textarea className={cls} rows={5} maxLength={12000} value={form.licenseTerms} onChange={e => { setForm({ ...form, licenseTerms: e.target.value, licenseApproved: false }); setConfirm(false); }}/></label><label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={form.licenseApproved} onChange={e => { setForm({ ...form, licenseApproved: e.target.checked }); setConfirm(false); }}/>Confirm că am verificat licența și drepturile acestui produs.</label><label className="block text-xs">Mod livrare<select className={cls} value={form.deliveryMode} onChange={e => { setForm({ ...form, deliveryMode: e.target.value as typeof form.deliveryMode }); setConfirm(false); }}><option value="download">Descărcare ZIP privată după plată</option>{slug === 'logo-studio-3d' && <option value="assisted">Logo Studio 3D · livrare prin fluxul produsului</option>}</select></label><label className="block text-xs">Instrucțiuni de livrare / utilizare<textarea className={cls} rows={3} maxLength={4000} value={form.deliveryInstructions} onChange={e => { setForm({ ...form, deliveryInstructions: e.target.value }); setConfirm(false); }}/></label><Button size="sm" disabled={busy || form.licenseTerms.trim().length < 40} onClick={() => void action(() => productSalesApi.save(slug!, { ...form, expectedUpdatedAt: detail.data.profile_updated_at }), 'Licența și livrarea au fost salvate. Reverifică înainte de activare.')}>Salvează licența și livrarea</Button></section>
 {form.deliveryMode === 'download' && <section className="space-y-3 rounded-xl border p-3"><h3 className="font-medium">Pachet livrabil</h3><p className="text-xs text-muted-foreground">{detail.data.version ? `Versiunea ${detail.data.version} · ${Number(detail.data.bytes).toLocaleString('ro-RO')} bytes` : 'Nicio versiune încărcată. Nu se poate vinde ca descărcare fără pachet.'}</p>{detail.data.sha256 && <p className="break-all font-mono text-[10px] text-muted-foreground">SHA-256 {detail.data.sha256}</p>}<label className="block text-xs">Versiune nouă<input className={cls} value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0"/></label><label className="block text-xs">Încarcă ZIP (extern, maximum 25 MB)<input aria-label="Pachet ZIP" className={cls} type="file" accept=".zip,application/zip" disabled={busy||dirty} onChange={e => { const file = e.target.files?.[0]; if (file && slug)
            void action(() => productSalesApi.upload(slug, file, version), 'Pachet verificat și înregistrat.'); e.target.value = ''; }}/></label><p className="text-xs text-muted-foreground">Uploadurile externe folosesc antivirusul existent și rămân blocate fără verdict CLEAN. Generările interne nu consumă scanări.</p></section>}
 <section className="space-y-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3"><h3 className="font-medium">{item?.price_ron_cents === 0 ? "Produs gratuit" : "Finalizează pentru vânzare"}</h3>{item?.price_ron_cents === 0 && <p className="text-xs text-cyan-300">Accesul gratuit folosește fluxul existent. Nu se activează checkout și nu se emite automat o factură.</p>}<p className="text-xs text-muted-foreground">Se reverifică versiunea datelor, procesatorul și accesul la pachet. Plata confirmată de webhook acordă acces în istoricul clientului; starea vizuală nu confirmă încasarea.</p>{dirty&&<p className="text-xs text-amber-300">Salvează modificările licenței și livrării înainte de activare.</p>}<label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)}/>Confirm activarea acestui produs la prețul și condițiile salvate.</label><Button disabled={busy || dirty || !item?.price_ron_cents || !confirm || detail.checks.some(check => !check.ok)} onClick={() => void action(() => productSalesApi.activate(detail.data), 'Vânzarea produsului a fost activată.')}>{detail.data.payment_status === 'active' ? 'Reverifică activarea' : 'Activează vânzarea'}</Button><Button className="ml-2" variant="outline" size="sm" disabled={busy} onClick={() => void load()}>Reverifică</Button></section></div>}</DialogContent></Dialog>;
}
