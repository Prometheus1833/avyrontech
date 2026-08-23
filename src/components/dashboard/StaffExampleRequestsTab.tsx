import { useEffect, useMemo, useState } from "react";
import { cfAuth } from "@/lib/cfAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Phone, MessageCircle, Copy, ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  email: string;
  phone: string;
  source_slug: string | null;
  source_category: string | null;
  source_name: string | null;
  user_agent: string | null;
  status: string;
  delivery_status: string;
  created_at: number;
};

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
    const interval = window.setInterval(() => void load(false), 60_000);
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după email, telefon, sursă…"
          className="pl-9"
        />
      </div>

      <Card>
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
                        <Badge variant="outline">{r.status}</Badge>
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
      </Card>
    </div>
  );
};
