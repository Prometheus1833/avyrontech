import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { internApi, type BannerStatus, type ProjectKind } from "@/lib/internApi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ExternalLink, FolderKanban, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ContactRail from "@/components/intern/ContactRail";

type Row = {
  id: string; slug: string; name: string; kind: ProjectKind;
  banner_status: BannerStatus; url: string | null; favicon_url: string | null; updated_at: number;
};

const BANNER: Record<BannerStatus, { label: string; cls: string }> = {
  online:      { label: "Online / Finalizat", cls: "bg-green-500/15 text-green-600 dark:text-green-400" },
  testing:     { label: "Testare",             cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  in_progress: { label: "În dezvoltare",       cls: "bg-primary/15 text-primary" },
  revizuire:   { label: "Revizuire",           cls: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  offline:     { label: "Offline",             cls: "bg-muted text-muted-foreground" },
};

const KINDS: { value: ProjectKind; label: string }[] = [
  { value: "website_prezentare",  label: "Website prezentare" },
  { value: "prezentare_premium",  label: "Prezentare premium" },
  { value: "magazin_online",      label: "Magazin online" },
  { value: "retele_sociale",      label: "Rețele sociale" },
  { value: "identitate_completa", label: "Identitate completă" },
  { value: "aplicatie",           label: "Aplicație" },
];

export default function InternHome() {
  const { user, isStaff, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", kind: "website_prezentare" as ProjectKind, url: "", description: "", client_id: "", owner_user_id: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await internApi.listProjects();
      setRows(res.data as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };
  useEffect(() => { if (user) void load(); }, [user]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.client_id.trim()) {
      toast.error("Nume, slug și client ID sunt obligatorii");
      return;
    }
    setCreating(true);
    try {
      await internApi.createProject({
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        kind: form.kind,
        url: form.url || undefined,
        description: form.description || undefined,
        client_id: form.client_id.trim(),
        owner_user_id: form.owner_user_id.trim() || undefined,
      });
      toast.success("Proiect creat");
      setOpenCreate(false);
      setForm({ name: "", slug: "", kind: "website_prezentare", url: "", description: "", client_id: "", owner_user_id: "" });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setCreating(false); }
  };

  if (authLoading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Se încarcă…</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FolderKanban className="size-5 text-primary" />
            {isStaff ? "Platformă internă — Proiecte" : "Proiectele mele"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isStaff
              ? "Toate proiectele Avyron. Dă click pe unul pentru detalii, propuneri și linkuri."
              : "Aici vezi proiectele tale, statusul lor și poți propune modificări."}
          </p>
        </div>

        {isStaff && (
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <button className="group relative inline-flex items-center gap-2.5 rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition-all hover:bg-zinc-900 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] hover:scale-[1.02] active:scale-[0.98] dark:bg-white dark:text-zinc-950 dark:ring-zinc-900/10 dark:hover:bg-zinc-100">
                <span className="relative flex size-5 items-center justify-center rounded-full bg-white/10 dark:bg-zinc-950/10">
                  <Plus className="size-3.5" strokeWidth={2.5} />
                </span>
                <span>Creează proiect</span>
                <ArrowUpRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> Proiect nou</DialogTitle>
                <DialogDescription>Slug-ul apare în URL: <code>/intern/projects/&lt;slug&gt;</code>.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Nume *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Clar Lumânări" /></div>
                <div><Label>Slug * (fără spații)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="clarlumanari" /></div>
                <div>
                  <Label>Tip</Label>
                  <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ProjectKind })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>URL live</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://clarlumanari.ro" /></div>
                <div><Label>Descriere</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Client ID *</Label><Input value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} placeholder="uuid client din tabela clients" /></div>
                <div><Label>Owner user ID (clientul cu cont)</Label><Input value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })} placeholder="uuid utilizator" /></div>
                <p className="text-[11px] text-muted-foreground">💡 Poți obține ID-urile din backend sau din pagina de clienți. Dacă e primul proiect, rulează endpoint-ul <code>/api/admin/seed</code>.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenCreate(false)}>Anulează</Button>
                <Button onClick={handleCreate} disabled={creating}>{creating ? "Se creează…" : "Creează"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {loading ? (
        <div className="text-sm text-muted-foreground">Se încarcă proiectele…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {isStaff ? "Nu există proiecte încă. Folosește butonul „Creează proiect”." : "Nu ai încă proiecte asignate. Vei fi anunțat când unul e disponibil."}
        </CardContent></Card>
      ) : (
        <>
          {/* Client hero-banner: statusul proiectului lor principal (primul) */}
          {!isStaff && rows[0] && (() => {
            const p = rows[0];
            const B = BANNER[p.banner_status] ?? BANNER.in_progress;
            return (
              <Link
                to={`/intern/projects/${p.slug}`}
                className={`block rounded-2xl border-2 p-5 sm:p-6 transition hover:shadow-lg ${B.cls}`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
                  <span className="size-2 rounded-full bg-current animate-pulse" />
                  Status proiect
                </div>
                <p className="mt-1 text-3xl sm:text-4xl font-semibold">{B.label}</p>
                <p className="mt-2 text-sm opacity-90">{p.name} · dă click pentru detalii, propuneri și abonament</p>
              </Link>
            );
          })()}

          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((p) => {
              const B = BANNER[p.banner_status] ?? BANNER.in_progress;
              return (
                <Link key={p.id} to={`/intern/projects/${p.slug}`} className="group rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-md transition">
                  <div className="flex items-start gap-3">
                    {p.favicon_url ? (
                      <img src={p.favicon_url} alt="" className="size-8 rounded-md border bg-background object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                    ) : (
                      <div className="size-8 rounded-md border bg-muted grid place-items-center text-[10px] text-muted-foreground">{p.slug.slice(0, 2).toUpperCase()}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate group-hover:text-primary">{p.name}</h3>
                        <Badge variant="secondary" className={B.cls}>{B.label}</Badge>
                      </div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                          {p.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                        </a>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">Actualizat {new Date(p.updated_at).toLocaleDateString("ro-RO")}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <ContactRail />
    </div>
  );
}
