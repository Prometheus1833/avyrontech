import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { aiProjectsApi } from "@/lib/aiProjectsApi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export default function CreateAiProject() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", summary: "", objective: "visibility" });
  const key = useRef(crypto.randomUUID());
  const field = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
  return <>
    <Button onClick={() => setOpen(true)}><Plus className="size-4" />Creează proiect AI</Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Creează proiect AI</DialogTitle><DialogDescription>Adaugă proiectul în portofoliul agenției. Configurezi apoi echipa, agenții și canalele; proiectul pornește în configurare, cu aprobare umană.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault(); if (busy) return; setBusy(true); setError("");
          try { const result = await aiProjectsApi.create(form, key.current); key.current = crypto.randomUUID(); setOpen(false); navigate(`/intern/ai-projects/${encodeURIComponent(result.slug)}`); }
          catch (e) { setError((e as Error).message); } finally { setBusy(false); }
        }}>
          <label className="block space-y-1 text-sm"><span>Nume proiect AI *</span><input className={field} required maxLength={180} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <label className="block space-y-1 text-sm"><span>Obiectiv</span><select className={field} value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}>{[["visibility","Vizibilitate"],["sales","Vânzări"],["promotion","Promovare"],["monetization","Monetizare"],["community","Comunitate"]].map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="block space-y-1 text-sm"><span>Descriere și context</span><textarea className={field} rows={4} maxLength={2000} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Renunță</Button><Button disabled={busy || !form.name.trim()}>{busy ? "Se creează…" : "Creează proiectul AI"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
