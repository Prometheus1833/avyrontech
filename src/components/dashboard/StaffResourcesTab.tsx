import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Globe2, Plus } from "lucide-react";
import { toast } from "sonner";
import { adminOperationsApi, type InternalResource } from "@/lib/adminOperationsApi";
import { normalizeExternalLink } from "@/shared/externalUrl";
import { Button } from "@/components/ui/button";

export const StaffResourcesTab = ({ registryOnly = false }: { registryOnly?: boolean }) => {
  const [resources, setResources] = useState<InternalResource[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState({ kind: "website", title: "", description: "", url: "", category: "General", status: "active" });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { try { setResources((await adminOperationsApi.resources()).data); } catch { /* Visible fallback remains available. */ } }, []);
  useEffect(() => { void load(); }, [load]);
  const saveResource = async () => {
    setSaving(true);
    try { await adminOperationsApi.createResource(draft); toast.success("Resursa a fost adăugată în registrul intern."); setEditorOpen(false); setDraft({ kind: "website", title: "", description: "", url: "", category: "General", status: "active" }); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Resursa nu a putut fi salvată."); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      {!registryOnly && <header className="rounded-2xl border border-white/10 p-5"><h1 className="text-xl font-semibold">Resurse interne</h1><p className="mt-2 text-sm text-slate-400">Ghidurile staffului sunt în <a className="text-violet-300 underline" href="/profil?tab=documents">Document Center</a>.</p></header>}
      {<section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Site-uri, câmpuri și bibliotecă operațională</h2><p className="text-xs text-slate-500">Nu salva parole sau secrete; registrul păstrează doar metadate și referințe.</p></div><Button onClick={() => setEditorOpen(true)} className="rounded-xl"><Plus className="size-4" /> Resursă nouă</Button></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{resources.map((resource) => <article key={resource.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><div className="flex items-start justify-between gap-2"><span className="grid size-9 place-items-center rounded-lg bg-violet-400/10 text-violet-300">{resource.kind === "website" ? <Globe2 className="size-4" /> : <BookOpen className="size-4" />}</span><span className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">{resource.status}</span></div><h3 className="mt-3 text-sm font-semibold text-slate-200">{resource.title}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{resource.description || resource.category}</p>{resource.url && normalizeExternalLink(resource.url) && <a href={normalizeExternalLink(resource.url)!} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs text-cyan-300 hover:text-cyan-200">Deschide referința ↗</a>}</article>)}{resources.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500 md:col-span-2 xl:col-span-3">Registrul este pregătit. Adaugă primul site, câmp, instrument sau element pentru Cariere/Bibliotecă.</div>}</div></section>}

      <Dialog open={editorOpen} onOpenChange={(value) => !saving && setEditorOpen(value)}><DialogContent className="border-white/10 bg-[#10162a] text-slate-100 sm:max-w-lg"><DialogHeader><DialogTitle>Resursă nouă</DialogTitle><DialogDescription className="text-slate-400">Completează doar informații operaționale fără credențiale.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-400">Tip<select value={draft.kind} onChange={(e) => setDraft((v) => ({ ...v, kind: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm"><option value="website">Site</option><option value="field">Câmp / schemă</option><option value="tool">Unealtă</option><option value="reference">Referință</option><option value="career">Cariere</option><option value="library">Bibliotecă</option></select></label><label className="text-xs text-slate-400">Categorie<input value={draft.category} onChange={(e) => setDraft((v) => ({ ...v, category: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></label><label className="text-xs text-slate-400 sm:col-span-2">Titlu<input value={draft.title} onChange={(e) => setDraft((v) => ({ ...v, title: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></label><label className="text-xs text-slate-400 sm:col-span-2">URL opțional<input value={draft.url} onChange={(e) => setDraft((v) => ({ ...v, url: e.target.value }))} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></label><label className="text-xs text-slate-400 sm:col-span-2">Descriere<textarea value={draft.description} onChange={(e) => setDraft((v) => ({ ...v, description: e.target.value }))} className="mt-1 min-h-24 w-full rounded-xl border border-white/10 bg-[#080d1c] px-3 py-2.5 text-sm" /></label></div><Button disabled={saving || !draft.title.trim()} onClick={() => void saveResource()}>{saving ? "Se salvează…" : "Adaugă în registru"}</Button></DialogContent></Dialog>
    </div>
  );
};
