import {
  Children,
  cloneElement,
  isValidElement,
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
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { futureLeadsApi as api } from "@/lib/futureLeadsApi";
import { leadsApi, type LeadListRow } from "@/lib/leadsApi";
import { leadWhatsAppUrl } from "@/shared/leadArchive";
import {
  bucharestDay,
  FUTURE_LEAD_STATUSES,
  futureDays,
  futureLeadError,
  futureLeadInput,
  type FutureLeadInput,
  type FutureLeadRow,
  type FutureLeadBootstrap,
} from "@/shared/futureLeads";
import { PROJECT_KIND_LABELS } from "@/shared/projectSummary";
import { PROJECT_STAGES, type ProjectStage } from "@/shared/projectLifecycle";
const empty = (): FutureLeadInput => ({
  title: "",
  name: "",
  business: "",
  email: "",
  phone: "",
  source: "",
  requirements: "",
  contactOn: bucharestDay(),
  projectKind: "website_prezentare",
  clientId: null,
  staffIds: [],
});
const date = (v: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(v + "T12:00:00Z"));
const fill = (r: FutureLeadRow): FutureLeadInput => ({
  title: r.title,
  name: r.name || "",
  business: r.business || "",
  email: r.email || "",
  phone: r.phone || "",
  source: r.source || "",
  requirements: r.requirements,
  contactOn: r.contact_on,
  projectKind: r.project_kind,
  clientId: r.client_id,
  staffIds: r.staff.map((s) => s.id),
});
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5 text-xs font-medium text-muted-foreground">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child, index) =>
        index === 0 && isValidElement(child)
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </div>
  );
}
function Choice({
  id,
  value,
  onChange,
  label,
  options,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (s: string) => void;
  label: string;
  options: { id: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        aria-label={label}
        className="w-full min-w-0 bg-background/60 text-foreground"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Contact({ row }: { row: FutureLeadRow }) {
  const wa = leadWhatsAppUrl(
    row.phone,
    `Bună ziua! Revin din partea AVYRON în legătură cu ${row.title}. Putem discuta pașii următori?`,
  );
  const tel = wa ? new URL(wa).pathname.slice(1) : null;
  return (
    <div className="flex shrink-0 gap-1" aria-label="Contact client">
      {tel && (
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <a
            href={`tel:+${tel}`}
            aria-label={`Sună ${row.name || row.business}`}
            title="Sună"
          >
            <Phone className="h-4 w-4" />
          </a>
        </Button>
      )}
      {wa && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-emerald-400"
        >
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${row.name || row.business}`}
            title="Deschide WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </Button>
      )}
      {row.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) && (
        <Button asChild variant="ghost" size="icon" className="h-9 w-9">
          <a
            href={`mailto:${row.email}`}
            aria-label={`E-mail ${row.name || row.business}`}
            title="Trimite e-mail"
          >
            <Mail className="h-4 w-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
export default function FutureLeads() {
  const navigate = useNavigate(),
    [params, setParams] = useSearchParams();
  const selected = params.get("futureLead");
  const [boot, setBoot] = useState<FutureLeadBootstrap | null>(null),
    [rows, setRows] = useState<FutureLeadRow[]>([]),
    [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState("active"),
    [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [record, setRecord] = useState<FutureLeadRow | null>(null),
    [input, setInput] = useState<FutureLeadInput>(empty),
    [editStatus, setEditStatus] = useState("scheduled"),
    [formError, setFormError] = useState("");
  const [events, setEvents] = useState<
      { action: string; created_at: number; revision: number }[]
    >([]),
    [mode, setMode] = useState("new"),
    [existing, setExisting] = useState<LeadListRow[]>([]),
    [leadId, setLeadId] = useState("");
  const [confirmConvert, setConfirmConvert] = useState(false),
    [stage, setStage] = useState<ProjectStage>("proposed");
  const key = useRef(crypto.randomUUID()),
    request = useRef(0),
    detailRequest = useRef(0),
    existingRequest = useRef(0),
    opener = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement | null>(null),
    savedInput = useRef("");
  const load = useCallback(async () => {
    const token = ++request.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.list(status, query);
      if (token === request.current) {
        setRows(data.data);
        setHasMore(data.hasMore);
      }
    } catch (e) {
      if (token === request.current) setError(futureLeadError(e));
    } finally {
      if (token === request.current) setLoading(false);
    }
  }, [status, query]);
  useEffect(() => {
    let active = true;
    api
      .bootstrap()
      .then((r) => {
        if (active) setBoot(r);
      })
      .catch((e) => {
        if (active) setError(futureLeadError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const cancelRequests = useCallback(() => {
    request.current++;
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => {
      clearTimeout(timer);
      cancelRequests();
    };
  }, [load, query, cancelRequests]);
  const show = useCallback(async (id: string) => {
    const token = ++detailRequest.current;
    setFormError("");
    setNotice("");
    setRecord(null);
    setLoadingDetail(true);
    setOpen(true);
    setBusy(true);
    setConfirmConvert(false);
    try {
      const r = await api.detail(id);
      if (token !== detailRequest.current) return;
      setRecord(r.data);
      setInput(fill(r.data));
      setEditStatus(r.data.status);
      setEvents(r.events);
      savedInput.current = JSON.stringify(fill(r.data));
      key.current = crypto.randomUUID();
    } catch (e) {
      if (token === detailRequest.current) {
        setOpen(false);
        setError(futureLeadError(e));
      }
    } finally {
      if (token === detailRequest.current) {
        setBusy(false);
        setLoadingDetail(false);
      }
    }
  }, []);
  useEffect(() => {
    if (selected) void show(selected);
    else {
      detailRequest.current++;
      existingRequest.current++;
      setOpen(false);
      setBusy(false);
      setLoadingDetail(false);
    }
  }, [selected, show]);
  const close = () => {
    if (busy) return;
    detailRequest.current++;
    existingRequest.current++;
    setOpen(false);
    setConfirmConvert(false);
    if (selected)
      setParams(
        (p) => {
          p.delete("futureLead");
          return p;
        },
        { replace: true },
      );
  };
  const create = (target: HTMLElement) => {
    opener.current = target;
    existingRequest.current++;
    setLoadingDetail(false);
    setNotice("");
    setRecord(null);
    setInput({ ...empty(), staffIds: boot ? [boot.currentUserId] : [] });
    setLeadId("");
    setMode("new");
    setEditStatus("scheduled");
    setEvents([]);
    setFormError("");
    setConfirmConvert(false);
    key.current = crypto.randomUUID();
    setOpen(true);
  };
  const update = <K extends keyof FutureLeadInput>(
    key: K,
    value: FutureLeadInput[K],
  ) => {
    setInput((p) => ({ ...p, [key]: value }));
    setFormError("");
    setConfirmConvert(false);
  };
  const editable =
    !!boot &&
    (record
      ? record.can_edit && record.status !== "converted"
      : boot.canCreate);
  const dirty = record && JSON.stringify(input) !== savedInput.current;
  async function save() {
    const parsed = futureLeadInput.safeParse(input);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues
          .map((i) =>
            i.path.includes("requirements")
              ? "Cerințele pot avea maximum 500 de caractere."
              : i.path.includes("name")
                ? "Completează persoana de contact sau firma."
                : `Verifică ${({ title: "titlul", source: "sursa", contactOn: "data", email: "e-mailul", phone: "telefonul" } as Record<string, string>)[String(i.path[0])] || "câmpurile"}.`,
          )
          .join(" "),
      );
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      if (record) {
        const r = await api.update(
          record.lead_id,
          parsed.data,
          record.revision,
          editStatus,
        );
        setEvents((previous) =>
          [
            {
              action:
                editStatus !== record.status
                  ? editStatus
                  : input.contactOn !== record.contact_on
                    ? "rescheduled"
                    : "updated",
              created_at: r.data.updated_at,
              revision: r.data.revision,
            },
            ...previous,
          ].slice(0, 20),
        );
        setRecord(r.data);
        savedInput.current = JSON.stringify(fill(r.data));
        setInput(fill(r.data));
        setNotice("Fișa a fost actualizată.");
      } else {
        const r = await api.create(
          parsed.data,
          key.current,
          leadId || undefined,
        );
        setNotice("Lead programat. Reminderele sunt active.");
        setParams(
          (p) => {
            p.set("futureLead", r.id);
            return p;
          },
          { replace: true },
        );
      }
      await load();
    } catch (e) {
      setFormError(futureLeadError(e));
    } finally {
      setBusy(false);
    }
  }
  async function convert() {
    if (!record) return;
    setBusy(true);
    setFormError("");
    try {
      const project = await api.convert(
        record.lead_id,
        record.revision,
        stage,
        key.current,
      );
      setNotice("Proiect creat cu informațiile și membrii alocați.");
      setOpen(false);
      navigate(`/intern/projects/${encodeURIComponent(project.slug)}`);
    } catch (e) {
      setFormError(futureLeadError(e));
    } finally {
      setBusy(false);
    }
  }
  async function chooseExisting(id: string) {
    const token = ++existingRequest.current;
    setLeadId(id);
    if (!id) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const r = await leadsApi.detail(id);
      if (token !== existingRequest.current) return;
      const l = r.data;
      setInput((p) => ({
        ...p,
        title: l.product || l.business || l.name || "Proiect viitor",
        name: l.name || "",
        business: l.business || "",
        email: l.email || "",
        phone: l.phone || "",
        source: l.source || "",
        requirements: (l.message || "").slice(0, 500),
        staffIds: r.assignments.map((a) => a.user_id),
      }));
    } catch (e) {
      if (token === existingRequest.current) {
        setLeadId("");
        setFormError(futureLeadError(e));
      }
    } finally {
      if (token === existingRequest.current) setBusy(false);
    }
  }
  const hasErrors = !!error;
  return (
    <section
      className="mx-auto max-w-6xl space-y-4 pb-8"
      aria-label="Leaduri Viitoare"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[.18em] text-primary">
            <CalendarClock className="h-4 w-4" /> AVYRON · Planificare
          </div>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-semibold focus-visible:outline-primary"
          >
            Leaduri Viitoare
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Clienți confirmați, cu următorul pas programat. Cele mai apropiate
            contactări apar primele.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Reîncarcă leadurile"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {boot?.canCreate && (
            <Button onClick={(event) => create(event.currentTarget)}>
              <Plus className="mr-2 h-4 w-4" /> Adaugă / programează
            </Button>
          )}
        </div>
      </header>
      <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Remindere în notificări cu{" "}
        <strong className="text-foreground">10, 5 și 1 zi</strong> înainte,
        pentru Owner / Super Admin și membrii alocați. Verificare de la ora
        09:00, ora României.
      </div>
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută client, proiect, sursă sau cerințe…"
            aria-label="Caută leaduri viitoare"
            className="pl-9"
          />
        </div>
        <Button
          variant={settings ? "secondary" : "outline"}
          size="icon"
          aria-label="Opțiuni listă"
          aria-expanded={settings}
          onClick={() => setSettings((p) => !p)}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
      {settings && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <div className="w-56">
            <Choice
              label="Starea leadurilor"
              value={status}
              onChange={setStatus}
              options={[
                { id: "active", label: "Programate / contactate" },
                { id: "converted", label: "Transformate în proiect" },
                { id: "archived", label: "Arhivate" },
                { id: "all", label: "Toate" },
              ]}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Ordine cronologică · cele restante rămân vizibile
          </span>
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 p-3 text-sm"
        >
          {error}{" "}
          <Button
            variant="link"
            onClick={() => {
              void load();
              if (!boot)
                void api
                  .bootstrap()
                  .then(setBoot)
                  .catch(() => {});
            }}
          >
            Reîncearcă
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-400">
          {notice}
        </p>
      )}
      <div
        aria-busy={loading}
        className="overflow-hidden rounded-2xl border border-white/10 bg-card/60"
      >
        <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
          <span>
            {status === "active"
              ? "Următoarele contactări"
              : "Evidență leaduri"}
          </span>
          <span>
            {rows.length}
            {hasMore ? "+" : ""} în listă
          </span>
        </div>
        {loading && !rows.length ? (
          <p className="p-5 text-sm text-muted-foreground" role="status">
            Se încarcă programările…
          </p>
        ) : !rows.length && !hasErrors ? (
          <div className="px-5 py-8">
            <CalendarClock className="mb-3 h-7 w-7 text-primary" />
            <p className="font-medium">
              {query
                ? "Niciun lead nu corespunde căutării."
                : "Nicio programare în această listă."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {boot?.canCreate
                ? "Adaugă un client confirmat sau programează un lead existent din CRM."
                : "Aici vor apărea leadurile care îți sunt alocate."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {rows.map((row) => {
              const days = futureDays(row.contact_on);
              return (
                <li
                  key={row.lead_id}
                  className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 sm:px-4"
                >
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-semibold">
                      {date(row.contact_on)}
                    </p>
                    <p
                      className={`mt-1 text-xs ${days < 0 ? "text-amber-400" : days <= 1 ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {row.status === "scheduled"
                        ? days < 0
                          ? `Restant · ${-days} zile`
                          : days === 0
                            ? "Astăzi"
                            : days === 1
                              ? "Mâine"
                              : `În ${days} zile`
                        : FUTURE_LEAD_STATUSES[row.status]}
                    </p>
                  </div>
                  <button
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={(event) => {
                      opener.current = event.currentTarget;
                      setParams((p) => {
                        p.set("futureLead", row.lead_id);
                        return p;
                      });
                    }}
                  >
                    <span className="block break-words text-sm font-semibold">
                      {row.title}
                    </span>
                    <span className="mt-1 block break-words text-xs text-muted-foreground">
                      {row.business || row.name} · Sursă: {row.source}
                    </span>
                    <span className="mt-1 block break-words text-xs text-muted-foreground">
                      {row.staff.length
                        ? row.staff.map((s) => s.name).join(", ")
                        : "Staff de alocat"}{" "}
                      · {PROJECT_KIND_LABELS[row.project_kind]}
                    </span>
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <Contact row={row} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        opener.current = event.currentTarget;
                        setParams((p) => {
                          p.set("futureLead", row.lead_id);
                          return p;
                        });
                      }}
                    >
                      Deschide fișa <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {hasMore && (
        <Button
          className="w-full"
          variant="outline"
          disabled={loading}
          onClick={async () => {
            const token = ++request.current;
            setLoading(true);
            try {
              const r = await api.list(status, query, rows.length);
              if (token === request.current) {
                setRows((p) => [...p, ...r.data]);
                setHasMore(r.hasMore);
              }
            } catch (e) {
              if (token === request.current) setError(futureLeadError(e));
            } finally {
              if (token === request.current) setLoading(false);
            }
          }}
        >
          Mai multe programări <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      )}
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <SheetContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (opener.current?.isConnected) opener.current.focus();
            else heading.current?.focus();
          }}
          className="flex h-dvh w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
          onInteractOutside={(e) => {
            if (busy) e.preventDefault();
          }}
        >
          <SheetHeader className="border-b px-5 pb-4 pt-6">
            <SheetTitle>
              {record
                ? "Fișa leadului viitor"
                : "Programează un lead / proiect"}
            </SheetTitle>
            <SheetDescription>
              {record
                ? "Contact, cerințe, data următorului pas și echipa responsabilă."
                : "Pentru clienți care au confirmat serviciul și au amânat începerea."}
            </SheetDescription>
          </SheetHeader>
          {loadingDetail ? (
            <p role="status" className="p-5 text-sm text-muted-foreground">
              Se încarcă fișa…
            </p>
          ) : (
            <form
              className="space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              {!record && boot?.canCreate && (
                <div className="grid gap-2 rounded-xl border bg-muted/20 p-3">
                  <Choice
                    label="Originea înregistrării"
                    disabled={busy}
                    value={mode}
                    onChange={async (v) => {
                      setMode(v);
                      setLeadId("");
                      if (v === "existing") {
                        try {
                          const r = await leadsApi.list();
                          setExisting(
                            r.data.filter(
                              (l) =>
                                !l.converted_project_id &&
                                !["rejected", "converted"].includes(
                                  l.lifecycle_stage,
                                ),
                            ),
                          );
                        } catch (e) {
                          setFormError(futureLeadError(e));
                        }
                      }
                    }}
                    options={[
                      { id: "new", label: "Client / proiect nou" },
                      { id: "existing", label: "Din Leaduri (CRM existent)" },
                    ]}
                  />
                  {mode === "existing" && (
                    <Choice
                      label="Selectează leadul din CRM"
                      disabled={busy}
                      value={leadId || "none"}
                      onChange={(v) =>
                        void chooseExisting(v === "none" ? "" : v)
                      }
                      options={[
                        { id: "none", label: "Selectează un lead" },
                        ...existing.map((l) => ({
                          id: l.id,
                          label: [l.business || l.name, l.source]
                            .filter(Boolean)
                            .join(" · "),
                        })),
                      ]}
                    />
                  )}
                </div>
              )}
              <fieldset disabled={!editable || busy} className="space-y-4">
                <Field label="Proiect / serviciu dorit *">
                  <Input
                    value={input.title}
                    maxLength={180}
                    onChange={(e) => update("title", e.target.value)}
                    required
                    minLength={2}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Persoană de contact">
                    <Input
                      value={input.name}
                      maxLength={160}
                      onChange={(e) => update("name", e.target.value)}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Firmă / client">
                    <Input
                      value={input.business}
                      maxLength={200}
                      onChange={(e) => update("business", e.target.value)}
                    />
                  </Field>
                  <Field label="Telefon">
                    <Input
                      type="tel"
                      value={input.phone}
                      maxLength={40}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                  <Field label="E-mail">
                    <Input
                      type="email"
                      value={input.email}
                      maxLength={254}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Data contactării / inițierii *">
                    <Input
                      type="date"
                      value={input.contactOn}
                      min={
                        record?.contact_on && record.contact_on < bucharestDay()
                          ? record.contact_on
                          : bucharestDay()
                      }
                      onChange={(e) => update("contactOn", e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Sursa leadului *">
                    <Input
                      value={input.source}
                      maxLength={100}
                      minLength={2}
                      onChange={(e) => update("source", e.target.value)}
                      placeholder="Recomandare, Instagram, GoodFirms…"
                      required
                    />
                  </Field>
                </div>
                <Field label="Tip proiect">
                  <Choice
                    label="Tip proiect"
                    value={input.projectKind}
                    onChange={(v) =>
                      update("projectKind", v as FutureLeadInput["projectKind"])
                    }
                    options={Object.entries(PROJECT_KIND_LABELS).map(
                      ([id, label]) => ({ id, label }),
                    )}
                  />
                </Field>
                <Field label="Ce își dorește clientul">
                  <Textarea
                    value={input.requirements}
                    maxLength={500}
                    rows={4}
                    onChange={(e) => update("requirements", e.target.value)}
                    placeholder="Obiectiv, servicii confirmate, context și următorul pas…"
                  />
                  <span className="text-right text-[11px]">
                    {input.requirements.length}/500 caractere
                  </span>
                </Field>
                {boot?.canManage && (
                  <Field label="Client existent (opțional)">
                    <Choice
                      label="Client existent"
                      value={input.clientId || "none"}
                      onChange={(v) => {
                        const client = boot.clients.find((c) => c.id === v);
                        setInput((previous) => ({
                          ...previous,
                          clientId: v === "none" ? null : v,
                          ...(!record && client
                            ? {
                                business: previous.business || client.name,
                                name:
                                  previous.name || client.contact_name || "",
                                email: previous.email || client.email || "",
                                phone: previous.phone || client.phone || "",
                              }
                            : {}),
                        }));
                        setConfirmConvert(false);
                      }}
                      options={[
                        {
                          id: "none",
                          label: "Fără cont / client asociat încă",
                        },
                        ...boot.clients.map((c) => ({
                          id: c.id,
                          label: c.name,
                        })),
                      ]}
                    />
                    <span className="text-[11px]">
                      Contul clientului nu primește acces până la alocarea
                      explicită în proiect.
                    </span>
                  </Field>
                )}
                {boot?.canManage && (
                  <fieldset className="rounded-xl border p-3">
                    <legend className="px-1 text-xs text-muted-foreground">
                      Membri staff alocați
                    </legend>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {boot.staff.map((s) => (
                        <label
                          key={s.id}
                          className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={input.staffIds.includes(s.id)}
                            onChange={(e) =>
                              update(
                                "staffIds",
                                e.target.checked
                                  ? [...input.staffIds, s.id]
                                  : input.staffIds.filter((id) => id !== s.id),
                              )
                            }
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Poți aloca sau schimba echipa și ulterior.
                    </p>
                  </fieldset>
                )}
                {record && editable && record.status !== "converted" && (
                  <Field label="Stare">
                    <Choice
                      label="Starea programării"
                      value={editStatus}
                      onChange={(v) => {
                        setEditStatus(v);
                        setConfirmConvert(false);
                      }}
                      options={Object.entries(FUTURE_LEAD_STATUSES)
                        .filter(
                          ([id]) =>
                            id !== "converted" &&
                            (boot?.canManage || id !== "archived"),
                        )
                        .map(([id, label]) => ({ id, label }))}
                    />
                  </Field>
                )}
              </fieldset>
              {notice && (
                <p role="status" className="text-sm text-emerald-400">
                  {notice}
                </p>
              )}
              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/50 p-3 text-sm"
                >
                  {formError}
                  {record && (
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => void show(record.lead_id)}
                    >
                      Reîncarcă fișa
                    </Button>
                  )}
                </div>
              )}
              {editable && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={busy || (mode === "existing" && !record && !leadId)}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {busy
                    ? "Se salvează…"
                    : record
                      ? "Salvează modificările"
                      : "Programează leadul"}
                </Button>
              )}
              {record && (
                <div className="rounded-xl border p-3">
                  <Contact row={record} />
                  {record.converted_project_id ? (
                    <Button
                      className="mt-2 w-full"
                      type="button"
                      onClick={() =>
                        navigate(`/intern/projects/${record.project_slug}`)
                      }
                    >
                      Deschide proiectul
                    </Button>
                  ) : (
                    boot?.canConvert &&
                    record.status !== "archived" && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2 w-full"
                          disabled={
                            busy || !!dirty || editStatus !== record.status
                          }
                          onClick={() => setConfirmConvert((p) => !p)}
                        >
                          Transformă în proiect
                        </Button>
                        {dirty && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Salvează modificările înainte de conversie.
                          </p>
                        )}
                        {confirmConvert && (
                          <div className="mt-3 space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Se preiau titlul, cerințele, sursa, contactele și
                              membrii alocați. Leadul rămâne în istoricul CRM.
                            </p>
                            <Choice
                              label="Etapa proiectului"
                              value={stage}
                              onChange={(v) => setStage(v as ProjectStage)}
                              options={PROJECT_STAGES.map((s) => ({
                                id: s.id,
                                label: s.label,
                              }))}
                            />
                            <Button
                              type="button"
                              className="w-full"
                              disabled={busy}
                              onClick={() => void convert()}
                            >
                              Confirmă crearea proiectului
                            </Button>
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
              {events.length > 0 && (
                <details className="rounded-xl border p-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Istoric · {events.length} modificări recente
                  </summary>
                  <ol className="mt-3 space-y-2">
                    {events.map((e) => (
                      <li
                        key={e.revision}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {(
                            {
                              scheduled: "Programat",
                              rescheduled: "Reprogramat",
                              updated: "Fișă actualizată",
                              contacted: "Contactat",
                              archived: "Arhivat",
                              converted: "Transformat în proiect",
                            } as Record<string, string>
                          )[e.action] || e.action}
                        </span>
                        <time>
                          {new Date(e.created_at).toLocaleString("ro-RO")}
                        </time>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
