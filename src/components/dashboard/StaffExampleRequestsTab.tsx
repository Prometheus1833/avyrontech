import { useEffect, useMemo, useState } from "react";
import { cfAuth } from "@/lib/cfAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageCircle, Copy, ExternalLink, Search, Columns3, List } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  email: string;
  phone: string;
  source_slug: string | null;
  source_category: string | null;
  source_name: string | null;
  user_agent: string | null;
  status: Status;
  delivery_status: string;
  created_at: number;
};

type Status = "new" | "contacted" | "completed" | "spam";
const stages: Array<{ id: Status; label: string }> = [
  { id: "new", label: "Nou" },
  { id: "contacted", label: "Contactat" },
  { id: "completed", label: "Finalizat" },
  { id: "spam", label: "Spam" },
];

const timeAgo = (timestamp: number) => {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60) return `acum ${s}s`;
  if (s < 3600) return `acum ${Math.floor(s / 60)} min`;
  if (s < 86400) return `acum ${Math.floor(s / 3600)} h`;
  return new Date(timestamp).toLocaleString("ro-RO");
};

const waLink = (phone: string, name?: string | null) => {
  const digits = phone.replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Bună ziua! Vă contactăm de la Avyron în legătură cu solicitarea unui exemplu personalizat${name ? ` similar cu ${name}` : ""}.`
  );
  return `https://wa.me/${digits}?text=${msg}`;
};

const copy = async (txt: string, label: string) => {
  try {
    await navigator.clipboard.writeText(txt);
    toast.success(`${label} copiat`);
  } catch {
    toast.error("Nu am putut copia");
  }
};

export const StaffExampleRequestsTab = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [busyId, setBusyId] = useState<string | null>(null);

  const updateStatus = async (row: Row, status: Status) => {
    if (row.status === status || busyId) return;
    setBusyId(row.id);
    try {
      await cfAuth.request(`/api/example-requests/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, status } : item));
      toast.success("Stadiul solicitării a fost actualizat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Stadiul nu a putut fi actualizat.");
    } finally {
      setBusyId(null);
    }
  };

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await cfAuth.request<{ data: Row[] }>("/api/example-requests");
      setRows(response.data);
    } catch {
      if (showLoading) toast.error("Eroare la încărcare");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(false), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      [r.email, r.phone, r.source_name, r.source_slug, r.source_category]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(needle))
    );
  }, [rows, q]);

  const today = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return rows.filter((r) => r.created_at >= start.getTime()).length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/10 to-cyan-400/[0.05] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">Pipeline comercial</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-white">Solicitări demo</h1>
        <p className="mt-2 text-sm text-slate-400">Urmărește cererile de la preluare până la finalizare. Linkurile de contact pregătesc mesajul; trimiterea se face separat.</p>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1">
              <MessageCircle className="size-3" /> Total solicitări
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Azi</CardTitle></CardHeader>
          <CardContent className="pt-0"><div className="text-2xl font-bold text-brand">{today}</div></CardContent>
        </Card>
        <Card className="hidden md:block">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">Surse unice</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{new Set(rows.map((r) => r.source_slug)).size}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          aria-label="Caută solicitări demo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după email, telefon, sursă…"
          className="pl-9"
        />
      </div>

      <div className="flex gap-2" aria-label="Afișare solicitări">
        <Button type="button" size="sm" variant={view === "pipeline" ? "default" : "outline"} aria-pressed={view === "pipeline"} onClick={() => setView("pipeline")}><Columns3 className="mr-1.5 size-4" />Pipeline</Button>
        <Button type="button" size="sm" variant={view === "list" ? "default" : "outline"} aria-pressed={view === "list"} onClick={() => setView("list")}><List className="mr-1.5 size-4" />Listă</Button>
      </div>

      {!loading && view === "pipeline" && <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4" aria-label="Pipeline solicitări demo">
        {stages.map((stage) => {
          const items = filtered.filter((row) => row.status === stage.id);
          return <section key={stage.id} aria-label={stage.label} className="min-w-0 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
            <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-white">{stage.label}<span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs text-violet-200">{items.length}</span></h2>
            <div className="space-y-2">{items.map((row) => <article key={row.id} className="min-w-0 rounded-xl border border-white/[0.08] bg-[#111829] p-3 text-slate-100">
              <h3 className="truncate text-sm font-medium">{row.source_name || row.source_slug || "Exemplu personalizat"}</h3>
              <p className="mt-1 text-xs text-slate-400">{timeAgo(row.created_at)}</p>
              <a href={`mailto:${row.email}`} className="mt-2 block break-all text-xs text-violet-200 hover:underline">{row.email}</a>
              <a href={`tel:${row.phone.replace(/\s/g, "")}`} className="mt-1 block text-xs text-violet-200 hover:underline">{row.phone}</a>
              <label className="mt-3 block text-xs text-slate-400">Stadiu<select aria-label={`Stadiu pentru ${row.email}`} value={row.status} disabled={busyId === row.id} onChange={(event) => void updateStatus(row, event.target.value as Status)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#0b1020] px-2 py-2 text-sm text-slate-100">{stages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
            </article>)}{items.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-500">Nicio cerere în acest stadiu.</p>}</div>
          </section>;
        })}
      </div>}

      {view === "list" && <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="size-4" /> Solicitări demo („vrei să vezi cum ar arăta site-ul tău?")
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Se încarcă…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio solicitare deocamdată.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((r) => (
                <li key={r.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.source_name && (
                          <Badge variant="secondary" className="font-medium">{r.source_name}</Badge>
                        )}
                        {r.source_category && (
                          <Badge variant="outline" className="text-xs">{r.source_category}</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <button
                          onClick={() => copy(r.email, "Email")}
                          className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-brand transition-colors"
                          title="Copiază email"
                        >
                          <Mail className="size-3.5" />{r.email}
                          <Copy className="size-3 opacity-50" />
                        </button>
                        <button
                          onClick={() => copy(r.phone, "Telefon")}
                          className="inline-flex items-center gap-1.5 font-mono text-foreground hover:text-brand transition-colors"
                          title="Copiază telefon"
                        >
                          <Phone className="size-3.5" />{r.phone}
                          <Copy className="size-3 opacity-50" />
                        </button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant={r.delivery_status === "sent" ? "secondary" : "destructive"}>Email: {r.delivery_status}</Badge>
                        <label className="text-xs text-muted-foreground">Stadiu <select aria-label={`Stadiu pentru ${r.email}`} value={r.status} disabled={busyId === r.id} onChange={(event) => void updateStatus(r, event.target.value as Status)} className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground">{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <a href={`mailto:${r.email}?subject=${encodeURIComponent("Avyron — exemplu personalizat")}`}>
                          <Mail className="size-3.5 mr-1.5" /> Email
                        </a>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <a href={`tel:${r.phone.replace(/\s/g, "")}`}>
                          <Phone className="size-3.5 mr-1.5" /> Sună
                        </a>
                      </Button>
                      <Button asChild size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <a href={waLink(r.phone, r.source_name)} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-3.5 mr-1.5" /> WhatsApp
                          <ExternalLink className="size-3 ml-1 opacity-70" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>}
    </div>
  );
};
