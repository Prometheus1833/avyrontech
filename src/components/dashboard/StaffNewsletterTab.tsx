import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FilePenLine, Mail, Plus, RefreshCw, Search, Settings2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cfAuth } from "@/lib/cfAuth";

type Status = "pending" | "active" | "unsubscribed" | "suppressed";
type Subscriber = {
  id: string; email: string; name: string | null; language: "ro" | "en"; status: Status;
  source: string; interest: string | null; consent_policy_version: string; requested_at: number;
  confirmed_at: number | null; unsubscribed_at: number | null; updated_at: number;
};
type Settings = {
  enabled: number; prompt_enabled: number; delay_seconds: number; min_page_views: number; scroll_percent: number; cooldown_days: number;
  title_ro: string; title_en: string; body_ro: string; body_en: string; cta_ro: string; cta_en: string;
  frequency_ro: string; frequency_en: string; consent_policy_version: string; updated_at: number;
};
type Campaign = {
  id: string; name: string; language: "ro" | "en" | "all"; subject: string; preheader: string;
  content: string; status: "draft" | "ready" | "archived"; updated_at: number;
};
type ListResponse = { data: Subscriber[]; meta: { total: number; counts: Partial<Record<Status, number>> } };

const statusLabel: Record<Status, string> = { pending: "În confirmare", active: "Activ", unsubscribed: "Dezabonat", suppressed: "Suprimat" };
const statusTone: Record<Status, string> = {
  pending: "border-amber-300/20 bg-amber-400/10 text-amber-200",
  active: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
  unsubscribed: "border-slate-300/15 bg-slate-400/10 text-slate-300",
  suppressed: "border-rose-300/20 bg-rose-400/10 text-rose-200",
};

const emptyManual = { email: "", name: "", language: "ro", interest: "", consentEvidence: "" };
const emptyCampaign = { name: "", language: "ro", subject: "", preheader: "", content: "" };

export default function StaffNewsletterTab() {
  const [rows, setRows] = useState<Subscriber[]>([]);
  const [counts, setCounts] = useState<Partial<Record<Status, number>>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(emptyManual);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaign, setCampaign] = useState(emptyCampaign);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const suffix = new URLSearchParams({ ...(query.trim() ? { q: query.trim() } : {}), ...(status !== "all" ? { status } : {}) });
      const [list, settingResult, campaignResult] = await Promise.all([
        cfAuth.request<ListResponse>(`/api/newsletter/admin?${suffix}`),
        cfAuth.request<{ data: Settings }>("/api/newsletter/admin/settings"),
        cfAuth.request<{ data: Campaign[] }>("/api/newsletter/admin/campaigns"),
      ]);
      setRows(list.data); setCounts(list.meta.counts); setSettings(settingResult.data); setCampaigns(campaignResult.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Newsletterul nu a putut fi încărcat");
    } finally { setLoading(false); }
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query, status]);

  const total = useMemo(() => Object.values(counts).reduce((sum, value) => sum + (value || 0), 0), [counts]);

  const addSubscriber = async () => {
    setSaving(true);
    try {
      await cfAuth.request("/api/newsletter/admin/subscribers", {
        method: "POST", body: JSON.stringify({ ...manual, source: "manual-dashboard" }),
      });
      toast.success("Abonatul a fost adăugat împreună cu dovada consimțământului");
      setManual(emptyManual); setManualOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Abonatul nu a putut fi adăugat"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (subscriber: Subscriber, next: Status) => {
    const previous = subscriber.status;
    setRows((current) => current.map((row) => row.id === subscriber.id ? { ...row, status: next } : row));
    try {
      await cfAuth.request(`/api/newsletter/admin/subscribers/${subscriber.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success("Starea abonatului a fost actualizată");
      await load();
    } catch (error) {
      setRows((current) => current.map((row) => row.id === subscriber.id ? { ...row, status: previous } : row));
      toast.error(error instanceof Error ? error.message : "Starea nu a putut fi actualizată");
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { data } = await cfAuth.request<{ data: Settings }>("/api/newsletter/admin/settings", {
        method: "PATCH", body: JSON.stringify({ ...settings, enabled: Boolean(settings.enabled), prompt_enabled: Boolean(settings.prompt_enabled) }),
      });
      setSettings(data); toast.success("Configurarea newsletterului a fost salvată");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Configurarea nu a putut fi salvată"); }
    finally { setSaving(false); }
  };

  const createCampaign = async () => {
    setSaving(true);
    try {
      await cfAuth.request("/api/newsletter/admin/campaigns", { method: "POST", body: JSON.stringify(campaign) });
      toast.success("Draftul campaniei a fost creat"); setCampaign(emptyCampaign); setCampaignOpen(false); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Draftul nu a putut fi creat"); }
    finally { setSaving(false); }
  };

  const setCampaignStatus = async (item: Campaign, next: Campaign["status"]) => {
    try {
      await cfAuth.request(`/api/newsletter/admin/campaigns/${item.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success("Campania a fost actualizată"); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Campania nu a putut fi actualizată"); }
  };

  const exportSubscribers = async () => {
    try {
      const response = await cfAuth.requestResponse("/api/newsletter/admin/export.csv");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = `avyron-newsletter-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
      URL.revokeObjectURL(url);
      toast.success("Exportul include numai abonații activi și linkuri individuale de dezabonare");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Exportul nu a putut fi generat"); }
  };

  return <div className="space-y-5 text-slate-100">
    <header className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.16] via-[#10162a] to-cyan-400/[0.06] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-200/70">Creștere cu consimțământ</p><h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold"><Mail className="size-6 text-violet-300" /> Newsletter AVYRON</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Abonați confirmați, surse și interese, notificare inteligentă pe site, drafturi de campanie și export controlat.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void exportSubscribers()} className="border-white/10 bg-white/[0.04] text-slate-200"><Download /> Export activi</Button><Button onClick={() => setManualOpen(true)} className="bg-violet-600 hover:bg-violet-500"><Plus /> Abonat cu acord</Button></div>
      </div>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="Total în bază" value={total} />
      <Metric icon={CheckCircle2} label="Activi confirmați" value={counts.active || 0} accent />
      <Metric icon={Mail} label="În confirmare" value={counts.pending || 0} />
      <Metric icon={ShieldCheck} label="Dezabonați / suprimați" value={(counts.unsubscribed || 0) + (counts.suppressed || 0)} />
    </div>

    <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.055] p-3 text-xs leading-relaxed text-slate-300"><ShieldCheck className="mr-2 inline size-4 text-emerald-300" />Baza se îmbogățește prin formulare cu double opt-in și adăugări manuale numai când există dovada acordului. Adresele cumpărate sau colectate fără permisiune nu sunt acceptate.</div>

    <Tabs defaultValue="subscribers" className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-3 bg-white/[0.05] p-1 sm:w-auto"><TabsTrigger value="subscribers">Abonați</TabsTrigger><TabsTrigger value="prompt">Notificare site</TabsTrigger><TabsTrigger value="campaigns">Campanii</TabsTrigger></TabsList>

      <TabsContent value="subscribers" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută email, nume, interes sau sursă…" className="border-white/10 bg-white/[0.04] pl-9" /></label>
          <Select value={status} onValueChange={(value) => setStatus(value as Status | "all")}><SelectTrigger className="w-full border-white/10 bg-white/[0.04] sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toate stările</SelectItem>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={() => void load()} className="border-white/10 bg-white/[0.04]"><RefreshCw /> Actualizează</Button>
        </div>
        {loading ? <div className="h-52 animate-pulse rounded-2xl bg-white/[0.04]" /> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">Niciun abonat pentru filtrul curent.</div> : <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((subscriber) => <article key={subscriber.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{subscriber.name || subscriber.email.split("@")[0]}</p><a href={`mailto:${subscriber.email}`} className="block truncate text-xs text-violet-300 hover:underline">{subscriber.email}</a></div><Badge variant="outline" className={statusTone[subscriber.status]}>{statusLabel[subscriber.status]}</Badge></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Info label="Interes" value={subscriber.interest || "General"} /><Info label="Sursă" value={subscriber.source} /><Info label="Limbă" value={subscriber.language.toUpperCase()} /><Info label="Solicitat" value={new Date(subscriber.requested_at).toLocaleDateString("ro-RO")} /></div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3"><span className="truncate text-[10px] text-slate-600">Politică: {subscriber.consent_policy_version}</span><Select value={subscriber.status} onValueChange={(value) => void updateStatus(subscriber, value as Status)}><SelectTrigger className="h-8 w-40 border-white/10 bg-[#0d1324] text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabel).filter(([value]) => value !== "active" || subscriber.status === "active").map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          </article>)}
        </div>}
      </TabsContent>

      <TabsContent value="prompt">
        {settings && <Card className="border-white/[0.08] bg-white/[0.035] text-slate-100"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Settings2 className="size-5 text-violet-300" /> Comportament și conținut</CardTitle><p className="text-xs text-slate-500">Notificarea apare numai după o decizie privind cookie-urile, timp petrecut, navigare și derulare; cooldown-ul evită insistența.</p></CardHeader><CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2"><Toggle label="Înscrieri active" detail="API-ul acceptă solicitări noi." checked={Boolean(settings.enabled)} onChange={(value) => setSettings({ ...settings, enabled: Number(value) })} /><Toggle label="Notificare publică activă" detail="Poate apărea pe paginile eligibile." checked={Boolean(settings.prompt_enabled)} onChange={(value) => setSettings({ ...settings, prompt_enabled: Number(value) })} /></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><NumberField label="Întârziere (sec.)" value={settings.delay_seconds} min={10} max={600} onChange={(value) => setSettings({ ...settings, delay_seconds: value })} /><NumberField label="Pagini minime" value={settings.min_page_views} min={1} max={20} onChange={(value) => setSettings({ ...settings, min_page_views: value })} /><NumberField label="Derulare minimă (%)" value={settings.scroll_percent} min={10} max={95} onChange={(value) => setSettings({ ...settings, scroll_percent: value })} /><NumberField label="Pauză după afișare (zile)" value={settings.cooldown_days} min={1} max={365} onChange={(value) => setSettings({ ...settings, cooldown_days: value })} /></div>
          <div className="grid gap-4 xl:grid-cols-2">{(["ro", "en"] as const).map((lang) => <section key={lang} className="space-y-3 rounded-2xl border border-white/[0.08] p-4"><h3 className="font-medium">Conținut {lang.toUpperCase()}</h3><Field label="Titlu" value={settings[`title_${lang}`]} onChange={(value) => setSettings({ ...settings, [`title_${lang}`]: value })} /><Field label="Buton" value={settings[`cta_${lang}`]} onChange={(value) => setSettings({ ...settings, [`cta_${lang}`]: value })} /><Area label="Mesaj" value={settings[`body_${lang}`]} onChange={(value) => setSettings({ ...settings, [`body_${lang}`]: value })} /><Field label="Frecvență promisă" value={settings[`frequency_${lang}`]} onChange={(value) => setSettings({ ...settings, [`frequency_${lang}`]: value })} /></section>)}</div>
          <Field label="Versiune politică de consimțământ" value={settings.consent_policy_version} onChange={(value) => setSettings({ ...settings, consent_policy_version: value })} />
          <div className="flex justify-end"><Button disabled={saving} onClick={() => void saveSettings()} className="bg-violet-600 hover:bg-violet-500">{saving ? "Se salvează…" : "Salvează configurarea"}</Button></div>
        </CardContent></Card>}
      </TabsContent>

      <TabsContent value="campaigns" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Drafturi editoriale</h3><p className="text-xs text-slate-500">Pregătești conținutul și segmentul aici. Trimiterea în masă nu pornește din Workerul tranzacțional.</p></div><Button onClick={() => setCampaignOpen(true)} className="bg-violet-600 hover:bg-violet-500"><Plus /> Campanie nouă</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{campaigns.map((item) => <Card key={item.id} className="border-white/[0.08] bg-white/[0.035] text-slate-100"><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{item.name}</CardTitle><p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.subject}</p></div><Badge variant="outline">{item.status}</Badge></div></CardHeader><CardContent><p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400">{item.content}</p><div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3"><span className="text-[10px] text-slate-600">{item.language.toUpperCase()} · {new Date(item.updated_at).toLocaleDateString("ro-RO")}</span><Select value={item.status} onValueChange={(value) => void setCampaignStatus(item, value as Campaign["status"])}><SelectTrigger className="h-8 w-32 border-white/10 bg-[#0d1324] text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="ready">Pregătită</SelectItem><SelectItem value="archived">Arhivată</SelectItem></SelectContent></Select></div></CardContent></Card>)}{campaigns.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500 md:col-span-2">Nu există încă drafturi de campanie.</div>}</div>
      </TabsContent>
    </Tabs>

    <Dialog open={manualOpen} onOpenChange={setManualOpen}><DialogContent className="border-white/10 bg-[#0b1020] text-slate-100"><DialogHeader><DialogTitle>Adaugă un abonat cu acord documentat</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Email" type="email" value={manual.email} onChange={(value) => setManual({ ...manual, email: value })} /><Field label="Nume (opțional)" value={manual.name} onChange={(value) => setManual({ ...manual, name: value })} /><Field label="Interes" value={manual.interest} onChange={(value) => setManual({ ...manual, interest: value })} /><div className="space-y-1.5"><Label>Limbă</Label><Select value={manual.language} onValueChange={(value) => setManual({ ...manual, language: value })}><SelectTrigger className="border-white/10 bg-white/[0.04]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ro">Română</SelectItem><SelectItem value="en">English</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Area label="Dovada consimțământului" value={manual.consentEvidence} onChange={(value) => setManual({ ...manual, consentEvidence: value })} placeholder="Ex.: acord scris primit prin email la data…" /></div></div><DialogFooter><Button variant="outline" onClick={() => setManualOpen(false)}>Anulează</Button><Button disabled={saving} onClick={() => void addSubscriber()}>{saving ? "Se salvează…" : "Adaugă"}</Button></DialogFooter></DialogContent></Dialog>

    <Dialog open={campaignOpen} onOpenChange={setCampaignOpen}><DialogContent className="max-w-2xl border-white/10 bg-[#0b1020] text-slate-100"><DialogHeader><DialogTitle className="flex items-center gap-2"><FilePenLine className="size-5" /> Campanie nouă</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nume intern" value={campaign.name} onChange={(value) => setCampaign({ ...campaign, name: value })} /><div className="space-y-1.5"><Label>Limbă</Label><Select value={campaign.language} onValueChange={(value) => setCampaign({ ...campaign, language: value })}><SelectTrigger className="border-white/10 bg-white/[0.04]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ro">Română</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="all">Ambele</SelectItem></SelectContent></Select></div><div className="sm:col-span-2"><Field label="Subiect" value={campaign.subject} onChange={(value) => setCampaign({ ...campaign, subject: value })} /></div><div className="sm:col-span-2"><Field label="Preheader" value={campaign.preheader} onChange={(value) => setCampaign({ ...campaign, preheader: value })} /></div><div className="sm:col-span-2"><Area label="Conținut" value={campaign.content} onChange={(value) => setCampaign({ ...campaign, content: value })} rows={8} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCampaignOpen(false)}>Anulează</Button><Button disabled={saving} onClick={() => void createCampaign()}>{saving ? "Se salvează…" : "Creează draft"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

const Metric = ({ icon: Icon, label, value, accent = false }: { icon: typeof Mail; label: string; value: number; accent?: boolean }) => <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"><div className="flex items-center justify-between"><p className="text-xs text-slate-500">{label}</p><Icon className={`size-4 ${accent ? "text-emerald-300" : "text-violet-300"}`} /></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>;
const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-lg bg-white/[0.035] p-2"><p className="text-[9px] uppercase tracking-wide text-slate-600">{label}</p><p className="mt-0.5 truncate text-slate-300">{value}</p></div>;
const Field = ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="border-white/10 bg-white/[0.04]" /></div>;
const Area = ({ label, value, onChange, placeholder, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) => <div className="space-y-1.5"><Label>{label}</Label><Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="border-white/10 bg-white/[0.04]" /></div>;
const Toggle = ({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) => <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] p-3"><div><p className="text-sm font-medium">{label}</p><p className="text-[11px] text-slate-500">{detail}</p></div><Switch checked={checked} onCheckedChange={onChange} /></div>;
const NumberField = ({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) => <div className="space-y-1.5"><Label>{label}</Label><Input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="border-white/10 bg-white/[0.04]" /></div>;
