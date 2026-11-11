import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BadgeCheck,
  Crown,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Shield,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  staffAccessApi,
  type AgencyMember,
  type Assignment,
  type StaffAccessConfig,
} from "@/lib/staffAccessApi";
import { cfAuth } from "@/lib/cfAuth";
import { internApi } from "@/lib/internApi";
import { useAuth } from "@/hooks/useAuth";
import {
  STAFF_PERMISSION_KEYS,
  DELEGATED_OWNER_PERMISSIONS,
  STAFF_RANKS,
  staffRankLabel,
  staffPermissionIssues,
  type StaffRankId,
  type StaffRankProfile,
} from "@/shared/staffAccess";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { StaffPermissionMatrix, StaffScopeList } from "./StaffPermissionMatrix";
import "./staffAgency.css";
const CodexOperatorControl = lazy(() => import("./CodexOperatorControl"));
const emptyAssignment = (rankId: StaffRankId | null = null): Assignment => ({
  rankId,
  permissions: [],
  projectIds: [],
  subscriptionIds: [],
  clientIds: [],
  aiProjectIds: [],
  revision: 0,
  expiresAt: null,
  reason: "",
  confirmed: false,
});
const rankOf = (m: AgencyMember) => m.platform_role || m.rank_id;
const isMember = (m: AgencyMember) =>
  !!rankOf(m) || /(^|,)(staff|admin)(,|$)/.test(m.roles || "");
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ro");
export default function TeamStaffTab() {
  const { user } = useAuth();
  const [config, setConfig] = useState<StaffAccessConfig | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [rankFilter, setRankFilter] = useState(""),
    [showAccounts, setShowAccounts] = useState(false),
    [message, setMessage] = useState("");
  const [mode, setMode] = useState<
      "manage" | "create" | "assign" | "profile" | null
    >(null),
    [selected, setSelected] = useState<AgencyMember | null>(null),
    [profile, setProfile] = useState<StaffRankProfile | null>(null),
    [draft, setDraft] = useState<Assignment>(emptyAssignment()),
    [panel, setPanel] = useState<
      "permissions" | "projects" | "clients" | "security"
    >("permissions"),
    [ready, setReady] = useState(false),
    [targetCanManage, setTargetCanManage] = useState(true),
    [rankChosen, setRankChosen] = useState(true),
    [saving, setSaving] = useState(false),
    [dialogError, setDialogError] = useState(""),
    [scopeQuery, setScopeQuery] = useState("");
  const [identity, setIdentity] = useState({
      email: "",
      username: "",
      displayName: "",
      temporaryPassword: "",
    }),
    [password, setPassword] = useState(""),
    [securityAction, setSecurityAction] = useState<
      "password" | "sessions" | "status" | "delegate" | null
    >(null),
    [securityConfirmed, setSecurityConfirmed] = useState(false);
  const sequence = useRef(0),
    request = useRef({ body: "", key: crypto.randomUUID() });
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await staffAccessApi.config();
      if (!Array.isArray(data.profiles))
        throw Error(
          "Administrarea rangurilor nu este disponibilă. Verifică migrațiile aplicației.",
        );
      setConfig(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const members = config?.data.filter(isMember) || [],
    profiles = config?.profiles || [];
  const delegatedTarget = selected?.delegated_owner === 1;
  const canDelegate = selected?.delegable_owner === 1 && selected.id !== user?.id &&
    config?.platformRole === "platform_owner";
  const full = !delegatedTarget &&
      (draft.rankId === "platform_owner" || draft.rankId === "superadmin"),
    protectedTarget =
      !!selected &&
      (selected.platform_role === "platform_owner" || selected.id === user?.id),
    canSave =
      !!config?.canManage &&
      !!config?.mfaSatisfied &&
      ready &&
      targetCanManage &&
      rankChosen &&
      !saving &&
      !protectedTarget;
  const setPermissions = (permissions: string[]) =>
    setDraft((d) => ({ ...d, permissions, confirmed: false }));
  const chooseRank = (rankId: StaffRankId | null) => {
    setRankChosen(true);
    const permissions =
      profiles.find((p) => p.id === rankId)?.permissions || [];
    setDraft((d) => ({
      ...d,
      rankId,
      permissions: [...permissions],
      expiresAt: null,
      projectIds:
        permissions.includes("projects.read") ||
        permissions.includes("maintenance.read")
          ? d.projectIds
          : [],
      subscriptionIds: permissions.includes("maintenance.read")
        ? d.subscriptionIds
        : [],
      aiProjectIds: permissions.includes("ai_projects.read")
        ? d.aiProjectIds
        : [],
      confirmed: false,
    }));
  };
  const begin = (next: typeof mode, rankId: StaffRankId = "vibe_dev") => {
    ++sequence.current;
    setMode(next);
    setSelected(null);
    setTargetCanManage(true);
    setProfile(null);
    setPanel("permissions");
    setDialogError("");
    setScopeQuery("");
    setReady(next === "create");
    setRankChosen(true);
    setDraft({
      ...emptyAssignment(rankId),
      permissions: [
        ...(profiles.find((p) => p.id === rankId)?.permissions || []),
      ],
    });
    setIdentity({
      email: "",
      username: "",
      displayName: "",
      temporaryPassword: "",
    });
    setPassword("");
    setSecurityAction(null);
    setSecurityConfirmed(false);
  };
  const openMember = async (member: AgencyMember, forcedRank?: StaffRankId) => {
    const current = ++sequence.current;
    setSelected(member);
    setRankChosen(!!forcedRank || !!rankOf(member) || !isMember(member));
    setTargetCanManage(false);
    setMode("manage");
    setReady(false);
    setDialogError("");
    setPanel("permissions");
    setScopeQuery("");
    setPassword("");
    setSecurityAction(null);
    setSecurityConfirmed(false);
    try {
      const data = await staffAccessApi.detail(member.id);
      if (current !== sequence.current) return;
      const rankId =
        forcedRank || rankOf(member) || data.assignment?.rankId || null;
      const permissions = forcedRank
        ? [...(profiles.find((p) => p.id === rankId)?.permissions || [])]
        : member.platform_role
          ? [...STAFF_PERMISSION_KEYS]
          : data.assignment?.permissions ||
            data.capabilities
              .filter(
                (c) =>
                  !c.organization_id &&
                  STAFF_PERMISSION_KEYS.includes(c.capability),
              )
              .map((c) => c.capability);
      setDraft({
        rankId,
        permissions,
        projectIds:
          permissions.includes("projects.read") ||
          permissions.includes("maintenance.read")
            ? data.projects.map((p) => p.id)
            : [],
        subscriptionIds: permissions.includes("maintenance.read")
          ? data.subscriptions.map((p) => p.id)
          : [],
        aiProjectIds: permissions.includes("ai_projects.read")
          ? data.aiProjects.map((p) => p.id)
          : [],
        clientIds: member.delegated_owner ? [] : data.clients.map((p) => p.id),
        revision: data.assignment?.revision || 0,
        expiresAt: data.assignment?.expiresAt || null,
        reason: "",
        confirmed: false,
      });
      setTargetCanManage(data.canManage);
      setReady(true);
    } catch (e) {
      if (current === sequence.current) setDialogError((e as Error).message);
    }
  };
  const keyFor = async (body: unknown) => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(JSON.stringify(body)),
    );
    const json = Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    if (request.current.body !== json)
      request.current = { body: json, key: crypto.randomUUID() };
    return request.current.key;
  };
  const save = async () => {
    if (!config?.mfaSatisfied || saving || !ready) return;
    setSaving(true);
    setDialogError("");
    try {
      if (mode === "profile" && profile)
        await staffAccessApi.profile(
          profile.id,
          {
            permissions: draft.permissions,
            revision: profile.revision,
            confirmed: true,
          },
          await keyFor({
            permissions: draft.permissions,
            revision: profile.revision,
          }),
        );
      else if (mode === "create") {
        const body = {
          ...identity,
          accessLevel: full ? "admin" : "staff",
          staffAssignment: draft,
        };
        await cfAuth.request("/api/admin/users", {
          method: "POST",
          headers: { "Idempotency-Key": await keyFor(body) },
          body: JSON.stringify(body),
        });
        setIdentity({
          email: "",
          username: "",
          displayName: "",
          temporaryPassword: "",
        });
      } else if (selected)
        await staffAccessApi.save(selected.id, draft, await keyFor(draft));
      setMode(null);
      setSelected(null);
      setMessage(
        mode === "profile"
          ? "Profilul inițial al rangului a fost salvat. Membrii existenți păstrează drepturile lor până la o modificare explicită."
          : "Membrul și accesurile au fost salvate. Sesiunile sale anterioare au fost închise.",
      );
      await load();
    } catch (e) {
      setDialogError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const security = async () => {
    if (!selected || !securityAction || !securityConfirmed) return;
    setSaving(true);
    setDialogError("");
    try {
      if (securityAction === "password")
        await internApi.setTemporaryPassword(selected.id, password);
      if (securityAction === "sessions")
        await internApi.revokeAccountSessions(selected.id);
      if (securityAction === "status")
        await internApi.setAccountEnabled(selected.id, !!selected.disabled_at);
      if (securityAction === "delegate") {
        if (!canDelegate) return;
        const body = { revision: draft.revision, reason: draft.reason.trim(), confirmed: true as const };
        await staffAccessApi.delegateOwner(selected.id, body, await keyFor(body));
      }
      setPassword("");
      setMode(null);
      setSelected(null);
      setMessage(securityAction === "delegate"
        ? "Contul este acum Owner Platform delegat. Drepturile se acordă din Rang și drepturi."
        : "Operațiunea de securitate a fost înregistrată.");
      await load();
    } catch (e) {
      setDialogError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const rows = useMemo(() => {
    const q = fold(query);
    return (config?.data || []).filter(
      (m) =>
        (showAccounts || isMember(m)) &&
        (!rankFilter || rankOf(m) === rankFilter) &&
        (!q ||
          fold(
            `${m.display_name} ${m.email || ""} ${m.username || ""} ${staffRankLabel(rankOf(m))}`,
          ).includes(q)),
    );
  }, [config, query, rankFilter, showAccounts]);
  const permissionIssues = staffPermissionIssues(draft.permissions);
  const filtered = <T extends { id: string; name: string }>(items: T[]) =>
    items.filter((p) => !scopeQuery || fold(p.name).includes(fold(scopeQuery)));
  const accountChoices = (config?.data || []).filter(
    (m) =>
      !m.disabled_at &&
      m.id !== user?.id &&
      m.platform_role !== "platform_owner" && !m.delegated_owner,
  );
  const rankOptions = profiles.filter(
    (p) =>
      config?.platformRole === "platform_owner" ||
      !["platform_owner", "superadmin"].includes(p.id),
  );
  return (
    <section className="agency-team" aria-label="AVY STAFF">
      <header className="agency-team-heading">
        <div>
          <p className="agency-kicker">AVYRON OS · ORGANIZAȚIE</p>
          <h1>AVY STAFF</h1>
          <p className="agency-muted">
            O echipă, roluri clare. Ranguri, responsabilități și accesuri
            într-un singur loc.
          </p>
        </div>
        {config?.canManage && (
          <div className="agency-actions">
            <button className="agency-button" onClick={() => begin("assign")}>
              <Users size={16} />
              Alocă membru existent
            </button>
            <button
              className="agency-button agency-primary"
              onClick={() => begin("create")}
            >
              <UserPlus size={16} />
              Cont nou
            </button>
          </div>
        )}
      </header>
      {error && (
        <p className="agency-notice" role="alert">
          {error} <button onClick={() => void load()}>Reîncearcă</button>
        </p>
      )}
      {message && (
        <p className="agency-success" role="status">
          {message}
        </p>
      )}
      {loading && !config && (
        <p role="status" className="agency-panel">
          Se încarcă echipa și accesurile…
        </p>
      )}
      {config && (
        <>
          <div className="agency-team-stats">
            <span>
              <Users size={15} />
              {members.length} membri
            </span>
            <span>
              <BadgeCheck size={15} />
              {profiles.length} ranguri
            </span>
            <span>
              <Shield size={15} />
              Drepturi verificate la fiecare operațiune
            </span>
          </div>
          <div className="agency-rank-grid" aria-label="Ierarhia agenției">
            {profiles.map((rank) => (
              <article
                key={rank.id}
                className={`agency-rank ${rankFilter === rank.id ? "agency-rank-selected" : ""}`}
              >
                <button
                  className="agency-rank-heading"
                  aria-pressed={rankFilter === rank.id}
                  onClick={() =>
                    setRankFilter((v) => (v === rank.id ? "" : rank.id))
                  }
                >
                  <span className="agency-rank-symbol">
                    {rank.level >= 90 ? (
                      <Crown size={18} />
                    ) : (
                      <Shield size={18} />
                    )}
                  </span>
                  <span>
                    <strong>{rank.label}</strong>
                    <small>
                      {members.filter((m) => rankOf(m) === rank.id).length}{" "}
                      membri
                    </small>
                  </span>
                </button>
                <p>{rank.description}</p>
                {config.canManage && (
                  <div className="agency-rank-actions">
                    <button
                      aria-label={`Alocă membru · ${rank.label}`}
                      disabled={
                        rank.level >= 90 &&
                        config.platformRole !== "platform_owner"
                      }
                      onClick={() => begin("assign", rank.id)}
                    >
                      Alocă
                    </button>
                    <button
                      aria-label={`Cont nou · ${rank.label}`}
                      disabled={
                        rank.level >= 90 &&
                        config.platformRole !== "platform_owner"
                      }
                      onClick={() => begin("create", rank.id)}
                    >
                      <Plus size={12} />
                      Cont nou
                    </button>
                    {rank.level < 90 && (
                      <button
                        aria-label={`Configurează drepturile · ${rank.label}`}
                        onClick={() => {
                          begin("profile", rank.id);
                          setProfile(rank);
                          setReady(true);
                        }}
                      >
                        Drepturi
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <section className="agency-panel">
            <div className="agency-list-tools">
              <h2>
                {rankFilter ? staffRankLabel(rankFilter) : "Echipa agenției"}{" "}
                <span>{rows.length}</span>
              </h2>
              <label className="agency-search">
                <Search size={16} />
                <input
                  aria-label="Caută membru"
                  placeholder="Nume, rang sau cont…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {rankFilter && (
                <button
                  className="agency-button"
                  onClick={() => setRankFilter("")}
                >
                  <X size={14} />
                  Toate rangurile
                </button>
              )}
            </div>
            {config.canManage && (
              <label className="agency-check agency-small">
                <input
                  type="checkbox"
                  checked={showAccounts}
                  onChange={(e) => setShowAccounts(e.target.checked)}
                />
                Include conturile fără rang în agenție
              </label>
            )}
            <div className="agency-member-list">
              {rows.map((member) => (
                <article key={member.id} className="agency-member">
                  <span className="agency-member-avatar">
                    {member.display_name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="agency-member-name">
                    <h3>{member.display_name}</h3>
                    {member.email && (
                      <p>
                        {member.email}
                        {member.username ? ` · @${member.username}` : ""}
                      </p>
                    )}
                    <span className="agency-rank-badge">
                      {member.delegated_owner ? "Owner Platform · delegat" : rankOf(member)
                        ? staffRankLabel(rankOf(member))
                        : "Rang nealocat"}
                    </span>
                    {!!member.expires_at && (
                      <small>
                        Acces{" "}
                        {member.expires_at <= Date.now()
                          ? "expirat la"
                          : "până la"}{" "}
                        {new Date(member.expires_at).toLocaleDateString(
                          "ro-RO",
                        )}
                      </small>
                    )}
                  </div>
                  <span
                    className={`agency-member-state ${member.disabled_at ? "agency-state-off" : ""}`}
                  >
                    {member.disabled_at ? "Dezactivat" : "Activ"}
                  </span>
                  <div className="agency-actions">
                    {isMember(member) &&
                      !member.disabled_at &&
                      member.id !== user?.id && (
                        <a
                          className="agency-button"
                          href={`/profil?tab=intern&dm=${encodeURIComponent(member.id)}`}
                        >
                          <MessageCircle size={15} />
                          Mesaj
                        </a>
                      )}
                    {config.canManage && (
                      <button
                        className="agency-button"
                        aria-label={`Gestionează · ${member.display_name}`}
                        onClick={() => void openMember(member)}
                      >
                        <Settings2 size={15} />
                        Gestionează
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!rows.length && (
                <p className="agency-empty">
                  Nu există membri pentru selecția curentă. Schimbă filtrul sau
                  alocă un cont existent.
                </p>
              )}
            </div>
          </section>
          {config.canManage && (
            <details className="agency-panel">
              <summary>Conturi operaționale și automatizări</summary>
              <p className="agency-muted">
                Conturile agenților păstrează politica lor dedicată, distinctă
                de rangurile membrilor umani.
              </p>
              <Suspense fallback={<p>Se încarcă…</p>}>
                <CodexOperatorControl />
              </Suspense>
            </details>
          )}
        </>
      )}
      <Dialog
        open={!!mode}
        onOpenChange={(open) => {
          if (!open && !saving) {
            ++sequence.current;
            setMode(null);
            setSelected(null);
            setPassword("");
            setIdentity({
              email: "",
              username: "",
              displayName: "",
              temporaryPassword: "",
            });
          }
        }}
      >
        <DialogContent className="agency-dialog dark sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {mode === "create"
                ? "Cont nou în agenție"
                : mode === "assign"
                  ? "Alocă un membru existent"
                  : mode === "profile"
                    ? `Drepturi inițiale · ${profile?.label || ""}`
                    : `Gestionează · ${selected?.display_name || "membru"}`}
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              {mode === "profile"
                ? "Definește setul inițial pentru viitoarele alocări. Membrii existenți se modifică explicit, din fișa lor."
                : "Selectează rangul, verifică drepturile și alocările, apoi confirmă salvarea."}
            </DialogDescription>
          </DialogHeader>
          <div className="agency-modal-body">
            {config?.canManage &&
              config.mfaSatisfied &&
              !config.mfaVerified && (
                <p className="agency-notice" role="status">
                  Politica platformei permite excepția MFA de rollout. Sesiunea
                  curentă nu este verificată în doi pași; alocările rămân
                  confirmate și auditate.
                </p>
              )}
            {config?.canManage && !config.mfaSatisfied && (
              <p role="alert" className="agency-notice">
                Confirmă autentificarea în doi pași din Setări înainte de
                modificarea accesului.
              </p>
            )}
            {mode === "assign" ? (
              <div className="agency-form-grid">
                <label className="agency-label">
                  Cont existent
                  <select
                    className="agency-input"
                    aria-label="Membru de alocat"
                    defaultValue=""
                    onChange={(e) => {
                      const member = accountChoices.find(
                        (m) => m.id === e.target.value,
                      );
                      if (member)
                        void openMember(member, draft.rankId || "vibe_dev");
                    }}
                  >
                    <option value="">Selectează un cont</option>
                    {accountChoices.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name} · {m.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="agency-label">
                  Rang pentru alocare
                  <select
                    className="agency-input"
                    value={draft.rankId || ""}
                    onChange={(e) => chooseRank(e.target.value as StaffRankId)}
                  >
                    {rankOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <>
                {mode === "create" && (
                  <fieldset className="agency-form-grid">
                    <legend className="agency-form-title">
                      Identitatea contului
                    </legend>
                    <label className="agency-label">
                      Nume afișat
                      <input
                        className="agency-input"
                        autoComplete="name"
                        value={identity.displayName}
                        onChange={(e) =>
                          setIdentity((v) => ({
                            ...v,
                            displayName: e.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="agency-label">
                      E-mail
                      <input
                        type="email"
                        autoComplete="email"
                        className="agency-input"
                        value={identity.email}
                        onChange={(e) =>
                          setIdentity((v) => ({ ...v, email: e.target.value }))
                        }
                      />
                    </label>
                    <label className="agency-label">
                      Username
                      <input
                        className="agency-input"
                        autoComplete="off"
                        aria-label="Username"
                        value={identity.username}
                        onChange={(e) =>
                          setIdentity((v) => ({
                            ...v,
                            username: e.target.value,
                          }))
                        }
                      />
                      <small>
                        3–40 caractere: litere mici, cifre, punct, minus sau
                        underscore.
                      </small>
                    </label>
                    <label className="agency-label">
                      Parolă temporară
                      <PasswordInput
                        className="agency-input"
                        autoComplete="new-password"
                        aria-label="Parolă temporară"
                        value={identity.temporaryPassword}
                        onChange={(e) =>
                          setIdentity((v) => ({
                            ...v,
                            temporaryPassword: e.target.value,
                          }))
                        }
                      />
                      <small>
                        Minimum 10 caractere, o literă mare și o cifră. Se
                        schimbă la prima autentificare.
                      </small>
                    </label>
                  </fieldset>
                )}
                {mode === "manage" && (
                  <nav
                    className="agency-manage-tabs"
                    aria-label="Gestionare membru"
                  >
                    {(
                      [
                        ["permissions", "Rang și drepturi"],
                        ["projects", "Proiecte și mentenanță"],
                        ["clients", "Clienți"],
                        ["security", "Securitate"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        aria-current={panel === id ? "page" : undefined}
                        onClick={() => {
                          setPanel(id);
                          setSecurityConfirmed(false);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                )}
                {!ready && mode === "manage" && !dialogError && (
                  <p role="status" className="agency-notice">
                    Se verifică accesurile actuale…
                  </p>
                )}
                {panel === "permissions" && (
                  <>
                    <div className="agency-form-grid">
                      <label className="agency-label">
                        Rang în agenție
                        <select
                          className="agency-input"
                          aria-label="Rang în agenție"
                          value={rankChosen ? draft.rankId || "" : "legacy"}
                          disabled={
                            mode === "profile" ||
                            protectedTarget || delegatedTarget ||
                            saving ||
                            !ready
                          }
                          onChange={(e) =>
                            chooseRank(
                              (e.target.value || null) as StaffRankId | null,
                            )
                          }
                        >
                          {!rankChosen && (
                            <option value="legacy" disabled>
                              Rang neconfigurat · alege un profil
                            </option>
                          )}
                          {mode !== "create" && (
                            <option value="">Fără rang · cont client</option>
                          )}
                          {profiles
                            .filter(
                              (p) =>
                                config?.platformRole === "platform_owner" ||
                                p.level < 90 ||
                                p.id === draft.rankId,
                            )
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="agency-rank-summary">
                        <strong>
                          {draft.permissions.length} drepturi selectate
                        </strong>
                        <p>
                          {profiles.find((p) => p.id === draft.rankId)
                            ?.description ||
                            "Contul nu primește acces operațional implicit."}
                        </p>
                        {mode === "manage" && !full && !delegatedTarget && draft.rankId && (
                          <button onClick={() => chooseRank(draft.rankId)}>
                            Reia drepturile inițiale ale rangului
                          </button>
                        )}
                      </div>
                    </div>
                    {protectedTarget && (
                      <p className="agency-notice">
                        Identitatea Owner și propriul rang sunt protejate.
                        Accesul afișat poate fi consultat; modificarea se face
                        printr-un alt Owner autorizat, în limitele politicii
                        platformei.
                      </p>
                    )}
                    {full && (
                      <p className="agency-notice">
                        Acces total: proiecte, financiar, marketing, Documente
                        SC și backupurile firmei. Numai Owner Platform poate
                        atribui rangurile platformei. Identitățile Owner rămân
                        protejate de retrogradare în acest flux.
                      </p>
                    )}
                    {delegatedTarget && (
                      <p className="agency-notice">
                        Owner Platform delegat. Ceilalți Owner pot aloca
                        drepturi operaționale și proiecte. Contul nu
                        administrează roluri, finanțe sau setările platformei.
                      </p>
                    )}
                    <StaffPermissionMatrix
                      value={draft.permissions}
                      onChange={setPermissions}
                      disabled={full || protectedTarget || saving || !ready}
                      allowed={delegatedTarget ? DELEGATED_OWNER_PERMISSIONS : undefined}
                    />
                  </>
                )}
                {(panel === "projects" || mode === "create") && (
                  <details className="agency-panel" open={panel === "projects"}>
                    <summary>
                      Alocări pe proiecte, mentenanță și marketing
                    </summary>
                    <p className="agency-muted">
                      Dreptul de lucru și aria de acces sunt separate. „Toate
                      proiectele” extinde aria; altfel se respectă alocările și
                      apartenențele existente.
                    </p>
                    <label className="agency-label">
                      Caută în alocări
                      <input
                        type="search"
                        className="agency-input"
                        value={scopeQuery}
                        onChange={(e) => setScopeQuery(e.target.value)}
                      />
                    </label>
                    <div className="agency-form-grid">
                      <StaffScopeList
                        title="Proiecte"
                        items={filtered(config?.projects || [])}
                        value={draft.projectIds}
                        disabled={
                          !ready ||
                          protectedTarget ||
                          saving ||
                          (!draft.permissions.includes("projects.read") &&
                            !draft.permissions.includes("maintenance.read"))
                        }
                        onChange={(projectIds) =>
                          setDraft((d) => ({
                            ...d,
                            projectIds,
                            confirmed: false,
                          }))
                        }
                      />
                      <StaffScopeList
                        title="Abonamente de mentenanță"
                        items={filtered(
                          (config?.subscriptions || []).map((s) => ({
                            ...s,
                            name: `${s.project_name} · ${s.name}`,
                          })),
                        )}
                        value={draft.subscriptionIds}
                        disabled={
                          !ready ||
                          protectedTarget ||
                          saving ||
                          !draft.permissions.includes("maintenance.read")
                        }
                        onChange={(subscriptionIds) =>
                          setDraft((d) => ({
                            ...d,
                            subscriptionIds,
                            confirmed: false,
                          }))
                        }
                      />
                      <StaffScopeList
                        title="Proiecte AI și Social Media"
                        items={filtered(config?.aiProjects || [])}
                        value={draft.aiProjectIds}
                        disabled={
                          !ready ||
                          protectedTarget ||
                          saving ||
                          !draft.permissions.includes("ai_projects.read")
                        }
                        onChange={(aiProjectIds) =>
                          setDraft((d) => ({
                            ...d,
                            aiProjectIds,
                            confirmed: false,
                          }))
                        }
                      />
                    </div>
                  </details>
                )}
                {panel === "clients" && (
                  <>
                    <p className="agency-notice">
                      Asocierile de beneficiar pot permite acces la datele și
                      proiectele clientului, conform politicilor resurselor.
                      Selectează numai relațiile de lucru autorizate.
                    </p>
                    <StaffScopeList
                      title="Clienți autorizați"
                      items={config?.clients || []}
                      value={draft.clientIds}
                      disabled={!ready || protectedTarget || delegatedTarget || saving}
                      onChange={(clientIds) =>
                        setDraft((d) => ({ ...d, clientIds, confirmed: false }))
                      }
                    />
                  </>
                )}
                {panel === "security" && (
                  <section className="agency-security">
                    <h3>Securitatea contului</h3>
                    <p className="agency-muted">
                      Aceste operațiuni se aplică imediat, separat de salvarea
                      rangului.
                    </p>
                    <label className="agency-label">
                      Operațiune
                      <select
                        className="agency-input"
                        value={securityAction || ""}
                        onChange={(e) => {
                          setSecurityAction(
                            (e.target.value || null) as typeof securityAction,
                          );
                          setSecurityConfirmed(false);
                        }}
                      >
                        <option value="">Selectează</option>
                        <option value="sessions">
                          Închide sesiunile active
                        </option>
                        {canDelegate && <option value="delegate">Treci la Owner Platform delegat</option>}
                        <option value="password">
                          Setează o parolă temporară
                        </option>
                        <option value="status">
                          {selected?.disabled_at
                            ? "Reactivează contul"
                            : "Dezactivează contul"}
                        </option>
                      </select>
                    </label>
                    {securityAction === "delegate" && (
                      <>
                        <p className="agency-notice">
                          Accesul global și sesiunile active se revocă.
                          Contul rămâne activ și poate primi drepturi explicite de la ceilalți Owner.
                        </p>
                        <label className="agency-label">
                          Motivul delegării
                          <textarea className="agency-input" maxLength={600} value={draft.reason}
                            onChange={(e) => {
                              setDraft((d) => ({ ...d, reason: e.target.value }));
                              setSecurityConfirmed(false);
                            }} />
                        </label>
                      </>
                    )}
                    {securityAction === "password" && (
                      <label className="agency-label">
                        Parolă temporară nouă
                        <PasswordInput
                          className="agency-input"
                          autoComplete="new-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setSecurityConfirmed(false);
                          }}
                        />
                      </label>
                    )}
                    {securityAction && (
                      <label className="agency-check">
                        <input
                          type="checkbox"
                          checked={securityConfirmed}
                          onChange={(e) =>
                            setSecurityConfirmed(e.target.checked)
                          }
                        />
                        Confirm operațiunea asupra contului{" "}
                        {selected?.display_name}.
                      </label>
                    )}
                    <button
                      className="agency-button"
                      disabled={
                        saving ||
                        !config?.mfaSatisfied ||
                        !ready ||
                        !targetCanManage ||
                        !securityAction ||
                        !securityConfirmed ||
                        (securityAction === "delegate" && (!canDelegate || draft.reason.trim().length < 3)) ||
                        (securityAction === "password" &&
                          (password.length < 10 ||
                            !/[A-Z]/.test(password) ||
                            !/[0-9]/.test(password)))
                      }
                      onClick={() => void security()}
                    >
                      Execută operațiunea confirmată
                    </button>
                  </section>
                )}
                {panel !== "security" && (
                  <div className="agency-save-review">
                    {mode !== "profile" && (
                      <div className="agency-form-grid">
                        <label className="agency-label">
                          Motivul alocării sau modificării
                          <textarea
                            className="agency-input"
                            maxLength={600}
                            value={draft.reason}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                reason: e.target.value,
                                confirmed: false,
                              }))
                            }
                          />
                        </label>
                        <label className="agency-label">
                          Acces valabil până la (opțional)
                          <input
                            type="datetime-local"
                            className="agency-input"
                            disabled={full || protectedTarget}
                            value={
                              draft.expiresAt
                                ? new Date(
                                    draft.expiresAt -
                                      new Date(
                                        draft.expiresAt,
                                      ).getTimezoneOffset() *
                                        60000,
                                  )
                                    .toISOString()
                                    .slice(0, 16)
                                : ""
                            }
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                expiresAt: e.target.value
                                  ? Date.parse(e.target.value)
                                  : null,
                                confirmed: false,
                              }))
                            }
                          />
                          <small>
                            Fără dată: acces până la revocare explicită.
                          </small>
                        </label>
                      </div>
                    )}
                    <label className="agency-check">
                      <input
                        type="checkbox"
                        checked={draft.confirmed}
                        disabled={!ready || protectedTarget || saving}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            confirmed: e.target.checked,
                          }))
                        }
                      />
                      {mode === "profile"
                        ? "Confirm setul inițial de drepturi al rangului."
                        : "Am verificat rangul, drepturile, alocările și efectul asupra sesiunilor."}
                    </label>
                  </div>
                )}
              </>
            )}
            {dialogError && (
              <p className="agency-notice" role="alert">
                {dialogError}
                {selected && !ready && (
                  <button onClick={() => void openMember(selected)}>
                    Reîncearcă încărcarea accesurilor
                  </button>
                )}
              </p>
            )}
          </div>
          <footer className="agency-dialog-footer">
            <button
              className="agency-button"
              disabled={saving}
              onClick={() => {
                setMode(null);
                setSelected(null);
                setPassword("");
                setIdentity({
                  email: "",
                  username: "",
                  displayName: "",
                  temporaryPassword: "",
                });
              }}
            >
              Închide
            </button>
            {mode !== "assign" && panel !== "security" && (
              <button
                className="agency-button agency-primary"
                disabled={
                  !canSave ||
                  !draft.confirmed ||
                  permissionIssues.length > 0 ||
                  (mode !== "profile" && draft.reason.trim().length < 3) ||
                  (mode === "create" &&
                    (!identity.displayName.trim() ||
                      !/^\S+@\S+\.\S+$/.test(identity.email) ||
                      !/^[a-z0-9][a-z0-9._-]{2,39}$/.test(identity.username) ||
                      identity.temporaryPassword.length < 10 ||
                      !/[A-Z]/.test(identity.temporaryPassword) ||
                      !/[0-9]/.test(identity.temporaryPassword)))
                }
                onClick={() => void save()}
              >
                {saving
                  ? "Se salvează…"
                  : mode === "create"
                    ? "Creează contul și alocă rangul"
                    : mode === "profile"
                      ? "Salvează profilul rangului"
                      : "Salvează accesurile"}
              </button>
            )}
          </footer>
        </DialogContent>
      </Dialog>
    </section>
  );
}
