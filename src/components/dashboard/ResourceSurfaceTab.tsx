import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, BriefcaseBusiness, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LIBRARY_SECTIONS } from "@/data/bibliotecaCatalog";
import { useAuth } from "@/hooks/useAuth";
import { adminOperationsApi, type InternalResource } from "@/lib/adminOperationsApi";

const field = "mt-1 w-full rounded-lg border border-white/10 bg-[#080d1c] px-3 py-2 text-sm text-white";
type Draft = { title: string; description: string; category: string; url: string; status: InternalResource["status"] };
const emptyDraft: Draft = { title: "", description: "", category: "Efecte și referințe", url: "", status: "planned" };

export default function ResourceSurfaceTab({ kind }: { kind: "career" | "library" }) {
  const { isSuperAdmin } = useAuth();
  const [items, setItems] = useState<InternalResource[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InternalResource | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const careers = kind === "career";
  const Icon = careers ? BriefcaseBusiness : BookOpen;
  const load = useCallback(async () => {
    try { setItems((await adminOperationsApi.resources()).data.filter(item => item.kind === kind)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Resursele nu au putut fi încărcate."); }
  }, [kind]);
  useEffect(() => { void load(); }, [load]);
  const publicEffects = useMemo(() => LIBRARY_SECTIONS.flatMap(section => section.effects.map(effect => ({ ...effect, section }))), []);
  const visible = items.filter(item => `${item.title} ${item.category} ${item.description}`.toLocaleLowerCase("ro").includes(query.trim().toLocaleLowerCase("ro")));
  const open = (item: InternalResource | "new") => { setSelected(item); setDraft(item === "new" ? emptyDraft : { title: item.title, description: item.description, category: item.category, url: item.url || "", status: item.status }); };
  const save = async () => {
    if (!selected || !draft.title.trim()) return;
    setSaving(true);
    try {
      if (selected === "new") await adminOperationsApi.createResource({ kind, ...draft });
      else await adminOperationsApi.updateResource(selected.id, draft);
      toast.success("Registrul intern a fost actualizat."); setSelected(null); await load();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Resursa nu a putut fi salvată."); }
    finally { setSaving(false); }
  };
  const archive = async (item: InternalResource) => {
    setSaving(true);
    try { await adminOperationsApi.updateResource(item.id, { ...item, status: "archived" }); toast.success("Resursa a fost arhivată."); setSelected(null); await load(); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Resursa nu a putut fi arhivată."); }
    finally { setSaving(false); }
  };
  return <div className="space-y-5 text-slate-100">
    <header className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.10] via-[#11182d] to-cyan-400/[0.07] p-5 sm:p-6"><Icon className="size-5 text-violet-300"/><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-bold text-white">{careers ? "Cariere" : "Biblioteca AVYRON"}</h1><p className="mt-1 max-w-3xl text-sm text-slate-400">{careers ? "Resursele interne pentru recrutare." : "Pagina publică, efectele versionate și registrul intern de propuneri, surse și referințe."}</p></div><a href={careers ? "/cariere" : "/biblioteca"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-cyan-300 hover:bg-white/[0.04]">Deschide pagina publică <ArrowUpRight className="size-3.5"/></a></div></header>
    {error && <p role="alert" className="rounded-xl border border-amber-300/20 p-3 text-sm text-amber-200">{error}</p>}
    {!careers && <details className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><summary className="cursor-pointer text-sm font-semibold">Efectele publice · {publicEffects.length} în {LIBRARY_SECTIONS.length} secțiuni</summary><p className="mt-2 text-xs text-amber-200/80">Catalogul public este versionat în cod pentru SEO și demo-uri. Registrul de mai jos păstrează propunerile editabile; publicarea, modificarea sau retragerea unui efect live necesită PR și deploy.</p><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{publicEffects.map(({ section, ...effect }) => <article key={effect.code} className="rounded-xl border border-white/[0.07] bg-black/10 p-3"><p className="font-mono text-[10px] text-violet-300">{effect.code} · {section.name.ro}</p><h2 className="mt-1 text-sm font-semibold">{effect.name.ro}</h2><p className="mt-1 text-xs text-slate-400">{effect.desc.ro}</p><a href={`/biblioteca#${section.id}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-cyan-300">Vezi în pagină ↗</a></article>)}</div></details>}
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">{careers ? "Resurse interne" : "Propuneri și referințe editabile"}</h2><p className="text-xs text-slate-500">Înregistrări interne, cu arhivare în loc de ștergere definitivă.</p></div>{isSuperAdmin && <Button size="sm" onClick={() => open("new")}><Plus className="size-4"/> Adaugă</Button>}</div><label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"/><span className="sr-only">Caută resursă</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Caută titlu, categorie, descriere…" className="w-full rounded-xl border border-white/[0.08] bg-[#10162a] py-3 pl-10 pr-3 text-sm"/></label><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map(item => <article key={item.id} className="rounded-2xl border border-white/[0.08] bg-[#10162a]/90 p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-violet-300/70">{item.category} · {item.status}</p><h3 className="mt-2 text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{item.description || "Fără descriere."}</p><div className="mt-3 flex flex-wrap gap-3">{item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300">Deschide ↗</a>}{isSuperAdmin && <button type="button" onClick={() => open(item)} className="text-xs text-violet-300 hover:underline">Editează</button>}</div></article>)}{visible.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-500">Nu există înregistrări pentru această căutare.</p>}</div></section>
    <Dialog open={selected !== null} onOpenChange={openState => { if (!openState && !saving) setSelected(null); }}><DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle className="text-white">{selected === "new" ? "Resursă nouă" : "Editează resursa"}</DialogTitle><DialogDescription>Nu introduce credențiale. Efectele publice rămân versionate în cod.</DialogDescription></DialogHeader><div className="grid gap-3"><label className="text-xs text-slate-400">Titlu<input className={field} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}/></label><label className="text-xs text-slate-400">Categorie<input className={field} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}/></label><label className="text-xs text-slate-400">URL opțional<input className={field} type="url" value={draft.url} onChange={e => setDraft({ ...draft, url: e.target.value })}/></label><label className="text-xs text-slate-400">Descriere<textarea rows={3} className={field} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })}/></label><label className="text-xs text-slate-400">Stare<select className={field} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Draft["status"] })}><option value="planned">Planificat</option><option value="active">Activ</option><option value="archived">Arhivat</option></select></label></div><div className="flex flex-wrap justify-between gap-2">{selected && selected !== "new" && selected.status !== "archived" ? <Button variant="ghost" className="text-rose-300" disabled={saving} onClick={() => void archive(selected)}>Arhivează</Button> : <span/>}<Button disabled={saving || !draft.title.trim()} onClick={() => void save()}>{saving ? "Se salvează…" : "Salvează"}</Button></div></DialogContent></Dialog>
  </div>;
}
