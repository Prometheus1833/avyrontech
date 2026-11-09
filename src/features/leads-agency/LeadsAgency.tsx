import {
  cloneElement,
  useId,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Download,
  FileText,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Wallet,
  Clock3,
  Archive,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  leadsAgencyApi,
  type AgencyBootstrap,
  type AgencyDetail,
} from "@/lib/leadsAgencyApi";
import {
  AGENCY_CATEGORY_LABELS,
  agencyPlatform,
  type AgencyPlatform,
} from "@/shared/agency/catalog";
import {
  AGENCY_STAGES,
  AGENCY_STATUSES,
  AGENCY_CHECKS,
  emptyChecks,
  agencyToday,
  safeAgencyUrl,
  opportunityInput,
  agencyValidationMessage,
  platformInput,
  entryInput,
  agencyMargin,
  type AgencyAccount,
  type AgencyOpportunity,
  type OpportunityInput,
  type PlatformInput,
  type AgencyEntryInput,
  type AgencyReport,
} from "@/shared/agency/model";

const money = (amount: number | null, code = "RON") =>
  amount === null
    ? "Neconfirmat"
    : new Intl.NumberFormat("ro-RO", {
        style: "currency",
        currency: code,
      }).format(amount / 100);
const date = (v: number | string | null) =>
  v ? new Date(v).toLocaleDateString("ro-RO") : "—";
const stamp = (v: number) => new Date(v).toLocaleString("ro-RO");
const inputMoney = (v: number | null) =>
  v === null ? "" : (v / 100).toFixed(2);
const readMinor = (v: string) => {
  if (!v.trim()) return null;
  const s = v.replace(",", ".");
  if (!/^\d+(?:\.\d{0,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
};
const err = (e: unknown) =>
  e instanceof Error ? e.message : "Operația nu a putut fi finalizată.";
const actions: Record<string, string> = {
  "platform.saved": "Fișă actualizată",
  "opportunity.created": "Oportunitate înregistrată",
  "opportunity.updated": "Date / etapă actualizate",
  "opportunity.archived": "Arhivat",
  "opportunity.restored": "Restaurat",
  "lead.transferred": "Transfer în Leads",
  "entry.recorded": "Activitate consemnată",
  "entry.voided": "Înregistrare anulată",
};
function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const flight = useRef(false),
    keys = useRef(new Map<string, string>());
  const run = async (
    label: string,
    payload: unknown,
    work: (key: string) => Promise<void>,
  ) => {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError("");
    const fingerprint = label + JSON.stringify(payload);
    const key = keys.current.get(fingerprint) || crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      await work(key);
      keys.current.delete(fingerprint);
    } catch (e) {
      setError(err(e));
    } finally {
      flight.current = false;
      setBusy(false);
    }
  };
  return { busy, error, run };
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 content-start gap-2 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-describedby": hint ? `${id}-hint` : undefined,
      })}
      {hint && (
        <span
          id={`${id}-hint`}
          className="text-xs font-normal leading-relaxed text-muted-foreground"
        >
          {hint}
        </span>
      )}
    </div>
  );
}
function Choice({
  id,
  "aria-describedby": describedBy,
  value,
  onChange,
  options,
  placeholder = "Selectează",
  disabled = false,
}: {
  id?: string;
  "aria-describedby"?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || "__none"}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-describedby={describedBy}
        className="min-h-11 rounded-xl bg-background/60 text-left"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value="__none">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function ErrorBox({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm leading-relaxed"
    >
      {message}
    </p>
  ) : null;
}
const badge =
  "inline-flex max-w-full items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium";
const panel = "rounded-2xl border border-border/70 bg-card/70 p-4 sm:p-5";
function External({
  url,
  children,
}: {
  url: string | null;
  children: ReactNode;
}) {
  return url && safeAgencyUrl(url) ? (
    <a
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={13} />
      <span className="sr-only"> · tab nou</span>
    </a>
  ) : (
    <span className="inline-flex min-h-10 items-center rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
      {children} · neconfirmat
    </span>
  );
}
function PlatformCard({
  platform,
  account,
  onOpen,
}: {
  platform: AgencyPlatform;
  account: AgencyAccount;
  onOpen: () => void;
}) {
  return (
    <article
      className={`${panel} flex min-w-0 flex-col gap-3 transition-colors hover:border-primary/35`}
    >
      <div className="flex items-start gap-3">
        <img
          src={`/agency-platforms/${platform.id}.png`}
          width="40"
          height="40"
          alt=""
          className="size-10 shrink-0 rounded-xl border border-border bg-white object-contain p-1"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{platform.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {platform.mode === "inbound"
              ? "Solicitări inbound"
              : platform.mode === "network"
                ? "Rețea / invitații B2B"
                : "Cereri accesibile direct"}
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {platform.description}
      </p>
      <div className="flex flex-wrap gap-2">
        <span className={badge}>{AGENCY_STATUSES[account.status]}</span>
        <span className={badge}>
          {account.category === "free"
            ? "Fără plată inițială"
            : AGENCY_CATEGORY_LABELS[account.category]}
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-xs text-muted-foreground">
          {account.opportunityCount} oportunități · {account.wonCount} câștigate
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0 rounded-lg"
          onClick={onOpen}
          aria-label={`Deschide fișa ${platform.name}`}
        >
          Deschide fișa
        </Button>
      </div>
    </article>
  );
}
const accountDraft = (a: AgencyAccount): PlatformInput => ({
  revision: a.revision,
  status: a.status,
  category: a.category,
  profileUrl: a.profileUrl,
  ownerId: a.ownerId,
  notes: a.notes,
  nextReview: a.nextReview,
  checks: { ...a.checks },
  verificationNote: a.verificationNote,
  evidenceUrls: [...a.evidenceUrls],
});
function PlatformSheet({
  platform,
  account,
  boot,
  onClose,
  onSaved,
}: {
  platform: AgencyPlatform;
  account: AgencyAccount;
  boot: AgencyBootstrap;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => accountDraft(account)),
    [evidence, setEvidence] = useState(account.evidenceUrls.join("\n")),
    [history, setHistory] = useState<
      {
        id: string;
        action: string;
        created_at: number;
        metadata_json?: string;
      }[]
    >([]),
    [historyError, setHistoryError] = useState("");
  const action = useAction();
  useEffect(() => {
    const ctl = new AbortController();
    void leadsAgencyApi
      .history(platform.id, ctl.signal)
      .then((r) => setHistory(r.data))
      .catch((e) => {
        if (!ctl.signal.aborted) setHistoryError(err(e));
      });
    return () => ctl.abort();
  }, [platform.id]);
  const update = <K extends keyof PlatformInput>(k: K, v: PlatformInput[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const save = () => {
    const input = {
      ...draft,
      evidenceUrls: evidence
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    void action.run("platform", input, async (key) => {
      const parsed = platformInput.safeParse(input);
      if (!parsed.success)
        throw new Error(agencyValidationMessage(parsed.error));
      await leadsAgencyApi.platform(platform.id, parsed.data, key);
      await onSaved();
      onClose();
    });
  };
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl [&>button:last-child]:size-10">
        <SheetHeader className="pr-12">
          <SheetTitle>{platform.name}</SheetTitle>
          <SheetDescription>
            Fișă comercială și evidență AVYRON. Nu stocăm parole sau sesiuni
            externe.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap gap-2">
            <External url={platform.homepage}>Homepage</External>
            <External url={platform.login}>Login</External>
            <External url={platform.register}>Înregistrare / acces</External>
            {account.profileUrl && (
              <External url={account.profileUrl}>Profil AVYRON</External>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Model și proiecte", platform.acquisition],
              ["Eligibilitate SRL România", platform.eligibility],
              ["Costuri și comisioane", platform.costs],
              ["Restricții", platform.restrictions],
            ].map(([title, text]) => (
              <section
                key={title}
                className="rounded-xl border border-border/70 p-3"
              >
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </section>
            ))}
          </div>
          <section>
            <h3 className="text-sm font-semibold">Înscriere și workflow</h3>
            <ol className="mt-3 space-y-2">
              {platform.workflow.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Servicii: {platform.services.join(" · ")}
              <br />
              De pregătit: {platform.documents.join(" · ")}
            </p>
          </section>
          <section className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-3">
            <h3 className="text-sm font-semibold">Necesită confirmare umană</h3>
            <ul className="mt-2 list-inside list-disc text-xs leading-6">
              {platform.pending.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-sm font-semibold">
              Surse oficiale · verificate {date(platform.verifiedOn)}
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {platform.evidence.map((e) => (
                <External key={e.url} url={e.url}>
                  {e.label}
                </External>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Verificarea contului AVYRON:{" "}
              {account.verifiedAt
                ? stamp(account.verifiedAt)
                : "încă neconfirmată"}
              .
            </p>
          </section>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-4 border-t border-border pt-5"
          >
            <h3 className="text-sm font-semibold">Cont și monitorizare</h3>
            <fieldset
              disabled={!boot.permissions.manage || action.busy}
              className="space-y-4 disabled:opacity-70"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status cont">
                  <Choice
                    value={draft.status}
                    onChange={(v) =>
                      update("status", v as PlatformInput["status"])
                    }
                    options={Object.entries(AGENCY_STATUSES).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                </Field>
                <Field label="Încadrare sursă">
                  <Choice
                    value={draft.category}
                    onChange={(v) =>
                      update("category", v as PlatformInput["category"])
                    }
                    options={[
                      {
                        value:
                          platform.category === "review"
                            ? "free"
                            : platform.category,
                        label:
                          platform.category === "success"
                            ? "Comision la succes"
                            : "Platformă gratuită",
                      },
                      { value: "review", label: "În verificare" },
                    ]}
                  />
                </Field>
                <Field label="Responsabil intern">
                  <Choice
                    value={draft.ownerId || ""}
                    onChange={(v) => update("ownerId", v || null)}
                    options={boot.staff.map((s) => ({
                      value: s.id,
                      label: s.display_name || "Membru staff",
                    }))}
                    placeholder="Nealocat"
                  />
                </Field>
                <Field label="Următoarea verificare">
                  <Input
                    type="date"
                    className="min-h-11 rounded-xl"
                    value={draft.nextReview}
                    onChange={(e) => update("nextReview", e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="URL profil AVYRON"
                hint="Doar profilul real de pe platforma oficială; lasă gol până există."
              >
                <Input
                  type="url"
                  className="min-h-11 rounded-xl"
                  value={draft.profileUrl}
                  onChange={(e) => update("profileUrl", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field
                label="Note interne"
                hint="Fără parole, tokenuri, sesiuni sau date bancare complete."
              >
                <Textarea
                  rows={3}
                  value={draft.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  maxLength={6000}
                />
              </Field>
              <section className="rounded-xl border border-border p-3">
                <h4 className="text-sm font-medium">
                  Validare înainte de activare
                </h4>
                <p className="my-2 text-xs leading-relaxed text-muted-foreground">
                  Confirmă doar condițiile probate. O listare publică nu
                  confirmă contul sau încasarea AVYRON.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(AGENCY_CHECKS).map(([key, label]) => (
                    <label
                      className="flex min-h-10 items-center gap-3 text-xs"
                      key={key}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-violet-500"
                        checked={draft.checks[key as keyof typeof draft.checks]}
                        onChange={(e) =>
                          update("checks", {
                            ...draft.checks,
                            [key]: e.target.checked,
                          })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </section>
              <Field
                label="Concluzia verificării"
                hint="Cel puțin 20 de caractere pentru activare. Menționează dovezile, condițiile și eventualele limite."
              >
                <Textarea
                  rows={3}
                  value={draft.verificationNote}
                  onChange={(e) => update("verificationNote", e.target.value)}
                  maxLength={3000}
                />
              </Field>
              <Field
                label="Linkuri către dovezi"
                hint="Câte un URL HTTPS pe rând; maximum 8. Fără URL-uri cu tokenuri private."
              >
                <Textarea
                  rows={3}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </Field>
            </fieldset>
            <ErrorBox message={action.error} />
            {boot.permissions.manage && (
              <Button
                disabled={action.busy}
                type="submit"
                className="min-h-11 w-full rounded-xl sm:w-auto"
              >
                {action.busy ? "Se salvează…" : "Salvează fișa platformei"}
              </Button>
            )}
          </form>
          <section className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold">
              Istoric · ultimele 100 de operațiuni
            </h3>
            <ErrorBox message={historyError} />
            {history.length ? (
              <ol className="mt-3 space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-xs">
                    <span className="font-medium">
                      {actions[h.action] || h.action}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      {stamp(h.created_at)}
                    </span>
                    {h.metadata_json &&
                      (() => {
                        try {
                          const m = JSON.parse(h.metadata_json);
                          return m.notes ? (
                            <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                              {m.notes}
                            </p>
                          ) : null;
                        } catch {
                          return null;
                        }
                      })()}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Nu există operațiuni înregistrate.
              </p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function newOpportunity(platformId: string): OpportunityInput {
  return {
    platformId,
    title: "",
    clientName: "",
    clientId: null,
    email: "",
    phone: "",
    serviceId: null,
    sourceUrl: "",
    sourceReference: "",
    kind: "commercial",
    budgetMin: null,
    budgetMax: null,
    currency: "RON",
    deadline: "",
    ownerId: null,
    priority: "normal",
    stage: "identified",
    contractMinor: null,
    commissionBps: agencyPlatform(platformId)?.commissionBps ?? null,
    estimatedCostMinor: null,
    nextAction: "",
    summary: "",
    lossReason: "",
    commissionNote: "",
  };
}
function opportunityDraft(initial: OpportunityInput): OpportunityInput {
  return Object.fromEntries(
    Object.keys(newOpportunity(initial.platformId)).map((key) => [
      key,
      initial[key as keyof OpportunityInput],
    ]),
  ) as OpportunityInput;
}
function QuickStage({
  opportunity,
  disabled,
  onSave,
}: {
  opportunity: AgencyOpportunity;
  disabled: boolean;
  onSave: (input: OpportunityInput) => void;
}) {
  const [stage, setStage] = useState(opportunity.stage),
    [next, setNext] = useState(opportunity.nextAction);
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold">Actualizare rapidă pipeline</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Etapă nouă">
          <Choice
            value={stage}
            onChange={(v) => setStage(v as AgencyOpportunity["stage"])}
            disabled={disabled}
            options={Object.entries(AGENCY_STAGES).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Field>
        <Field label="Următorul pas">
          <Input
            value={next}
            onChange={(e) => setNext(e.target.value)}
            disabled={disabled}
            maxLength={1000}
          />
        </Field>
      </div>
      <Button
        variant="outline"
        disabled={disabled || next.trim().length < 3}
        onClick={() =>
          onSave({ ...opportunityDraft(opportunity), stage, nextAction: next })
        }
      >
        Actualizează etapa
      </Button>
      <p className="text-xs text-muted-foreground">
        Pentru câștigat / pierdut, completează mai întâi valoarea contractuală
        ori motivul în Editare.
      </p>
    </div>
  );
}
function MoneyField({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        type="number"
        min="0"
        step="0.01"
        className="min-h-11 rounded-xl"
        defaultValue={inputMoney(value)}
        onChange={(e) => onChange(readMinor(e.target.value))}
      />
    </Field>
  );
}
function OpportunityForm({
  initial,
  boot,
  onSave,
  busy,
}: {
  initial: OpportunityInput;
  boot: AgencyBootstrap;
  onSave: (v: OpportunityInput) => void;
  busy: boolean;
}) {
  const [v, setV] = useState<OpportunityInput>(() => opportunityDraft(initial)),
    [validation, setValidation] = useState("");
  const set = <K extends keyof OpportunityInput>(
    k: K,
    value: OpportunityInput[K],
  ) => setV((d) => ({ ...d, [k]: value }));
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const p = opportunityInput.safeParse(v);
        if (!p.success) {
          setValidation(agencyValidationMessage(p.error));
          return;
        }
        setValidation("");
        onSave(p.data);
      }}
    >
      <fieldset
        disabled={busy || !boot.permissions.manage}
        className="space-y-5 disabled:opacity-70"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platforma de proveniență">
            <Choice
              value={v.platformId}
              disabled={"id" in initial}
              onChange={(value) =>
                setV((d) => ({
                  ...d,
                  platformId: value,
                  commissionBps: agencyPlatform(value)?.commissionBps ?? null,
                }))
              }
              options={boot.platforms.map((p) => ({
                value: p.id,
                label:
                  p.name + (p.category === "review" ? " · în verificare" : ""),
              }))}
            />
          </Field>
          <Field label="Tipul oportunității">
            <Choice
              value={v.kind}
              onChange={(x) => set("kind", x as OpportunityInput["kind"])}
              options={[
                { value: "commercial", label: "Cerere comercială" },
                { value: "subcontract", label: "Subcontractare" },
                { value: "research", label: "Cercetare / cooperare" },
                { value: "funding", label: "Finanțare / grant" },
              ]}
            />
          </Field>
        </div>
        <Field label="Proiect / titlu">
          <Input
            required
            minLength={3}
            maxLength={200}
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
            className="min-h-11 rounded-xl"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client existent (opțional)">
            <Choice
              value={v.clientId || ""}
              onChange={(x) =>
                setV((d) => ({
                  ...d,
                  clientId: x || null,
                  clientName:
                    boot.clients.find((c) => c.id === x)?.company_name ||
                    d.clientName,
                }))
              }
              options={boot.clients.map((c) => ({
                value: c.id,
                label: c.company_name,
              }))}
              placeholder="Beneficiar viitor / neasociat"
            />
          </Field>
          <Field label="Denumire beneficiar">
            <Input
              required
              minLength={2}
              maxLength={200}
              value={v.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
          <Field label="E-mail de contact (opțional)">
            <Input
              type="email"
              maxLength={254}
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
          <Field label="Telefon (opțional)">
            <Input
              type="tel"
              maxLength={40}
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
        </div>
        <Field label="Serviciu AVYRON">
          <Choice
            value={v.serviceId || ""}
            onChange={(x) => set("serviceId", x || null)}
            options={boot.services.map((s) => ({
              value: s.id,
              label: s.display_name,
            }))}
            placeholder={
              boot.services.length
                ? "De stabilit"
                : "Catalogul nu are servicii active"
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Linkul cererii originale"
            hint="URL specific de pe platformă. Pentru invitații private, folosește o referință."
          >
            <Input
              type="url"
              value={v.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
          <Field
            label="Referință RFP / invitație"
            hint="Obligatorie dacă nu există permalink. Nu copia tokenuri sau mesaje confidențiale integral."
          >
            <Input
              maxLength={200}
              value={v.sourceReference}
              onChange={(e) => set("sourceReference", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Monedă">
            <Choice
              value={v.currency}
              disabled={"id" in initial}
              onChange={(x) =>
                set("currency", x as OpportunityInput["currency"])
              }
              options={["RON", "EUR", "USD", "GBP", "AED"].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
          <MoneyField
            value={v.budgetMin}
            onChange={(n) => set("budgetMin", n)}
            label="Buget minim"
          />
          <MoneyField
            value={v.budgetMax}
            onChange={(n) => set("budgetMax", n)}
            label="Buget maxim"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Termen-limită">
            <Input
              type="date"
              value={v.deadline}
              onChange={(e) => set("deadline", e.target.value)}
              className="min-h-11 rounded-xl"
            />
          </Field>
          <Field label="Responsabil">
            <Choice
              value={v.ownerId || ""}
              onChange={(x) => set("ownerId", x || null)}
              options={boot.staff.map((s) => ({
                value: s.id,
                label: s.display_name || "Membru staff",
              }))}
              placeholder="Nealocat"
            />
          </Field>
          <Field label="Prioritate">
            <Choice
              value={v.priority}
              onChange={(x) =>
                set("priority", x as OpportunityInput["priority"])
              }
              options={[
                { value: "high", label: "Ridicată" },
                { value: "normal", label: "Normală" },
                { value: "low", label: "Redusă" },
              ]}
            />
          </Field>
          <Field label="Status ofertare">
            <Choice
              value={v.stage}
              onChange={(x) => set("stage", x as OpportunityInput["stage"])}
              options={Object.entries(AGENCY_STAGES).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>
        </div>
        <div className="rounded-xl border border-border/70 p-4">
          <h3 className="mb-3 text-sm font-semibold">
            AVY Margin · estimare comercială
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Valori pentru onorariul serviciilor, fără TVA și bugete terțe.
            Bugetul clientului nu devine automat preț ofertat. Costurile și
            comisionul neconfirmate păstrează marja incompletă.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              value={v.contractMinor}
              onChange={(n) => set("contractMinor", n)}
              label="Valoare servicii contractată"
            />
            <MoneyField
              value={v.estimatedCostMinor}
              onChange={(n) => set("estimatedCostMinor", n)}
              label="Cost estimat de livrare"
            />
            <MoneyField
              key={v.platformId + ":commission"}
              value={v.commissionBps}
              onChange={(n) => set("commissionBps", n)}
              label="Comision platformă (%)"
            />
            <Field
              label="Confirmarea comisionului"
              hint="Explică orice abatere de la condițiile publice."
            >
              <Input
                value={v.commissionNote}
                maxLength={1000}
                onChange={(e) => set("commissionNote", e.target.value)}
                className="min-h-11 rounded-xl"
              />
            </Field>
          </div>
          <p className="mt-4 text-sm font-medium">
            Net estimat:{" "}
            {money(
              agencyMargin(
                v.contractMinor,
                v.commissionBps,
                v.estimatedCostMinor,
              ).estimatedNetMinor,
              v.currency,
            )}
          </p>
        </div>
        <Field label="Context și cerințe">
          <Textarea
            rows={4}
            value={v.summary}
            maxLength={6000}
            onChange={(e) => set("summary", e.target.value)}
          />
        </Field>
        <Field label="Următoarea acțiune">
          <Input
            required
            minLength={3}
            maxLength={1000}
            value={v.nextAction}
            onChange={(e) => set("nextAction", e.target.value)}
            className="min-h-11 rounded-xl"
          />
        </Field>
        {v.stage === "lost" && (
          <Field label="Motivul pierderii">
            <Textarea
              required
              value={v.lossReason}
              maxLength={1000}
              onChange={(e) => set("lossReason", e.target.value)}
            />
          </Field>
        )}
      </fieldset>
      <ErrorBox message={validation} />
      {boot.permissions.manage && (
        <Button type="submit" disabled={busy} className="min-h-11 rounded-xl">
          {busy ? "Se salvează…" : "Salvează oportunitatea"}
        </Button>
      )}
    </form>
  );
}
function OpportunitySheet({
  id,
  platformId,
  boot,
  onClose,
  onSaved,
}: {
  id: string | null;
  platformId: string;
  boot: AgencyBootstrap;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const navigate = useNavigate(),
    action = useAction();
  const [detail, setDetail] = useState<AgencyDetail | null>(null),
    [loadError, setLoadError] = useState(""),
    [mode, setMode] = useState("summary"),
    [reason, setReason] = useState(""),
    [brief, setBrief] = useState("");
  const [entryEpoch, setEntryEpoch] = useState(0);
  const [entry, setEntry] = useState<AgencyEntryInput>({
    kind: "time",
    amountMinor: 0,
    minutes: 0,
    reference: "",
    note: "",
    occurredOn: agencyToday(),
  });
  const load = useCallback(async () => {
    if (!id) return;
    setLoadError("");
    try {
      setDetail(await leadsAgencyApi.detail(id));
    } catch (e) {
      setDetail(null);
      setLoadError(err(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const saved = async () => {
    await onSaved();
    await load();
  };
  const save = (v: OpportunityInput) =>
    void action.run("opportunity", v, async (key) => {
      await leadsAgencyApi.save(id, v, detail?.opportunity.revision, key);
      await onSaved();
      onClose();
    });
  const o = detail?.opportunity;
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl [&>button:last-child]:size-10">
        <SheetHeader className="pr-12">
          <SheetTitle>
            {o?.title || (!id ? "Oportunitate nouă" : "Fișa oportunității")}
          </SheetTitle>
          <SheetDescription>
            {o
              ? `${o.clientName} · ${agencyPlatform(o.platformId)?.name} · ${AGENCY_STAGES[o.stage]}`
              : "Evidență B2B internă; fără aplicare automată sau mesaje externe."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-5">
          <ErrorBox message={loadError} />
          {loadError && (
            <Button onClick={() => void load()} variant="outline">
              Reîncearcă
            </Button>
          )}
          {!id ? (
            <OpportunityForm
              initial={newOpportunity(platformId)}
              boot={boot}
              onSave={save}
              busy={action.busy}
            />
          ) : o && detail ? (
            <>
              <div className="flex flex-wrap gap-2">
                {[
                  ["summary", "Fișă"],
                  ["edit", "Editare"],
                  ["ledger", "Activitate / încasări"],
                  ["history", "Istoric"],
                ].map(([value, label]) => (
                  <Button
                    key={value}
                    className="min-h-10 rounded-lg"
                    variant={mode === value ? "default" : "outline"}
                    onClick={() => setMode(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {mode === "summary" && (
                <>
                  {boot.permissions.manage && !o.archivedAt && (
                    <QuickStage
                      key={o.revision}
                      opportunity={o}
                      disabled={action.busy}
                      onSave={(input) =>
                        void action.run(
                          "quick-stage",
                          { input, revision: o.revision },
                          async (key) => {
                            const parsed = opportunityInput.safeParse(input);
                            if (!parsed.success)
                              throw new Error(
                                agencyValidationMessage(parsed.error),
                              );
                            await leadsAgencyApi.save(
                              o.id,
                              parsed.data,
                              o.revision,
                              key,
                            );
                            await saved();
                          },
                        )
                      }
                    />
                  )}
                  <dl className="grid gap-4 rounded-xl border border-border p-4 text-sm sm:grid-cols-2">
                    {[
                      [
                        "Serviciu",
                        boot.services.find((s) => s.id === o.serviceId)
                          ?.display_name || "De stabilit",
                      ],
                      [
                        "Buget",
                        `${money(o.budgetMin, o.currency)} – ${money(o.budgetMax, o.currency)}`,
                      ],
                      ["Termen", date(o.deadline)],
                      [
                        "Responsabil",
                        boot.staff.find((s) => s.id === o.ownerId)
                          ?.display_name || "Nealocat",
                      ],
                      [
                        "Tip",
                        {
                          commercial: "Comercial",
                          subcontract: "Subcontractare",
                          research: "Cercetare",
                          funding: "Finanțare",
                        }[o.kind],
                      ],
                      [
                        "Valoare contractată",
                        money(o.contractMinor, o.currency),
                      ],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="mt-1 font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {o.summary || "Fără context suplimentar."}
                  </p>
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Următoarea acțiune
                    </p>
                    <p className="mt-2 text-sm">{o.nextAction}</p>
                  </div>
                  <p className="text-sm">
                    AVY Margin · net estimat:{" "}
                    <strong>
                      {money(detail.margin.estimatedNetMinor, o.currency)}
                    </strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <External url={o.sourceUrl || null}>
                      Cererea originală
                    </External>
                    {o.leadId ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/profil?tab=leads&lead=${encodeURIComponent(o.leadId!)}`,
                          )
                        }
                      >
                        Deschide în Leads
                      </Button>
                    ) : (
                      boot.permissions.transfer && (
                        <Button
                          disabled={
                            action.busy ||
                            o.stage === "identified" ||
                            o.stage === "lost" ||
                            !!o.archivedAt
                          }
                          onClick={() =>
                            void action.run(
                              "transfer",
                              { id: o.id, revision: o.revision },
                              async (key) => {
                                await leadsAgencyApi.transfer(o, key);
                                await saved();
                              },
                            )
                          }
                        >
                          Transferă în Leads
                        </Button>
                      )
                    )}
                    {boot.permissions.documents && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/profil?tab=documents&documentView=generator&agencyOpportunity=${encodeURIComponent(o.id)}`,
                          )
                        }
                      >
                        <FileText size={15} className="mr-2" />
                        Pregătește ofertă
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() =>
                        void action.run("brief", o.id, async () => {
                          const r = await leadsAgencyApi.brief(o.id);
                          setBrief(r.text);
                        })
                      }
                    >
                      Brief pentru Codex / agent
                    </Button>
                  </div>
                  {!o.leadId && (
                    <p className="text-xs text-muted-foreground">
                      Transferul este disponibil după calificare, cu drepturile
                      native Leads. Nu inițiază contactarea.
                    </p>
                  )}
                  {brief && (
                    <div className="space-y-3">
                      <Textarea
                        rows={8}
                        readOnly
                        aria-label="Brief pentru agent"
                        value={brief}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = URL.createObjectURL(
                            new Blob([brief], {
                              type: "text/markdown;charset=utf-8",
                            }),
                          );
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `agency-${o.id}.md`;
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                        }}
                      >
                        <Download size={15} className="mr-2" />
                        Descarcă brief
                      </Button>
                    </div>
                  )}
                  {boot.permissions.manage && (
                    <details className="rounded-xl border border-border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {o.archivedAt
                          ? "Restaurează oportunitatea"
                          : "Arhivare"}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <Field label="Motiv arhivare / restaurare">
                          <Textarea
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            minLength={5}
                          />
                        </Field>
                        <Button
                          variant="outline"
                          disabled={action.busy || reason.trim().length < 5}
                          onClick={() =>
                            void action.run(
                              "archive",
                              { id: o.id, revision: o.revision, reason },
                              async (key) => {
                                await leadsAgencyApi.archive(
                                  o,
                                  !o.archivedAt,
                                  reason,
                                  key,
                                );
                                await onSaved();
                                onClose();
                              },
                            )
                          }
                        >
                          {o.archivedAt ? (
                            <Undo2 size={15} className="mr-2" />
                          ) : (
                            <Archive size={15} className="mr-2" />
                          )}
                          {o.archivedAt ? "Restaurează" : "Arhivează"}
                        </Button>
                      </div>
                    </details>
                  )}
                </>
              )}
              {mode === "edit" && (
                <OpportunityForm
                  key={o.revision}
                  initial={o}
                  boot={boot}
                  busy={action.busy}
                  onSave={save}
                />
              )}
              {mode === "ledger" && (
                <>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Evidență consemnată manual, în {o.currency}. Nu inițiază
                    plăți și nu confirmă sincronizarea cu banca. Încasările /
                    comisioanele necesită contract câștigat; anulările păstrează
                    istoricul. Pentru rețineri la sursă, consemnează venitul
                    brut realizat și comisionul separat, pentru a evita dubla
                    deducere. Sumele încă blocate în escrow nu sunt încasări.
                  </p>
                  {!boot.permissions.financeRead && (
                    <p className="rounded-xl bg-muted p-3 text-sm">
                      Încasările și costurile necesită dreptul financiar. Poți
                      consulta timpul alocat.
                    </p>
                  )}
                  <div className="space-y-3">
                    {detail.entries.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-xl border border-border p-3 text-xs"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <strong>
                            {
                              {
                                receipt: "Încasare brută confirmată",
                                commission: "Comision reținut / achitat",
                                platform_cost: "Cost platformă",
                                delivery_cost: "Cost livrare",
                                time: "Timp alocat",
                              }[e.kind]
                            }{" "}
                            ·{" "}
                            {e.kind === "time"
                              ? `${e.minutes} min`
                              : money(e.amountMinor, e.currency)}
                          </strong>
                          <span>{date(e.occurredOn)}</span>
                        </div>
                        <p className="mt-2 break-words text-muted-foreground">
                          {e.reference} · {e.note}
                        </p>
                        {e.voidedAt ? (
                          <p className="mt-2 text-muted-foreground">
                            Anulat: {e.voidReason}
                          </p>
                        ) : (
                          (boot.permissions.financeWrite ||
                            (e.kind === "time" && boot.permissions.manage)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 min-h-10"
                              disabled={action.busy || reason.length < 5}
                              onClick={() =>
                                void action.run(
                                  "void",
                                  { id: e.id, reason },
                                  async (key) => {
                                    await leadsAgencyApi.voidEntry(
                                      e.id,
                                      reason,
                                      key,
                                    );
                                    await saved();
                                  },
                                )
                              }
                            >
                              Anulează cu motivul completat mai jos
                            </Button>
                          )
                        )}
                      </div>
                    ))}
                    {!detail.entries.length && (
                      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        Nu există înregistrări.
                      </p>
                    )}
                  </div>
                  {boot.permissions.manage && !o.archivedAt && (
                    <form
                      className="space-y-4 rounded-xl border border-border p-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void action.run("entry", entry, async (key) => {
                          const p = entryInput.safeParse(entry);
                          if (!p.success)
                            throw new Error(agencyValidationMessage(p.error));
                          await leadsAgencyApi.entry(o.id, p.data, key);
                          setEntry({
                            ...entry,
                            reference: "",
                            note: "",
                            amountMinor: 0,
                            minutes: 0,
                          });
                          setEntryEpoch((x) => x + 1);
                          await saved();
                        });
                      }}
                    >
                      <h3 className="text-sm font-semibold">
                        Adaugă înregistrare
                      </h3>
                      <Field label="Tip înregistrare">
                        <Choice
                          value={entry.kind}
                          onChange={(value) =>
                            setEntry((d) => ({
                              ...d,
                              kind: value as AgencyEntryInput["kind"],
                              amountMinor: 0,
                              minutes: 0,
                            }))
                          }
                          options={(boot.permissions.financeWrite
                            ? [
                                ["time", "Timp alocat"],
                                ["receipt", "Încasare brută confirmată"],
                                ["commission", "Comision reținut / achitat"],
                                ["platform_cost", "Cost platformă"],
                                ["delivery_cost", "Cost livrare"],
                              ]
                            : [["time", "Timp alocat"]]
                          ).map(([value, label]) => ({ value, label }))}
                        />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {entry.kind === "time" ? (
                          <Field label="Minute lucrate">
                            <Input
                              required
                              type="number"
                              min="1"
                              step="1"
                              value={entry.minutes || ""}
                              onChange={(e) =>
                                setEntry((d) => ({
                                  ...d,
                                  minutes: Number(e.target.value),
                                }))
                              }
                            />
                          </Field>
                        ) : (
                          <MoneyField
                            key={entry.kind + entryEpoch}
                            value={entry.amountMinor}
                            onChange={(n) =>
                              setEntry((d) => ({ ...d, amountMinor: n ?? 0 }))
                            }
                            label={`Sumă (${o.currency})`}
                          />
                        )}
                        <Field label="Data operațiunii">
                          <Input
                            required
                            type="date"
                            value={entry.occurredOn}
                            onChange={(e) =>
                              setEntry((d) => ({
                                ...d,
                                occurredOn: e.target.value,
                              }))
                            }
                          />
                        </Field>
                      </div>
                      <Field
                        label="Referință unică"
                        hint="Ex.: referința documentului de plată sau activității; fără date bancare complete."
                      >
                        <Input
                          required
                          minLength={3}
                          value={entry.reference}
                          onChange={(e) =>
                            setEntry((d) => ({
                              ...d,
                              reference: e.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Detalii / dovadă consemnată">
                        <Textarea
                          required
                          minLength={3}
                          value={entry.note}
                          onChange={(e) =>
                            setEntry((d) => ({ ...d, note: e.target.value }))
                          }
                        />
                      </Field>
                      <Button disabled={action.busy} type="submit">
                        Consemnează înregistrarea
                      </Button>
                    </form>
                  )}
                  {boot.permissions.manage && (
                    <Field label="Motiv pentru anularea unei înregistrări">
                      <Textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Completează motivul, apoi alege înregistrarea."
                      />
                    </Field>
                  )}
                </>
              )}
              {mode === "history" && (
                <ol className="space-y-3">
                  {detail.events.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-xl border border-border p-3 text-sm"
                    >
                      <p>{actions[e.action] || e.action}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stamp(e.created_at)}
                        {e.revision ? ` · revizia ${e.revision}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : id && !loadError ? (
            <p role="status" className="text-sm text-muted-foreground">
              Se încarcă fișa…
            </p>
          ) : null}
          <ErrorBox message={action.error} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
export default function LeadsAgency() {
  const [params, setParams] = useSearchParams();
  const requestedView = params.get("agencyView") || "overview";
  const view = [
    "overview",
    "free",
    "success",
    "review",
    "opportunities",
    "reports",
  ].includes(requestedView)
    ? requestedView
    : "overview";
  const selected = params.get("agencyOpportunity");
  const [boot, setBoot] = useState<AgencyBootstrap | null>(null),
    [reports, setReports] = useState<{
      data: AgencyReport[];
      financeVisible: boolean;
      netDefinition: string;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const [platformId, setPlatformId] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [newPlatform, setNewPlatform] = useState("infinum");
  const [rows, setRows] = useState<AgencyOpportunity[]>([]),
    [total, setTotal] = useState(0),
    [listError, setListError] = useState(""),
    [listBusy, setListBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const [filters, setFilters] = useState({
    platform: "",
    service: "",
    priority: "",
    stage: "",
    currency: "",
    budgetMin: "",
    budgetMax: "",
    archived: false,
    offset: 0,
  });
  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [b, r] = await Promise.all([
        leadsAgencyApi.bootstrap(),
        leadsAgencyApi.reports(),
      ]);
      setBoot(b);
      setReports(r);
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(err(e));
      setBoot(null);
      setReports(null);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (k === "archived") {
      if (v) query.set(k, "1");
    } else if (k === "budgetMin" || k === "budgetMax") {
      if (v !== "") query.set(k, String(readMinor(String(v))));
    } else if (v !== "") query.set(k, String(v));
  }
  const queryString = query.toString();
  useEffect(() => {
    if (view !== "opportunities" || !boot) return;
    const ctl = new AbortController();
    setListBusy(true);
    setListError("");
    void leadsAgencyApi
      .list(new URLSearchParams(queryString), ctl.signal)
      .then((r) => {
        if (!ctl.signal.aborted) {
          setRows(r.data);
          setTotal(r.total);
        }
      })
      .catch((e) => {
        if (!ctl.signal.aborted) {
          setListError(err(e));
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!ctl.signal.aborted) setListBusy(false);
      });
    return () => ctl.abort();
  }, [view, boot, queryString, refresh]);
  const setView = (v: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("agencyView", v);
      return n;
    });
  const open = (id: string | null) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (id) n.set("agencyOpportunity", id);
      else n.delete("agencyOpportunity");
      return n;
    });
  const saved = async () => {
    await reload();
    setMessage("Modificările au fost salvate în AVYRON OS.");
  };
  if (!boot)
    return (
      <section aria-label="Leads Agency" className={panel}>
        <h1 className="text-xl font-semibold">Leads Agency</h1>
        {busy ? (
          <p role="status" className="mt-3 text-sm">
            Se încarcă datele autorizate…
          </p>
        ) : (
          <>
            <ErrorBox message={error} />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void reload()}
            >
              Reîncearcă încărcarea
            </Button>
          </>
        )}
      </section>
    );
  const free = boot.platforms.filter(
    (p) =>
      boot.accounts.find((a) => a.platformId === p.id)?.category === "free",
  );
  const relevant = reports?.data.reduce((n, r) => n + r.relevant, 0) || 0;
  const offers = reports?.data.reduce((n, r) => n + r.offers, 0) || 0;
  const won = reports?.data.reduce((n, r) => n + r.won, 0) || 0;
  const due = boot.accounts.filter(
    (a) =>
      a.nextReview && a.nextReview <= new Date().toISOString().slice(0, 10),
  );
  const cards = (category: string) => (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {boot.platforms
        .filter(
          (p) =>
            boot.accounts.find((a) => a.platformId === p.id)?.category ===
            category,
        )
        .map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            account={boot.accounts.find((a) => a.platformId === p.id)!}
            onOpen={() => setPlatformId(p.id)}
          />
        ))}
    </div>
  );
  const filter = (key: keyof typeof filters, v: string | boolean | number) =>
    setFilters((f) => ({
      ...f,
      [key]: v,
      offset: key === "offset" ? Number(v) : 0,
    }));
  return (
    <section aria-label="Leads Agency" className="min-w-0 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <ShieldCheck size={15} />
            FREE-FIRST · B2B
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Leads Agency
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Proiecte comerciale pentru AVYRON. Surse gratuite mai întâi,
            evidență reală și control uman la fiecare pas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11 rounded-xl"
            disabled={busy}
            onClick={() => void reload()}
            aria-label="Actualizează Leads Agency"
          >
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
          </Button>
          {boot.permissions.manage && (
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => {
                setNewPlatform(free[0]?.id || "infinum");
                setCreating(true);
              }}
            >
              <Plus size={16} className="mr-2" />
              Oportunitate nouă
            </Button>
          )}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["Surse gratuite", free.length, BriefcaseBusiness],
          ["Oportunități relevante", relevant, Target],
          ["Oferte transmise", offers, FileText],
          ["Contracte câștigate", won, Check],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Target;
          return (
            <div className={`${panel} !p-4`} key={String(label)}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{String(label)}</p>
                <I size={15} className="text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {Number(value)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {boot.accounts.filter((a) => a.status === "active").length} conturi
        marcate active de un responsabil. Categoria gratuită indică modelul
        permis, nu un cont conectat sau proiecte garantate.
      </p>
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm"
        >
          {message}
        </p>
      )}
      <ErrorBox message={error} />
      <Tabs value={view} onValueChange={setView} className="min-w-0">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-1 rounded-xl bg-muted/60 p-1">
            {[
              ["overview", "Overview"],
              ["free", "Platforme gratuite"],
              ["success", "Comision la succes"],
              ["review", "În verificare"],
              ["opportunities", "Oportunități"],
              ["reports", "Rapoarte"],
            ].map(([id, label]) => (
              <TabsTrigger
                className="min-h-11 shrink-0 rounded-lg px-3 text-xs"
                key={id}
                value={id}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="mt-3 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">
              Platforme gratuite · prioritate maximă
            </h2>
            <p className="mb-4 mt-1 text-xs leading-relaxed text-muted-foreground">
              Fără abonamente obligatorii, credite de aplicare sau cumpărare de
              contacte. Inbound, cereri directe și rețelele de subcontractare
              sunt diferențiate.
            </p>
            {cards("free")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className={panel}>
              <h2 className="text-sm font-semibold">Verificări de efectuat</h2>
              {due.length ? (
                <ul className="mt-3 space-y-2">
                  {due.map((a) => (
                    <li key={a.platformId}>
                      <button
                        className="min-h-10 w-full rounded-lg px-2 text-left text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                        onClick={() => setPlatformId(a.platformId)}
                      >
                        {agencyPlatform(a.platformId)?.name} ·{" "}
                        {date(a.nextReview)}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Nu există verificări scadente înregistrate. Setează data în
                  fișa fiecărei surse.
                </p>
              )}
            </section>
            <section className={panel}>
              <h2 className="text-sm font-semibold">Control comercial</h2>
              <p className="my-3 text-xs leading-relaxed text-muted-foreground">
                Sursele cu condiții neconfirmate rămân distincte. Nicio sursă nu
                primește un scor de eficiență pentru simplul fapt că este
                gratuită.
              </p>
              <Button variant="outline" onClick={() => setView("review")}>
                Deschide sursele în verificare
              </Button>
            </section>
          </div>
        </TabsContent>
        <TabsContent value="free" className="space-y-4">
          <h2 className="text-lg font-semibold">Platforme gratuite</h2>
          {cards("free")}
        </TabsContent>
        <TabsContent value="success" className="space-y-4">
          <h2 className="text-lg font-semibold">
            Comision doar la succes · alternativă secundară
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Fără plăți în avans. Procentul, perioada și ruta de încasare se
            confirmă înainte de ofertare; această listă nu înlocuiește nucleul
            gratuit.
          </p>
          {cards("success")}
        </TabsContent>
        <TabsContent value="review" className="space-y-4">
          <h2 className="text-lg font-semibold">În verificare</h2>
          <p className="text-xs text-muted-foreground">
            Activează doar cu dovezi de eligibilitate, costuri, activitate și
            contractare legală.
          </p>
          {cards("review")}
          {!boot.accounts.some((a) => a.category === "review") && (
            <p className={panel}>Nu există surse în această categorie.</p>
          )}
        </TabsContent>
        <TabsContent value="opportunities" className="space-y-4">
          <h2 className="text-lg font-semibold">Pipeline B2B</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Platformă">
              <Choice
                value={filters.platform}
                onChange={(v) => filter("platform", v)}
                options={boot.platforms.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder="Toate platformele"
              />
            </Field>
            <Field label="Serviciu">
              <Choice
                value={filters.service}
                onChange={(v) => filter("service", v)}
                options={boot.services.map((s) => ({
                  value: s.id,
                  label: s.display_name,
                }))}
                placeholder="Toate serviciile"
              />
            </Field>
            <Field label="Prioritate">
              <Choice
                value={filters.priority}
                onChange={(v) => filter("priority", v)}
                options={[
                  { value: "high", label: "Ridicată" },
                  { value: "normal", label: "Normală" },
                  { value: "low", label: "Redusă" },
                ]}
                placeholder="Toate prioritățile"
              />
            </Field>
            <Field label="Etapă">
              <Choice
                value={filters.stage}
                onChange={(v) => filter("stage", v)}
                options={Object.entries(AGENCY_STAGES).map(
                  ([value, label]) => ({ value, label }),
                )}
                placeholder="Toate etapele"
              />
            </Field>
          </div>
          <details className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm">
              Buget și arhivă
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Moneda filtrului">
                <Choice
                  value={filters.currency}
                  onChange={(v) => filter("currency", v)}
                  options={["RON", "EUR", "USD", "GBP", "AED"].map((value) => ({
                    value,
                    label: value,
                  }))}
                  placeholder="Alege moneda"
                />
              </Field>
              <Field label="Buget de la">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.budgetMin}
                  onChange={(e) => filter("budgetMin", e.target.value)}
                />
              </Field>
              <Field label="Buget până la">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.budgetMax}
                  onChange={(e) => filter("budgetMax", e.target.value)}
                />
              </Field>
            </div>
            <label className="mt-3 flex min-h-10 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) => filter("archived", e.target.checked)}
                className="size-4 accent-violet-500"
              />
              Arhiva oportunităților
            </label>
          </details>
          <ErrorBox message={listError} />
          {listBusy && (
            <p role="status" className="text-sm text-muted-foreground">
              Se încarcă pipeline-ul…
            </p>
          )}
          <div className="grid min-w-0 gap-3">
            {rows.map((o) => (
              <article className={`${panel} !p-4`} key={o.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {agencyPlatform(o.platformId)?.name} ·{" "}
                      {o.kind === "research"
                        ? "Cercetare"
                        : o.kind === "funding"
                          ? "Finanțare"
                          : o.kind === "subcontract"
                            ? "Subcontractare"
                            : "Comercial"}
                    </p>
                    <h3 className="mt-1 break-words text-base font-semibold">
                      {o.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {o.clientName} ·{" "}
                      {boot.services.find((s) => s.id === o.serviceId)
                        ?.display_name || "Serviciu de stabilit"}
                    </p>
                  </div>
                  <span className={badge}>{AGENCY_STAGES[o.stage]}</span>
                </div>
                <p className="mt-3 break-words text-xs leading-relaxed">
                  <strong>Următorul pas:</strong> {o.nextAction}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                  <p className="text-xs text-muted-foreground">
                    {money(o.budgetMin, o.currency)} –{" "}
                    {money(o.budgetMax, o.currency)} · termen {date(o.deadline)}
                  </p>
                  <Button
                    variant="outline"
                    className="min-h-10 rounded-lg"
                    onClick={() => open(o.id)}
                  >
                    Deschide oportunitatea
                  </Button>
                </div>
              </article>
            ))}
            {!rows.length && !listBusy && !listError && (
              <div className={`${panel} text-sm text-muted-foreground`}>
                Nu există oportunități pentru selecția curentă. Adaugă numai
                cereri reale, cu sursa originală.
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{total} înregistrări · maximum 50 pe pagină</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset === 0 || listBusy}
                onClick={() =>
                  filter("offset", Math.max(0, filters.offset - 50))
                }
              >
                Anterioare
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={filters.offset + 50 >= total || listBusy}
                onClick={() => filter("offset", filters.offset + 50)}
              >
                Următoare
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <h2 className="text-lg font-semibold">
            Eficiență din rezultate reale
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Fără scoruri inventate sau conversii valutare. Timpul este consemnat
            în minute; sursele rămân în evidență și dacă nu aduc contracte
            imediat. Rapoartele includ istoricul arhivat.
          </p>
          {reports?.data.map((r) => (
            <article className={panel} key={r.platformId}>
              <h3 className="text-sm font-semibold">
                {agencyPlatform(r.platformId)?.name}{" "}
                <span className="font-normal text-muted-foreground">
                  · {AGENCY_CATEGORY_LABELS[r.category]}
                </span>
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                {[
                  ["Relevante", r.relevant],
                  ["Oferte transmise", r.offers],
                  ["Contracte câștigate", r.won],
                  ["Minute alocate", r.minutes],
                  [
                    "Conversie calificat → câștigat",
                    r.relevant
                      ? `${Math.round((r.won / r.relevant) * 100)}%`
                      : "Fără istoric",
                  ],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
              {reports.financeVisible &&
                r.currencies.map((m) => (
                  <div
                    key={m.currency}
                    className="mt-4 grid gap-3 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-3"
                  >
                    <p>
                      Contracte:{" "}
                      <strong>{money(m.contracts, m.currency)}</strong>
                    </p>
                    <p>
                      Brut realizat:{" "}
                      <strong>{money(m.received, m.currency)}</strong>
                    </p>
                    <p>
                      Comisioane achitate:{" "}
                      <strong>{money(m.commissionPaid, m.currency)}</strong>
                    </p>
                    <p>
                      Cost platformă:{" "}
                      <strong>{money(m.platformCost, m.currency)}</strong>
                    </p>
                    <p>
                      Cost livrare:{" "}
                      <strong>{money(m.deliveryCost, m.currency)}</strong>
                    </p>
                    <p>
                      Net de numerar:{" "}
                      <strong>{money(m.cashNet, m.currency)}</strong>
                    </p>
                  </div>
                ))}
            </article>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {reports?.financeVisible
              ? reports.netDefinition
              : "Valorile încasărilor și costurilor necesită acces financiar."}
          </p>
        </TabsContent>
      </Tabs>
      {platformId && (
        <PlatformSheet
          key={
            platformId +
            ":" +
            boot.accounts.find((a) => a.platformId === platformId)!.revision
          }
          platform={agencyPlatform(platformId)!}
          account={boot.accounts.find((a) => a.platformId === platformId)!}
          boot={boot}
          onClose={() => setPlatformId(null)}
          onSaved={saved}
        />
      )}
      {(creating || selected) && (
        <OpportunitySheet
          key={selected || "new"}
          id={selected}
          platformId={newPlatform}
          boot={boot}
          onClose={() => {
            setCreating(false);
            open(null);
          }}
          onSaved={saved}
        />
      )}
    </section>
  );
}
