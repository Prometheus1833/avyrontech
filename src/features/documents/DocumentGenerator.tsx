import type {AgencyDocumentSeed} from "@/lib/leadsAgencyApi";
import {
  automaticDocumentFields,
  consistentSubscriptionBilling,
} from "@/shared/documents/autofill";
import { useMemo, useState } from "react";
import { clientWorkspaceApi } from "@/lib/clientWorkspaceApi";
import { ENTITY_TYPES } from "@/shared/documents/model";
import type { ClientEntityType } from "@/shared/clientWorkspace";
import { useRef } from "react";
import { internApi } from "@/lib/internApi";
import {
  documentsApi,
  type DocumentContext,
  type DocumentTemplate,
} from "@/lib/documentsApi";
import {
  blankPayload,
  heading,
  paragraph,
  replaceVariables,
  documentIssues,
  type DocumentPayload,
  type DocumentScope,
  type Assignment,
  type CommercialLine,
} from "@/shared/documents/model";
import { serviceDocumentProfile } from "@/shared/documents/services";
import { applicableTemplatePayload, FIELD_LABELS, templateFields } from "@/shared/documents/templates";
import DocumentReader from "./DocumentReader";

export type GeneratedDocumentAction = "edit" | "pdf" | "docx" | "share";
const steps = [
  "Context și model",
  "Date și personalizare",
  "Verificare",
  "Creare",
];
export default function DocumentGenerator({
  context,
  agencySeed,
  lockedClientId,
  projectId,
  initialTemplateVersion,
  initialClientId,
  initialServiceId,
  initialSubscriptionId,
  company = false,
  initialScope,
  onCreated,
  onCancel,
  onContextRefresh,
  canExport = false,
  canShare = false,
}: {
  context: DocumentContext;
  agencySeed?: AgencyDocumentSeed;
  lockedClientId?: string;
  projectId?: string;
  initialTemplateVersion?: string;
  initialClientId?: string;
  initialServiceId?: string;
  initialSubscriptionId?: string;
  company?: boolean;
  initialScope?: DocumentScope;
  onCreated: (id: string, action: GeneratedDocumentAction) => void;
  onCancel: () => void;
  onContextRefresh: () => Promise<void>;
  canExport?: boolean;
  canShare?: boolean;
}) {
  const contextKey = useRef(crypto.randomUUID());
  const [manualMode, setManualMode] = useState(!!agencySeed && !agencySeed.clientId);
  const [manual, setManual] = useState({ name: agencySeed?.name || "", type: "", email: agencySeed?.email || "", tax: "", registration: "", address: "", representative: "" });
  const [futureProject, setFutureProject] = useState({ name: agencySeed?.projectName || "", description: agencySeed?.description || "" });
  const seedServiceId = initialScope ? undefined : initialServiceId;
  const seedSubscriptionId = initialScope ? undefined : initialSubscriptionId;
  const seedSubscription = context.subscriptions.find(
    (s) => s.id === seedSubscriptionId,
  );
  const seedService = context.services.find((s) => s.id === seedServiceId);
  const initialProject = initialScope
    ? undefined
    : context.projects.find(
        (p) =>
          p.id ===
          (projectId ||
            seedSubscription?.project_id ||
            seedService?.project_id),
      );
  const seedProjectId = initialProject?.id;
  const seedClientId =
    lockedClientId ||
    (initialScope
      ? ""
      : initialProject?.client_id ||
        seedSubscription?.client_id ||
        seedService?.client_id ||
        initialClientId ||
        agencySeed?.clientId ||
        "");
  const [step, setStep] = useState(0),
    [clientId, setClientId] = useState(seedClientId),
    [projects, setProjects] = useState<string[]>(
      seedProjectId ? [seedProjectId] : [],
    ),
    [scope, setScope] = useState<DocumentScope>(
      lockedClientId ? "client" : initialScope || "client",
    ),
    [selected, setSelected] = useState<string[]>(
      initialTemplateVersion &&
        context.templates.some((t) => t.version_id === initialTemplateVersion)
        ? [initialTemplateVersion]
        : [],
    ),
    [catalogIds, setCatalogIds] = useState<string[]>(
      [...new Set([...(agencySeed?.serviceId && context.catalog.some(c=>c.id===agencySeed.serviceId) ? [agencySeed.serviceId] : []), ...context.services
        .filter(
          (s) =>
            (s.id === seedServiceId ||
              (!!seedProjectId && s.project_id === seedProjectId)) &&
            s.catalog_code_id,
        )
        .map((s) => s.catalog_code_id!)])],
    ),
    [instanceIds, setInstanceIds] = useState<string[]>(
      context.services
        .filter(
          (s) =>
            s.id === seedServiceId ||
            (!!seedProjectId && s.project_id === seedProjectId),
        )
        .map((s) => s.id),
    ),
    [subscriptionIds, setSubscriptionIds] = useState<string[]>(
      context.subscriptions
        .filter(
          (s) =>
            s.id === seedSubscriptionId ||
            (!!seedProjectId && s.project_id === seedProjectId),
        )
        .map((s) => s.id),
    ),
    [productIds, setProductIds] = useState<string[]>([]),
    [purchases, setPurchases] = useState<string[]>([]),
    [entitlements, setEntitlements] = useState<string[]>([]),
    [billingSubscriptions, setBillingSubscriptions] = useState<string[]>([]),
    [fields, setFields] = useState<Record<string, string>>({}),
    [lines, setLines] = useState<CommercialLine[]>([]),
    [titles, setTitles] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState<string[]>([]),
    [newClient, setNewClient] = useState({
      company_name: "",
      email: "",
      contact_name: "",
    }),
    [newProject, setNewProject] = useState(""),
    [newMode, setNewMode] = useState<"client" | "project" | null>(null);
  const [batchKey] = useState(() => crypto.randomUUID());
  const [documentDate] = useState(() => new Date().toLocaleDateString("ro-RO"));
  const [creationStarted, setCreationStarted] = useState(false);
  const [legalDocument, setLegalDocument] = useState(false);
  const client = context.clients.find((c) => c.id === clientId);
  const models = useMemo(
    () =>
      selected.length
        ? context.templates.filter((t) => selected.includes(t.version_id))
        : [
            {
              id: "blank",
              name: "Document nou",
              version_id: "",
              payload: blankPayload(),
              required: [],
              legal: 0,
              version: 1,
              family: "custom",
              review_status: "review_required",
            } as DocumentTemplate,
          ],
    [selected, context.templates],
  );
  const subscriptionBilling = consistentSubscriptionBilling(
    context.subscriptions
      .filter(
        (s) =>
          s.client_id === clientId &&
          subscriptionIds.includes(s.id) &&
          s.billing,
      )
      .map((s) => s.billing!),
  );
  const automatic: Record<string, string> = {
    ...automaticDocumentFields(
      context.company,
      manualMode ? { company_name: manual.name, legal_name: manual.name, entity_type: manual.type, email: manual.email, tax_id: manual.tax, registration_number: manual.registration, address: manual.address, representative: manual.representative } : client,
      documentDate,
      scope !== "client",
      subscriptionBilling,
    ),
    "project.future_name": futureProject.name,
    "project.future_description": futureProject.description,
    scope: [
      futureProject.name,
      ...catalogIds.map(
        (id) => context.catalog.find((c) => c.id === id)?.display_name,
      ),
      ...instanceIds.map(
        (id) => context.services.find((s) => s.id === id)?.service_name,
      ),
      ...projects.map((id) => context.projects.find((p) => p.id === id)?.name),
      ...productIds.map(
        (id) => context.products.find((p) => p.slug === id)?.name_ro,
      ),
    ]
      .filter(Boolean)
      .join("; "),
    privacy_mode: "Confidențialitate",
    offer_variant: "Ofertă personalizată",
    deliverables: catalogIds.flatMap((id) => {
      const item = context.catalog.find((c) => c.id === id);
      if (!item) return [];
      return `${item.display_name}: ${serviceDocumentProfile(item, context.serviceProfiles.find((p) => p.catalog_id === id)?.configuration_json).deliverables}`;
    }).join("\n"),
    objectives: futureProject.description.trim(),
    ...fields,
  };
  const serviceFields = Object.fromEntries(
    catalogIds.flatMap((id) => {
      const item = context.catalog.find((c) => c.id === id);
      if (!item) return [];
      const profile = serviceDocumentProfile(
        item,
        context.serviceProfiles.find((p) => p.catalog_id === id)
          ?.configuration_json,
      );
      return Object.entries(profile.fields).map(([key, label]) => [
        `service.${id}.${key}`,
        `${item.display_name} · ${label}`,
      ]);
    }),
  );
  const allFields = [
    ...new Set([
      ...models.flatMap((t) => [
        ...t.required,
        ...templateFields(applicableTemplatePayload(t.payload, t.family, automatic)),
        ...(t.family === "offer" ? ["optional_extras"] : []),
      ]),
      ...Object.keys(serviceFields),
      ...Object.keys(automatic).filter((key) => key.startsWith("provider.") || (manualMode && key.startsWith("beneficiary.")) || (!!futureProject.name && key.startsWith("project.future_"))),
      ...(productIds.length ||
      entitlements.length ||
      billingSubscriptions.length
        ? ["license_terms"]
        : []),
    ]),
  ];
  const groupedFields = [
    [
      "Beneficiar și contact",
      allFields.filter(
        (k) =>
          (!manualMode && k.startsWith("beneficiary.")) ||
          k === "contacts" ||
          k === "signatories",
      ),
    ],
    [
      "Conținut și condiții",
      allFields.filter(
        (k) =>
          !k.startsWith("provider.") &&
          !k.startsWith("project.future_") &&
          !k.startsWith("beneficiary.") &&
          !k.startsWith("service.") &&
          !["contacts", "signatories"].includes(k),
      ),
    ],
    [
      "Detalii pentru activitatea selectată",
      allFields.filter((k) => k.startsWith("service.")),
    ],
    ["Emitent AVYRON", allFields.filter((k) => k.startsWith("provider."))],
  ] as [string, string[]][];
  const extraLabels: Record<string, string> = {
    "provider.registration_number": "Registrul Comerțului AVYRON",
    "provider.representative": "Reprezentant AVYRON",
    "beneficiary.tax_id": "CUI beneficiar",
    "beneficiary.contact_email": "E-mail beneficiar",
  };
  const selectProject = (id: string) => {
    const included = projects.includes(id);
    setProjects((v) => (included ? v.filter((x) => x !== id) : [...v, id]));
    const services = context.services.filter((s) => s.project_id === id);
    setInstanceIds((v) =>
      included
        ? v.filter((x) => !services.some((s) => s.id === x))
        : [...new Set([...v, ...services.map((s) => s.id)])],
    );
    setSubscriptionIds((v) =>
      included
        ? v.filter(
            (x) =>
              !context.subscriptions.some(
                (s) => s.id === x && s.project_id === id,
              ),
          )
        : [
            ...new Set([
              ...v,
              ...context.subscriptions
                .filter((s) => s.project_id === id)
                .map((s) => s.id),
            ]),
          ],
    );
    const removedCatalog = services
      .map((s) => s.catalog_code_id)
      .filter((id): id is string => !!id);
    const remainingCatalog = new Set(
      context.services
        .filter((s) => s.project_id !== id && instanceIds.includes(s.id))
        .map((s) => s.catalog_code_id),
    );
    if (included) {
      const remove = (catalogId: string) =>
        removedCatalog.includes(catalogId) && !remainingCatalog.has(catalogId);
      setCatalogIds((v) => v.filter((catalogId) => !remove(catalogId)));
      setLines((v) => v.filter((line) => !remove(line.catalogId)));
    } else setCatalogIds((v) => [...new Set([...v, ...removedCatalog])]);
  };
  const recommended = new Set([
    ...(catalogIds.length
      ? catalogIds.flatMap((id) => {
          const item = context.catalog.find((c) => c.id === id);
          return item
            ? serviceDocumentProfile(
                item,
                context.serviceProfiles.find((p) => p.catalog_id === id)
                  ?.configuration_json,
              ).documents
            : [];
        })
      : ["brief", "offer"]),
    ...(subscriptionIds.length || billingSubscriptions.length ? ["sla"] : []),
    ...(projects.some((id) =>
      context.projects.some(
        (p) =>
          p.id === id && /completed|delivered|finalizat|predat/.test(p.status),
      ),
    )
      ? ["handover", "report"]
      : []),
  ]);
  const build = (model: DocumentTemplate): DocumentPayload => {
    const original = applicableTemplatePayload(model.payload, model.family, automatic);
    const relevantFields = new Set([
      ...model.required,
      ...templateFields(original),
      ...Object.keys(serviceFields),
      ...Object.keys(automatic).filter((key) => key.startsWith("provider.") || (manualMode && key.startsWith("beneficiary.")) || (!!futureProject.name && key.startsWith("project.future_"))),
      ...(productIds.length ||
      entitlements.length ||
      billingSubscriptions.length
        ? ["license_terms"]
        : []),
    ]);
    const modelFields = Object.fromEntries(
      Object.entries(automatic).filter(([key]) => relevantFields.has(key)),
    );
    const value = replaceVariables(
      {
        ...original,
        title: titles[model.version_id] || model.payload.title,
        lines: lines.filter(
          (line) => !line.package || line.package === automatic.package_variant,
        ),
      },
      modelFields,
    );
    const sections = catalogIds.flatMap((id) => {
      const item = context.catalog.find((c) => c.id === id);
      if (!item) return [];
      const profile = serviceDocumentProfile(
        item,
        context.serviceProfiles.find((p) => p.catalog_id === id)
          ?.configuration_json,
      );
      return [
        heading(`Serviciu: ${item.display_name}`),
        paragraph(profile.deliverables),
        ...Object.entries(profile.fields).map(([key, label]) =>
          paragraph(
            `${label}: ${automatic[`service.${id}.${key}`] || `{{service.${id}.${key}}}`}`,
          ),
        ),
      ];
    });
    const productSections = productIds.flatMap((id) => {
      const p = context.products.find((p) => p.slug === id);
      return p
        ? [
            heading(`Produs: ${p.name_ro}`),
            paragraph(
              `Produs ${p.slug} · acces ${p.access}. Licența, utilizările permise, perioada și actualizările sunt cele aprobate expres: ${automatic.license_terms || "{{license_terms}}"}. Achiziția și contul sunt asociate numai după verificarea beneficiarului; nu se transferă implicit drepturi suplimentare.`,
            ),
          ]
        : [];
    });
    return {
      ...value,
      labels: { ...value.labels, ...FIELD_LABELS, ...serviceFields },
      body: {
        ...value.body,
        content: [
          ...(manualMode ? [heading("Beneficiar"), paragraph([manual.name, manual.type, manual.tax ? `Cod fiscal: ${manual.tax}` : "", manual.registration ? `Înregistrare: ${manual.registration}` : "", manual.address, manual.email, manual.representative ? `Reprezentant: ${manual.representative}` : ""].filter(Boolean).join(" · "))] : []),
          ...(value.body.content || []),
          ...(futureProject.name.trim() ? [heading("Context proiect viitor"), paragraph(futureProject.name.trim()), ...(futureProject.description.trim() ? [paragraph(futureProject.description.trim())] : [])] : []),
          ...sections,
          ...productSections,
          ...(purchases.length ||
          entitlements.length ||
          billingSubscriptions.length
            ? [
                heading("Achiziții și accesuri asociate"),
                ...context.purchases
                  .filter((p) => purchases.includes(p.id))
                  .map((p) =>
                    paragraph(
                      `Achiziție înregistrată la ${new Date(p.created_at).toLocaleDateString("ro-RO")}, valoare ${(p.total_cents / 100).toLocaleString("ro-RO")} ${p.currency}, stare ${p.status}. Asocierea nu modifică starea plății.`,
                    ),
                  ),
                ...context.entitlements
                  .filter((p) => entitlements.includes(p.id))
                  .map((p) =>
                    paragraph(
                      `Acces pentru ${p.slug || p.plan}, acordat la ${new Date(p.granted_at).toLocaleDateString("ro-RO")}${p.expires_at ? `, valabil până la ${new Date(p.expires_at).toLocaleDateString("ro-RO")}` : ""}${p.revoked_at ? ", revocat" : ""}. Drepturi și condiții aprobate: ${automatic.license_terms || "{{license_terms}}"}.`,
                    ),
                  ),
                ...context.billingSubscriptions
                  .filter((p) => billingSubscriptions.includes(p.id))
                  .map((p) =>
                    paragraph(
                      `Abonament ${p.sku}, perioadă ${p.period}, stare ${p.status}${p.current_period_end ? `, perioadă curentă până la ${new Date(p.current_period_end).toLocaleDateString("ro-RO")}` : ""}. Condiții de utilizare aprobate: ${automatic.license_terms || "{{license_terms}}"}.`,
                    ),
                  ),
              ]
            : []),
        ],
      },
    };
  };
  const toggle = (
    setter: (updater: (current: string[]) => string[]) => void,
    id: string,
  ) =>
    setter((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    );
  const addLine = (id: string) => {
    const item = context.catalog.find((c) => c.id === id);
    if (!item) return;
    setCatalogIds((value) => (value.includes(id) ? value : [...value, id]));
    setLines((value) =>
      value.some((line) => line.catalogId === id)
        ? value
        : [
            ...value,
            {
              catalogId: id,
              label: item.display_name,
              sku: item.sku || "",
              quantity: 1,
              catalogPriceMinor: item.base_price_minor,
              priceConfirmed: item.base_price_minor !== null && item.price_model === "fixed",
              offeredPriceMinor: item.base_price_minor ?? 0,
              discountReason: "",
              currency: item.currency,
              vatBasisPoints: item.vat_basis_points,
              taxVerified: item.tax_status === "verified",
              billingCycle: item.billing_cycle,
              priceModel: item.price_model,
              package: "",
            },
          ],
    );
  };
  const createContext = async () => {
    setBusy(true);
    setError("");
    try {
      if (newMode === "client") {
        const r = await clientWorkspaceApi.create({ identity: { companyName: newClient.company_name.trim(), legalName: newClient.company_name.trim(), email: newClient.email.trim(), contactName: newClient.contact_name, phone: "", entityType: (manualMode && manual.type ? manual.type : "Altă formă") as ClientEntityType, taxId: manualMode ? manual.tax : "", registrationNumber: manualMode ? manual.registration : "", address: manualMode ? manual.address : "", representative: manualMode ? manual.representative : "", notes: "", status: "active" }, account: { mode: "none" } }, contextKey.current);
        await onContextRefresh();
        setClientId(r.id);
        setManualMode(false);
        setScope("client");
        setProjects([]);
      } else if (clientId && newProject.trim()) {
        const r = await internApi.createProject({
          name: newProject,
          stage: "proposed",
          client_id: clientId,
          organization_id: client?.organization_id || undefined,
        }, contextKey.current);
        await onContextRefresh();
        setProjects((value) => [...value, r.id]);
      }
      contextKey.current = crypto.randomUUID();
      setNewMode(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const create = async (action: GeneratedDocumentAction = "edit") => {
    setCreationStarted(true);
    setBusy(true);
    setError("");
    const results = [...created];
    try {
      for (const [i, model] of models.entries()) {
        if (results[i]) continue;
        const assignments: Assignment[] = [
          ...projects.map((id) => ({ kind: "project" as const, id })),
          ...instanceIds.map((id) => ({ kind: "service" as const, id })),
          ...subscriptionIds.map((id) => ({
            kind: "subscription" as const,
            id,
          })),
          ...productIds.map((id) => ({ kind: "product" as const, id })),
          ...catalogIds.map((id) => ({ kind: "catalog" as const, id })),
          ...purchases.map((id) => ({ kind: "order" as const, id })),
          ...entitlements.map((id) => ({ kind: "entitlement" as const, id })),
          ...billingSubscriptions.map((id) => ({
            kind: "billing_subscription" as const,
            id,
          })),
        ];
        const result = await documentsApi.create(
          {
            payload: build(model),
            scope: manualMode && scope === "client" ? "internal" : scope,
            collection: "library",
            beneficiaryId: scope === "client" && !manualMode ? clientId : null,
            templateVersionId: model.version_id || null,
            legal: !!model.legal || legalDocument,
            assignments,
          },
          `${batchKey}_${i}`,
        );
        results[i] = result.id;
        setCreated([...results]);
      }
      onCreated(results[0], action);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const contextError =
    scope === "client" && (manualMode ? !manual.name.trim() : !clientId)
      ? manualMode ? "Completează numele beneficiarului." : "Selectează beneficiarul juridic."
      : scope !== "client" && projects.length
        ? "Documentele asociate proiectelor trebuie să aibă beneficiarul proiectelor."
        : "";
  return (
    <section className="dc-grid" aria-label="Generator de documente">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Generator de documente</h2>
          <p className="mt-1 text-sm text-slate-400">
            Alege contextul și modelul. Datele AVYRON sunt precompletate;
            personalizezi doar ce este necesar.
          </p>
        </div>
        <button type="button" className="dc-button" onClick={onCancel}>
          Înapoi la Biblioteca Agenției
        </button>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label="Etapele generatorului">
        {steps.map((name, i) => (
          <li key={name}>
            <button
              className="dc-button"
              type="button"
              aria-current={step === i ? "step" : undefined}
              disabled={
                busy ||
                (creationStarted && i !== 3) ||
                i > step + 1 ||
                (!!contextError && i > 0)
              }
              onClick={() => setStep(i)}
            >
              {i + 1}. {name}
            </button>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="dc-notice">
          {error}
        </p>
      )}
      {step === 0 && (
        <div className="dc-panel dc-grid md:grid-cols-2">
          <label className="dc-label">
            Vizibilitate
            <select
              className="dc-input"
              value={scope}
              aria-label="Vizibilitate"
              disabled={!!lockedClientId}
              onChange={(e) => {
                setScope(e.target.value as DocumentScope);
                setManualMode(false);
                setNewMode(null);
                setFutureProject({ name: "", description: "" });
                if (e.target.value !== "client") {
                  setClientId("");
                  setFields({});
                  setLines([]);
                  setCatalogIds([]);
                  setTitles({});
                  setProjects([]);
                  setInstanceIds([]);
                  setSubscriptionIds([]);
                  setPurchases([]);
                  setEntitlements([]);
                  setBillingSubscriptions([]);
                }
              }}
            >
              <option value="internal">Intern / independent</option>
              <option value="client">Pentru client</option>
              <option value="staff">Pentru staff</option>
              {company && (
                <option value="company">Documente SC · acces autorizat</option>
              )}
            </select>
          </label>
          {scope === "client" && (
            <>
              {!lockedClientId && <fieldset className="md:col-span-2 flex flex-wrap gap-4 rounded-xl border border-white/10 p-3"><legend className="px-1 text-xs text-slate-400">Beneficiar</legend>{[[false,"Client existent / CRM"],[true,"Completare directă"]].map(([value,label]) => <label key={String(label)} className="dc-check"><input type="radio" name="document-beneficiary-mode" checked={manualMode === value} onChange={() => { setManualMode(value as boolean); setNewMode(null); setFutureProject({name:"",description:""}); setClientId(""); setProjects([]); setInstanceIds([]); setSubscriptionIds([]); setPurchases([]); setEntitlements([]); setBillingSubscriptions([]); setFields({}); setCatalogIds([]); setLines([]); }} />{label as string}</label>)}</fieldset>}
              {manualMode && <div className="dc-grid md:col-span-2"><p className="dc-notice text-xs">Beneficiarul se completează direct în document. Documentul rămâne intern, fără cont sau acces în portal creat automat.</p><div className="dc-grid md:grid-cols-2">
                <label className="dc-label">Nume / denumire beneficiar *<input className="dc-input" maxLength={180} value={manual.name} onChange={e => setManual({...manual,name:e.target.value})} /></label>
                <label className="dc-label">Forma beneficiarului<select className="dc-input" value={manual.type} onChange={e => setManual({...manual,type:e.target.value})}><option value="">Selectează forma</option>{ENTITY_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
                {[["email","E-mail beneficiar"],["tax","CUI / cod fiscal beneficiar"],["registration","Număr de înregistrare beneficiar"],["address","Adresă beneficiar"],["representative","Reprezentant beneficiar"]].map(([key,label]) => <label className="dc-label" key={key}>{label}<input className="dc-input" type={key === "email" ? "email" : "text"} maxLength={key === "address" ? 600 : 254} value={manual[key as keyof typeof manual]} onChange={e => setManual({...manual,[key]:e.target.value})} /></label>)}
              </div></div>}
              {!manualMode && <label className="dc-label">
                Beneficiar juridic
                <select
                  className="dc-input"
                  value={clientId}
                  disabled={!!lockedClientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setFutureProject({ name: "", description: "" });
                    setLines([]);
                    setCatalogIds([]);
                    setTitles({});
                    setProjects([]);
                    setInstanceIds([]);
                    setSubscriptionIds([]);
                    setPurchases([]);
                    setEntitlements([]);
                    setBillingSubscriptions([]);
                    setFields({});
                  }}
                >
                  <option value="">Selectează clientul</option>
                  {context.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </label>}
              <div className="dc-grid">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="dc-button"
                    disabled={!!lockedClientId}
                    onClick={() => { if (manualMode) setNewClient({company_name:manual.name,email:manual.email,contact_name:manual.representative}); setNewMode("client"); }}
                  >
                    {manualMode ? "Salvează beneficiarul în CRM" : "Client nou în CRM"}
                  </button>
                  <button
                    className="dc-button"
                    disabled={!clientId}
                    onClick={() => setNewMode("project")}
                  >
                    Proiect nou
                  </button>
                </div>
                {context.projects
                  .filter((p) => p.client_id === clientId)
                  .map((p) => (
                    <label className="dc-check" key={p.id}>
                      <input
                        type="checkbox"
                        checked={projects.includes(p.id)}
                        onChange={() => selectProject(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
              </div>
              <div className="dc-grid">
                <p className="dc-label">Instanțe de servicii și abonamente</p>
                {context.services
                  .filter(
                    (s) =>
                      s.client_id === clientId &&
                      (!projects.length || projects.includes(s.project_id)),
                  )
                  .map((s) => (
                    <label key={s.id} className="dc-check">
                      <input
                        type="checkbox"
                        checked={instanceIds.includes(s.id)}
                        onChange={() => toggle(setInstanceIds, s.id)}
                      />
                      {s.service_name}
                    </label>
                  ))}
                {context.subscriptions
                  .filter(
                    (s) =>
                      s.client_id === clientId &&
                      (!projects.length || projects.includes(s.project_id)),
                  )
                  .map((s) => (
                    <label key={s.id} className="dc-check">
                      <input
                        type="checkbox"
                        checked={subscriptionIds.includes(s.id)}
                        onChange={() => toggle(setSubscriptionIds, s.id)}
                      />
                      {s.service_name} · {s.status}
                    </label>
                  ))}
                {[
                  {
                    label: "Achiziție",
                    items: context.purchases
                      .filter((p) => p.client_id === clientId)
                      .map((p) => ({
                        id: p.id,
                        label: `${new Date(p.created_at).toLocaleDateString("ro-RO")} · ${(p.total_cents / 100).toLocaleString("ro-RO")} ${p.currency} · ${p.status}`,
                      })),
                    selected: purchases,
                    set: setPurchases,
                  },
                  {
                    label: "Licență / acces",
                    items: context.entitlements
                      .filter((p) => p.client_id === clientId)
                      .map((p) => ({
                        id: p.id,
                        label: `${p.slug || p.plan} · ${p.revoked_at ? "revocat" : p.expires_at ? `până la ${new Date(p.expires_at).toLocaleDateString("ro-RO")}` : "conform licenței aprobate"}`,
                      })),
                    selected: entitlements,
                    set: setEntitlements,
                  },
                  {
                    label: "Abonament AVY Studio",
                    items: context.billingSubscriptions
                      .filter((p) => p.client_id === clientId)
                      .map((p) => ({
                        id: p.id,
                        label: `${p.sku} · ${p.period} · ${p.status}`,
                      })),
                    selected: billingSubscriptions,
                    set: setBillingSubscriptions,
                  },
                ].flatMap((group) =>
                  group.items.map((item) => (
                    <label
                      key={`${group.label}:${item.id}`}
                      className="dc-check"
                    >
                      <input
                        type="checkbox"
                        checked={group.selected.includes(item.id)}
                        onChange={() => toggle(group.set, item.id)}
                      />
                      {group.label}: {item.label}
                    </label>
                  )),
                )}
              </div>
            </>
          )}
          {(scope === "client" || scope === "internal") && <div className="md:col-span-2 dc-panel dc-grid"><h3 className="text-sm font-semibold">Proiect viitor / în negociere</h3><p className="text-xs text-slate-400">Opțional. Poți pregăti documentul înainte de crearea proiectului în registru.</p><label className="dc-label">Denumire proiect viitor<input className="dc-input" maxLength={180} value={futureProject.name} onChange={e => setFutureProject({...futureProject,name:e.target.value})} /></label><label className="dc-label">Contextul proiectului viitor<textarea className="dc-input" maxLength={2000} rows={3} value={futureProject.description} onChange={e => setFutureProject({...futureProject,description:e.target.value})} /></label></div>}
          <div className="md:col-span-2 dc-grid md:grid-cols-2">
            <label className="dc-label">
              Serviciu / produs din catalog
              <select
                className="dc-input"
                value=""
                onChange={(e) => addLine(e.target.value)}
              >
                <option value="">Adaugă în selecție și deviz</option>
                {context.catalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="dc-label">
              Produs AVYRON / AVY Studio
              <select
                className="dc-input"
                value=""
                onChange={(e) => toggle(setProductIds, e.target.value)}
              >
                <option value="">Asociază un produs</option>
                {context.products.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name_ro} · {p.access}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            {catalogIds.map((id) => (
              <button
                className="dc-button"
                key={id}
                onClick={() => {
                  setCatalogIds((v) => v.filter((x) => x !== id));
                  setLines((v) => v.filter((x) => x.catalogId !== id));
                }}
              >
                {context.catalog.find((c) => c.id === id)?.display_name} ×
              </button>
            ))}
            {productIds.map((id) => (
              <button
                className="dc-button"
                key={id}
                onClick={() => toggle(setProductIds, id)}
              >
                {context.products.find((p) => p.slug === id)?.name_ro} ×
              </button>
            ))}
          </div>
          {context.unreconciledServices.length > 0 && (
            <p className="dc-notice md:col-span-2">
              {context.unreconciledServices.length} servicii publice necesită
              reconciliere în nomenclator. Prețurile lor nu sunt preluate
              automat din textele publice.{" "}
              <a className="underline" href="/profil?tab=commercial-codes">
                Deschide nomenclatorul
              </a>
              .
            </p>
          )}
          {contextError && (
            <p role="alert" className="dc-notice md:col-span-2">
              {contextError}
            </p>
          )}
          {newMode && (
            <div className="dc-panel md:col-span-2 dc-grid">
              <h3>
                {newMode === "client"
                  ? "Client nou · CRM existent"
                  : "Proiect nou · registru existent"}
              </h3>
              {newMode === "client" ? (
                <>
                  <label className="dc-label">
                    Denumire
                    <input
                      className="dc-input"
                      value={newClient.company_name}
                      onChange={(e) =>
                        setNewClient((v) => ({
                          ...v,
                          company_name: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="dc-label">
                    E-mail
                    <input
                      type="email"
                      className="dc-input"
                      value={newClient.email}
                      onChange={(e) =>
                        setNewClient((v) => ({ ...v, email: e.target.value }))
                      }
                    />
                  </label>
                </>
              ) : (
                <label className="dc-label">
                  Numele proiectului
                  <input
                    className="dc-input"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                  />
                </label>
              )}
              <div className="flex gap-2">
                <button
                  className="dc-button dc-primary"
                  disabled={busy}
                  onClick={() => void createContext()}
                >
                  Creează
                </button>
                <button className="dc-button" onClick={() => setNewMode(null)}>
                  Renunță
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {step === 0 && (
        <div className="dc-grid">
          <p className="text-sm text-slate-400">
            Alege unul sau mai multe modele. Oferta și anexa pot reuni
            serviciile aceluiași beneficiar. Pentru început sunt potrivite
            brief-ul și oferta; pentru livrare, raportul și recepția.
          </p>
          <div className="dc-card-list dc-model-picker">
            {context.templates.map((t) => (
              <label key={t.version_id} className="dc-panel dc-card">
                <span className="dc-check">
                  <input
                    type="checkbox"
                    disabled={
                      t.visibility === "private_proposal" &&
                      t.review_status !== "approved"
                    }
                    checked={selected.includes(t.version_id)}
                    onChange={() => toggle(setSelected, t.version_id)}
                  />
                  <strong>{t.name}</strong>
                  {t.visibility === "private_proposal" && (
                    <span className="text-[10px] text-amber-200">
                      Model privat · accesul urmează documentul sursă
                    </span>
                  )}
                  {recommended.has(t.id) && (
                    <span className="text-[10px] text-violet-200">
                      Recomandat
                    </span>
                  )}
                </span>
                <p>
                  {t.legal
                    ? "Model juridic · verificare de specialitate necesară"
                    : "Model profesional editabil"}{" "}
                  · v{t.version}
                </p>
                <small>
                  {t.review_status === "approved"
                    ? "Model revizuit"
                    : "Model pregătit pentru revizuire"}
                </small>
              </label>
            ))}
          </div>
          {!selected.length && (
            <label className="dc-check">
              <input
                type="checkbox"
                checked={legalDocument}
                onChange={(e) => setLegalDocument(e.target.checked)}
              />
              Document juridic nou · necesită revizuire umană
            </label>
          )}
          <button
            type="button"
            className="dc-button"
            onClick={() => setSelected([])}
          >
            Document de la zero
          </button>
        </div>
      )}
      {step === 1 && (
        <div className="dc-grid">
          <div className="dc-panel dc-grid sm:grid-cols-2">
            {models.map((t) => (
              <label key={t.version_id} className="dc-label">
                Titlu · {t.name}
                <input
                  className="dc-input"
                  value={titles[t.version_id] || t.payload.title}
                  onChange={(e) =>
                    setTitles((v) => ({ ...v, [t.version_id]: e.target.value }))
                  }
                />
              </label>
            ))}
            {groupedFields
              .filter(([, keys]) => keys.length > 0)
              .map(([title, keys]) => (
                <details
                  key={title}
                  className="dc-field-group sm:col-span-2"
                  open={title !== "Emitent AVYRON"}
                >
                  <summary>
                    {title}
                    {title === "Emitent AVYRON"
                      ? ` · ${context.company.legal_name || "Date de completat"}${context.company.tax_id ? ` · CUI ${context.company.tax_id}` : ""}`
                      : ""}
                  </summary>
                  {title === "Emitent AVYRON" && (
                    <p className="mt-2 text-xs text-slate-400">
                      Date preluate din profilul AVYRON. Modificările de mai jos
                      se aplică numai acestui document.
                    </p>
                  )}
                  <div className="dc-grid sm:grid-cols-2 mt-3">
                    {keys.map((key) => (
                      <label key={key} className="dc-label">
                        {FIELD_LABELS[key] ||
                          extraLabels[key] ||
                          serviceFields[key] ||
                          key}
                        {models.some((t) => t.required.includes(key))
                          ? " *"
                          : ""}
                        {key === "privacy_mode" ? (
                          <select
                            className="dc-input"
                            value={automatic[key] || "Confidențialitate"}
                            onChange={(e) =>
                              setFields((v) => ({
                                ...v,
                                [key]: e.target.value,
                              }))
                            }
                          >
                            <option>Confidențialitate</option>
                            <option value="DPA">
                              DPA · necesită analiza rolurilor și anexe
                            </option>
                          </select>
                        ) : key === "beneficiary.entity_type" ? (
                          <select
                            className="dc-input"
                            value={automatic[key] || ""}
                            onChange={(e) =>
                              setFields((v) => ({
                                ...v,
                                [key]: e.target.value,
                              }))
                            }
                          >
                            <option value="">Selectează</option>
                            {context.entityTypes.map((type) => (
                              <option key={type}>{type}</option>
                            ))}
                          </select>
                        ) : (
                          <textarea
                            className="dc-input"
                            rows={
                              key.includes("name") || key === "date" ? 1 : 2
                            }
                            value={automatic[key] || ""}
                            onChange={(e) =>
                              setFields((v) => ({
                                ...v,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            {lines.some((l) => l.package) && (
              <label className="dc-label">
                Varianta de pachet ofertată
                <select
                  className="dc-input"
                  value={fields.package_variant || ""}
                  onChange={(e) =>
                    setFields((v) => ({
                      ...v,
                      package_variant: e.target.value,
                    }))
                  }
                >
                  <option value="">Alege varianta</option>
                  {[
                    ...new Set(lines.map((l) => l.package).filter(Boolean)),
                  ].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            )}
            {productIds.length > 0 && (
              <label className="dc-label">
                Drepturile din licența aprobată
                <textarea
                  className="dc-input"
                  value={fields.license_terms || ""}
                  onChange={(e) =>
                    setFields((v) => ({ ...v, license_terms: e.target.value }))
                  }
                />
              </label>
            )}
          </div>
          {lines.map((line, i) => (
            <div
              className="dc-panel dc-grid sm:grid-cols-4"
              key={line.catalogId}
            >
              <h3 className="sm:col-span-4 font-semibold">{line.label}</h3>
              <p className="sm:col-span-4 text-xs text-slate-400">
                Catalog:{" "}
                {line.catalogPriceMinor === null
                  ? "La ofertare"
                  : (line.catalogPriceMinor / 100).toLocaleString("ro-RO")}{" "}
                {line.currency} · {line.billingCycle} ·{" "}
                {line.taxVerified
                  ? "Fiscalitate verificată"
                  : "Fiscalitate de verificat în nomenclator"}
              </p>
              {(
                [
                  ["quantity", "Cantitate"],
                  ["offeredPriceMinor", "Preț ofertat / unitate"],
                  ["discountReason", "Motivul modificării"],
                  ["billingCycle", "Recurență confirmată"],
                  ["package", "Variantă de pachet (opțional)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="dc-label">
                  {label}
                  <input
                    type={
                      key === "quantity" || key === "offeredPriceMinor"
                        ? "number"
                        : "text"
                    }
                    min="0"
                    step={key === "offeredPriceMinor" ? ".01" : "1"}
                    className="dc-input"
                    value={
                      key === "offeredPriceMinor" ? line[key] / 100 : line[key]
                    }
                    onChange={(e) =>
                      setLines((v) =>
                        v.map((item, j) =>
                          j !== i
                            ? item
                            : {
                                ...item,
                                ...(key === "offeredPriceMinor"
                                  ? { priceConfirmed: true }
                                  : {}),
                                [key]:
                                  key === "quantity"
                                    ? Number(e.target.value)
                                    : key === "offeredPriceMinor"
                                      ? Math.round(Number(e.target.value) * 100)
                                      : e.target.value,
                              },
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <label className="dc-check sm:col-span-4"><input type="checkbox" checked={line.priceConfirmed} onChange={(e) => setLines((values) => values.map((item, index) => index === i ? { ...item, priceConfirmed: e.target.checked } : item))} />Confirm prețul ofertat pentru această poziție</label>
            </div>
          ))}
          <p className="dc-notice">
            Textul complet, tabelele, articolele, antetul și subsolul se
            editează vizual după crearea ciornei. Niciun model original nu este
            modificat.
          </p>
        </div>
      )}
      {step === 2 && (
        <div className="dc-grid">
          {models.map((t) => {
            const draft = build(t),
              issues = documentIssues(draft, t.required);
            return (
              <article key={t.version_id} className="dc-panel">
                <h3 className="font-semibold">{draft.title}</h3>
                <p className="mt-2 text-xs text-slate-400">
                  Beneficiar:{" "}
                  {automatic["beneficiary.legal_name"] || "Independent"} ·{" "}
                  {projects.length} proiecte · {catalogIds.length} servicii ·
                  vizibilitate {scope}
                </p>
                {issues.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-amber-200">
                    {issues.map((issue) => (
                      <li key={issue}>{issue.replace(/Completează: (.+)/, (_, key) => `Completează: ${FIELD_LABELS[key] || serviceFields[key] || key}`)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-emerald-300">
                    Verificările automate sunt complete.
                  </p>
                )}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-violet-300">
                    Previzualizare conținut
                  </summary>
                  <div className="mt-3">
                    <DocumentReader payload={draft} />
                  </div>
                </details>
              </article>
            );
          })}
          <p className="dc-notice">
            Câmpurile lipsă permit salvarea ciornei, dar blochează aprobarea.
            Documentele nu sunt publicate sau trimise în acest pas.
          </p>
        </div>
      )}
      {step === 3 && (
        <div className="dc-panel dc-grid">
          <h3 className="text-lg font-semibold">
            Creează {models.length === 1 ? "ciorna" : `${models.length} ciorne`}
          </h3>
          <p className="text-sm text-slate-400">
            Salvăm documentul în Biblioteca Agenției, apoi continuăm cu acțiunea
            aleasă. Exporturile neaprobate sunt marcate ca ciorne.
          </p>
          {models.length > 1 && <p className="text-xs text-slate-400">Se creează întregul lot și se deschide primul document. Celelalte rămân în bibliotecă.</p>}
          {created.length > 0 && (
            <p role="status">
              {created.length} documente create. Reîncercarea continuă lotul
              fără duplicare.
            </p>
          )}
          <div className="dc-output-actions" role="group" aria-label="Salvare și export document">
          <button
            className="dc-button dc-primary justify-self-start"
            disabled={busy || !!contextError}
            onClick={() => void create()}
          >
            {busy ? "Se creează…" : "Creează și deschide editorul"}
          </button>
          {canExport && (["pdf", "docx"] as const).map((format) => <button key={format} className="dc-button" disabled={busy || !!contextError} onClick={() => void create(format)}>Salvează și descarcă {format === "pdf" ? "PDF" : "Word (.docx)"}</button>)}
          {canShare && <button className="dc-button" disabled={busy || !!contextError} onClick={() => void create("share")}>Salvează și pregătește distribuirea</button>}
          </div>
          <p className="text-xs text-slate-400">Distribuirea cere aprobare, un destinatar autorizat și confirmarea ta. Documentul nu se trimite automat.</p>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <button
          className="dc-button"
          disabled={step === 0 || busy || creationStarted}
          onClick={() => setStep((v) => v - 1)}
        >
          Înapoi
        </button>
        {step < 3 && (
          <button
            className="dc-button dc-primary"
            disabled={busy || !!contextError}
            onClick={() => setStep((v) => v + 1)}
          >
            Continuă
          </button>
        )}
      </div>
    </section>
  );
}
