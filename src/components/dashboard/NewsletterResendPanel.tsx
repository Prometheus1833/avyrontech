import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Settings2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cfAuth } from "@/lib/cfAuth";
import {
  NEWSLETTER_STAGES,
  newsletterStage,
  type NewsletterOperations,
  type NewsletterOperationCampaign,
} from "@/shared/newsletterOperations";
const stamp = (v: number | null | undefined) =>
  v ? new Date(v).toLocaleString("ro-RO") : "Neconfirmat";
const panel = "rounded-2xl border border-white/10 bg-white/[.025] p-4";
export default function NewsletterResendPanel({
  onCampaigns,
  onSyncContacts,
}: {
  onCampaigns: () => void;
  onSyncContacts: () => Promise<void>;
}) {
  const [data, setData] = useState<NewsletterOperations | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [stage, setStage] = useState("all"),
    [editing, setEditing] = useState<NewsletterOperationCampaign | null>(null),
    [assigned, setAssigned] = useState("none");
  const alive = useRef(true),
    sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await cfAuth.request<NewsletterOperations>(
        "/api/newsletter/admin/operations",
      );
      if (alive.current && seq === sequence.current) setData(result);
    } catch (e) {
      if (alive.current && seq === sequence.current)
        setError(e instanceof Error ? e.message : "Resend nu poate fi citit.");
    } finally {
      if (alive.current && seq === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  const reconcile = async (campaignId?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await cfAuth.request<{
        data: { id: string; status: string; error?: string }[];
        more: boolean;
      }>("/api/newsletter/admin/operations/reconcile", {
        method: "POST",
        body: JSON.stringify({ campaignId }),
      });
      const errors = r.data.filter((c) => c.error || c.status === "conflict");
      if (errors.length)
        toast.error(
          errors[0].error ||
            "Campania s-a schimbat. Reîncarcă înainte de resincronizare.",
        );
      else
        toast.success(
          `${r.data.length} stări confirmate prin API Resend${r.more ? "; există campanii suplimentare" : ""}.`,
        );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Citirea Resend a eșuat.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const saveAssignment = async () => {
    if (!editing || busy) return;
    setBusy(true);
    try {
      await cfAuth.request(
        `/api/newsletter/admin/campaigns/${encodeURIComponent(editing.id)}/assignment`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userId: assigned === "none" ? null : assigned,
            revision: editing.operations_revision,
          }),
        },
      );
      setEditing(null);
      await load();
      toast.success("Responsabilul campaniei a fost salvat.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Alocarea nu a fost salvată.",
      );
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const work = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onSyncContacts();
      await load();
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  if (!data)
    return (
      <section className={panel}>
        {error ? (
          <div role="alert" className="space-y-3">
            <p>{error}</p>
            <Button onClick={() => void load()}>Reîncearcă</Button>
          </div>
        ) : (
          <p role="status">Se citesc datele Resend…</p>
        )}
      </section>
    );
  const eventCount = (type: string) =>
    data.events.length
      ? data.events.find((e) => e.event_type === type)?.events || 0
      : "—";
  const counts = data.campaigns.reduce<Record<string, number>>((out, c) => {
    const k = newsletterStage(c);
    out[k] = (out[k] || 0) + 1;
    return out;
  }, {});
  const visible = data.campaigns.filter(
    (c) =>
      (stage === "all" || newsletterStage(c) === stage) &&
      `${c.name} ${c.subject} ${c.assigned_name || ""}`
        .toLocaleLowerCase("ro")
        .includes(query.trim().toLocaleLowerCase("ro")),
  );
  return (
    <section className="space-y-4" aria-label="Resend · operațiuni newsletter">
      <header className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">
              Resend · centru de livrare
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
              Campanii, sincronizare și responsabilități în registrul existent.
              Statisticile de mai jos provin din webhookurile verificate primite
              în ultimele {data.periodDays} zile; nu reprezintă toate datele din
              contul Resend.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className="mr-2 size-4" />
            Actualizează
          </Button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Cheie API", data.provider.apiKey],
            ["Segment marketing", data.provider.segment],
            ["Expeditor", data.provider.sender],
            ["Secret webhook", data.provider.webhook],
          ].map(([name, ok]) => (
            <div
              key={String(name)}
              className="rounded-xl border border-white/10 p-2 text-xs"
            >
              <span className="block text-slate-400">{String(name)}</span>
              <strong className={ok ? "text-cyan-200" : "text-amber-200"}>
                {ok ? "Configurat" : "Neconfigurat"}
              </strong>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
          <p>
            Ultimul webhook primit:{" "}
            <span className="text-slate-200">{stamp(data.lastWebhook)}</span>
          </p>
          <p>
            Sincronizare contacte:{" "}
            <span className="text-slate-200">
              {stamp(data.contacts.lastSync)}
            </span>
          </p>
          <a
            href="https://resend.com/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-violet-200 underline"
          >
            Cont și limite Resend
            <ExternalLink className="size-3" />
          </a>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-amber-200">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy || !data.provider.configured}
            onClick={() => void reconcile()}
          >
            Verifică stările la Resend
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              busy || !data.provider.configured || !data.contacts.awaitingSync
            }
            onClick={() => void work()}
          >
            Sincronizează contacte · {data.contacts.awaitingSync || 0}
          </Button>
          <Button size="sm" variant="outline" onClick={onCampaigns}>
            Deschide campaniile
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[
          ["Activi în baza locală", data.contacts.active || 0],
          ["Sincronizări cu erori", data.contacts.errors || 0],
          ["Livrări observate", eventCount("email.delivered")],
          ["Deschideri observate", eventCount("email.opened")],
        ].map(([label, value]) => (
          <div key={String(label)} className={panel}>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className={panel}>
        <h4 className="text-sm font-semibold">Pipeline campanii</h4>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={stage === "all" ? "default" : "outline"}
            onClick={() => setStage("all")}
          >
            Toate · {data.campaigns.length}
          </Button>
          {Object.entries(NEWSLETTER_STAGES).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={stage === key ? "default" : "outline"}
              onClick={() => setStage(key)}
            >
              {label} · {counts[key] || 0}
            </Button>
          ))}
        </div>
        <Input
          aria-label="Caută campanie Resend"
          placeholder="Campanie, subiect sau responsabil…"
          className="mt-3 min-h-11 text-base sm:text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-3 grid items-start gap-2 lg:grid-cols-2">
          {visible.map((c) => (
            <article
              key={c.id}
              className="min-w-0 rounded-xl border border-white/10 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h5 className="break-words text-sm font-semibold">{c.name}</h5>
                <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200">
                  {c.provider_raw_status === "canceled"
                    ? "Anulată"
                    : NEWSLETTER_STAGES[
                        newsletterStage(c) as keyof typeof NEWSLETTER_STAGES
                      ] || c.provider_status}
                </span>
              </div>
              <p className="mt-1 break-words text-xs text-slate-400">
                {c.subject}
              </p>
              <p className="mt-2 text-xs">
                Responsabil: {c.assigned_name || "Nealocat"}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                API confirmat: {stamp(c.provider_checked_at)}
                {c.scheduled_at
                  ? ` · Programată: ${stamp(c.scheduled_at)}`
                  : ""}
              </p>
              {c.provider_error && (
                <p className="mt-2 text-xs text-amber-200">
                  {c.provider_error}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(c);
                    setAssigned(c.assigned_user_id || "none");
                  }}
                >
                  <Settings2 className="mr-1 size-3.5" />
                  Alocă responsabil
                </Button>
                {c.provider_broadcast_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !data.provider.configured}
                    onClick={() => void reconcile(c.id)}
                  >
                    Sincronizează starea
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!visible.length && (
          <p className="mt-3 text-sm text-slate-400">
            Nicio campanie pentru selecția curentă.
          </p>
        )}
        <p className="mt-2 text-[11px] text-slate-500">
          Cele mai recente 200 de campanii. O campanie în coadă sau programată
          nu este declarată livrată.
        </p>
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <section className={panel}>
          <h4 className="text-sm font-semibold">
            Segmente locale · abonați confirmați
          </h4>
          <p className="mt-1 text-xs text-slate-400">
            Interese și limbă pentru planificare. Segmentul destinatar se
            confirmă în campania Resend.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.interests.map((i, n) => (
              <span
                key={n}
                className="rounded-lg border border-white/10 px-2 py-1 text-xs"
              >
                {i.interest} · {i.language.toUpperCase()} · {i.total}
              </span>
            ))}
            {!data.interests.length && (
              <p className="text-xs text-slate-400">Niciun abonat confirmat.</p>
            )}
          </div>
        </section>
        <section className={panel}>
          <h4 className="text-sm font-semibold">Feedback verificat</h4>
          <dl className="mt-2 space-y-2">
            {data.events.map((e) => (
              <div
                key={e.event_type}
                className="flex flex-wrap justify-between gap-2 text-xs"
              >
                <dt>{e.event_type}</dt>
                <dd className="text-slate-400">
                  {e.events} evenimente · {e.recipients} destinatari
                  identificați
                </dd>
              </div>
            ))}
          </dl>
          {!data.events.length && (
            <p className="mt-2 text-xs text-slate-400">
              Nu există evenimente verificate în perioada afișată.
            </p>
          )}
        </section>
      </div>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!busy && !open) setEditing(null);
        }}
      >
        <DialogContent className="border-white/15 bg-[#10162a] text-slate-100">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle>Responsabil campanie</DialogTitle>
            <DialogDescription>
              {editing?.name}. Alocarea organizează activitatea; drepturile
              existente ale membrului rămân verificate separat.
            </DialogDescription>
          </DialogHeader>
          <label className="block text-sm">
            Membru staff
            <Select value={assigned} onValueChange={setAssigned}>
              <SelectTrigger
                aria-label="Responsabil newsletter"
                className="mt-1 min-h-11"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nealocat</SelectItem>
                {data.staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button disabled={busy} onClick={() => void saveAssignment()}>
            {busy ? "Se salvează…" : "Salvează alocarea"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
