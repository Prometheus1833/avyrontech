import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Globe, CheckCircle2, AlertTriangle, Wrench, PauseCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type Site = {
  id: string;
  client_id: string | null;
  site_name: string;
  site_url: string;
  status: "healthy" | "needs_attention" | "in_progress" | "offline" | "paused";
  notes: string | null;
  last_check_at: string | null;
  next_check_at: string | null;
  created_at: string;
};

type Log = { id: string; action: string; details: string | null; author_id: string; created_at: string };

const statusMeta: Record<Site["status"], { label: string; icon: any; cls: string }> = {
  healthy: { label: "Funcțional", icon: CheckCircle2, cls: "bg-green-500/15 text-green-600" },
  needs_attention: { label: "Necesită atenție", icon: AlertTriangle, cls: "bg-orange-500/15 text-orange-600" },
  in_progress: { label: "În lucru", icon: Wrench, cls: "bg-primary/15 text-primary" },
  offline: { label: "Offline", icon: XCircle, cls: "bg-destructive/15 text-destructive" },
  paused: { label: "Pauzat", icon: PauseCircle, cls: "bg-muted text-muted-foreground" },
};

export const StaffMaintenanceTab = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<{ id: string; display_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [openSite, setOpenSite] = useState<Site | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logForm, setLogForm] = useState({ action: "", details: "" });
  const [form, setForm] = useState({ site_name: "", site_url: "", client_id: "", notes: "" });

  const load = async () => {
    setLoading(true);
    const [s, c] = await Promise.all([
      supabase.from("maintenance_sites").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,display_name"),
    ]);
    if (s.data) setSites(s.data as Site[]);
    if (c.data) setClients(c.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadLogs = async (id: string) => {
    const { data } = await supabase.from("maintenance_logs").select("*").eq("site_id", id).order("created_at", { ascending: false });
    if (data) setLogs(data as Log[]);
  };

  const handleCreate = async () => {
    if (!form.site_name || !form.site_url) return;
    const { error } = await supabase.from("maintenance_sites").insert({
      site_name: form.site_name, site_url: form.site_url,
      client_id: form.client_id || null, notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Site adăugat");
    setOpenCreate(false);
    setForm({ site_name: "", site_url: "", client_id: "", notes: "" });
    load();
  };

  const updateSite = async (id: string, patch: Partial<Site>) => {
    const { error } = await supabase.from("maintenance_sites").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
    if (openSite?.id === id) setOpenSite({ ...openSite, ...patch } as Site);
  };

  const addLog = async () => {
    if (!logForm.action.trim() || !openSite || !user) return;
    const { error } = await supabase.from("maintenance_logs").insert({
      site_id: openSite.id, author_id: user.id,
      action: logForm.action, details: logForm.details || null,
    });
    if (error) return toast.error(error.message);
    await updateSite(openSite.id, { last_check_at: new Date().toISOString() });
    setLogForm({ action: "", details: "" });
    loadLogs(openSite.id);
  };

  const clientName = (id: string | null) => id ? (clients.find(c => c.id === id)?.display_name || "—") : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" />Adaugă site</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Site nou pentru mentenanță</DialogTitle><DialogDescription>Site live aflat în mentenanța Avyron.</DialogDescription></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nume site *</Label><Input value={form.site_name} onChange={e => setForm({ ...form, site_name: e.target.value })} /></div>
              <div><Label>URL *</Label><Input type="url" placeholder="https://…" value={form.site_url} onChange={e => setForm({ ...form, site_url: e.target.value })} /></div>
              <div>
                <Label>Client</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.display_name || c.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Note</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Adaugă</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> :
        sites.length === 0 ? <Card><CardContent className="p-8 text-center text-muted-foreground">Niciun site în mentenanță.</CardContent></Card> :
        <div className="grid gap-3 md:grid-cols-2">
          {sites.map(s => {
            const M = statusMeta[s.status];
            return (
              <Card key={s.id} className="cursor-pointer hover:border-primary transition" onClick={() => { setOpenSite(s); loadLogs(s.id); }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Globe className="size-4" />{s.site_name}</CardTitle>
                    <Badge className={M.cls} variant="outline"><M.icon className="size-3 mr-1" />{M.label}</Badge>
                  </div>
                  <CardDescription className="truncate">{s.site_url}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground pt-0 space-y-1">
                  <p>Client: {clientName(s.client_id)}</p>
                  {s.last_check_at && <p>Ultim check: {format(new Date(s.last_check_at), "dd MMM yyyy HH:mm")}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      }

      <Dialog open={!!openSite} onOpenChange={o => { if (!o) setOpenSite(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {openSite && <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Globe className="size-5" />{openSite.site_name}</DialogTitle>
              <DialogDescription>
                <a href={openSite.site_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  {openSite.site_url} <ExternalLink className="size-3" />
                </a>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={openSite.status} onValueChange={v => updateSite(openSite.id, { status: v as Site["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusMeta).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-sm">Client: <strong>{clientName(openSite.client_id)}</strong></p>
              {openSite.notes && <div><Label className="text-xs">Note</Label><p className="text-sm whitespace-pre-wrap p-3 bg-muted/50 rounded-md">{openSite.notes}</p></div>}

              <div>
                <Label className="text-xs">Adaugă intervenție</Label>
                <div className="space-y-2 mt-2">
                  <Input placeholder="Acțiune (ex: Update WordPress)" value={logForm.action} onChange={e => setLogForm({ ...logForm, action: e.target.value })} />
                  <Textarea placeholder="Detalii (opțional)" value={logForm.details} onChange={e => setLogForm({ ...logForm, details: e.target.value })} rows={2} />
                  <Button size="sm" onClick={addLog}>Înregistrează intervenție</Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Istoric ({logs.length})</Label>
                <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
                  {logs.map(l => (
                    <div key={l.id} className="text-sm p-2 bg-muted/40 rounded">
                      <p className="font-medium">{l.action}</p>
                      {l.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{l.details}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(l.created_at), "dd MMM yyyy HH:mm")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
};
