import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, ArrowUpRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { produseApi } from "@/lib/produseApi";
import { publicSiteHref } from "@/lib/appHost";
import { PRODUSE_BASE, PRODUSE_ITEM_ROUTES } from "@/features/produse/data/routes";
import type { PaidProductHistory } from "@/shared/paidProducts";

const paths = new Map(PRODUSE_ITEM_ROUTES.map(item => [item.slug, `${PRODUSE_BASE.ro}/${item.type}/${item.slug}`]));
const action = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-violet-200 hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50";
const date = (value: number) => new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(value);

export default function PaidDevelopmentProducts() {
  const { user } = useAuth();
  const [downloading,setDownloading]=useState<string|null>(null);
  const download=async(slug:string)=>{setDownloading(slug);try{await produseApi.download(slug)}catch(e){toast.error(e instanceof Error?e.message:"Descărcarea nu a reușit.")}finally{setDownloading(null)}};
  const [history, setHistory] = useState<PaidProductHistory | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const retryCursor = useRef<string | undefined>();
  const load = useCallback(async (cursor?: string) => {
    const request = ++sequence.current;
    retryCursor.current = cursor;
    setLoading(true);
    setError("");
    try {
      const result = await produseApi.purchases(cursor);
      if (sequence.current === request) setHistory(previous => ({
        ...result,
        data: cursor && previous ? [...previous.data, ...result.data.filter(row => !previous.data.some(existing => existing.id === row.id))] : result.data,
      }));
    } catch {
      if (sequence.current === request) setError("Achizițiile nu pot fi încărcate acum. Reîncearcă.");
    } finally {
      if (sequence.current === request) setLoading(false);
    }
  }, []);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => {
    setHistory(null);
    if (user?.id) void load();
    return invalidate;
  }, [user?.id, load, invalidate]);
  return <section aria-labelledby="paid-development-title" className="min-w-0 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-[#10162a] p-4 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 id="paid-development-title" className="flex items-center gap-2 text-lg font-semibold"><BadgeCheck className="size-5 shrink-0 text-emerald-300" aria-hidden />Produse Development</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">Produsele apar după confirmarea plății. Istoricul se păstrează și după expirarea unui drept de acces; licența și livrabilele se verifică la deschiderea produsului.</p>
      </div>
      <button type="button" onClick={() => void load()} disabled={loading} className={action}><RefreshCw className="size-3.5" aria-hidden />Actualizează achizițiile</button>
    </header>
    {error && <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/20 p-3 text-sm text-amber-100">{error}<button type="button" className={action} disabled={loading} onClick={() => void load(retryCursor.current)}>Reîncearcă</button></div>}
    {!history && loading && <p role="status" className="mt-3 text-sm text-slate-400">Se încarcă achizițiile…</p>}
    {history && !history.data.length && <div className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400">Nu ai produse achitate încă. Produsele adăugate în coș sau cu plata în așteptare apar aici după confirmare.<a href={publicSiteHref("/produse")} className={`${action} mt-3 flex w-fit`}>Vezi produsele <ArrowUpRight className="size-3.5" aria-hidden /></a></div>}
    {!!history?.data.length && <ul className="mt-3 space-y-2">{history.data.map(purchase => <li key={purchase.id} className="min-w-0 rounded-xl border border-white/10 bg-black/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-slate-400">#{purchase.id.slice(0, 8).toUpperCase()} · {purchase.paidAt ? `Achitat la ${date(purchase.paidAt)}` : `Comandă din ${date(purchase.createdAt)}`}</span><span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-200">Plată confirmată</span></div>
      <ul className="mt-2 divide-y divide-white/5">{purchase.items.map((item, index) => <li key={`${item.sku || item.slug}-${index}`} className="flex min-w-0 flex-col items-start gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 w-full flex-1 break-words sm:w-auto"><h2 className="text-sm font-medium">{item.name}</h2>{item.licenseTerms&&<details className="mt-2 text-xs text-slate-400"><summary className="cursor-pointer text-violet-200">{item.licenseName||"Licența achiziției"}</summary><p className="mt-2 whitespace-pre-wrap">{item.licenseTerms}</p></details>}{item.sku && <p className="mt-1 break-all text-xs text-slate-500">{item.sku}{item.quantity ? ` · ${item.quantity} buc.` : ""}</p>}</div>
        {item.slug&&(item.slug!=="logo-studio-3d"||item.deliveryMode==="download")&&<button type="button" className={action} disabled={!!downloading} onClick={()=>void download(item.slug!)}>{downloading===item.slug?"Se descarcă…":"Descarcă ZIP"}</button>}<a className={action} href={publicSiteHref(paths.get(item.slug || "") || "/produse")}>{paths.has(item.slug || "") ? "Deschide produsul" : "Catalog produse"}<ArrowUpRight className="size-3.5" aria-hidden /></a>
      </li>)}</ul>
      <Link to={`/profil?tab=orders&order=${encodeURIComponent(purchase.id)}`} className={`${action} mt-2`}>Vezi comanda</Link>
    </li>)}</ul>}
    {history?.nextCursor && <button type="button" disabled={loading} className={`${action} mt-3`} onClick={() => void load(history.nextCursor!)}>{loading ? "Se încarcă…" : "Achiziții mai vechi"}</button>}
  </section>;
}
