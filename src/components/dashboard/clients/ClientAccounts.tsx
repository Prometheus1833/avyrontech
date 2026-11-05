import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientWorkspaceApi as api } from "@/lib/clientWorkspaceApi";
import { internApi } from "@/lib/internApi";
import type { ClientFile } from "@/shared/clientWorkspace";
import { AccountFields, Confirm, Field } from "./ClientFields";
import { blankAccount, date } from "./clientPresentation";
import { useClientMutation } from "./useClientMutation";
export default function ClientAccounts({
  file,
  onChanged,
}: {
  file: ClientFile;
  onChanged: () => Promise<void>;
}) {
  const [mode, setMode] = useState<"none" | "new" | "existing" | "reset">(
      "none",
    ),
    [account, setAccount] = useState(blankAccount),
    [ids, setIds] = useState(file.accounts.map((a) => a.id)),
    [confirmed, setConfirmed] = useState(false),
    [query, setQuery] = useState(""),
    [resetId, setResetId] = useState(""),
    [password, setPassword] = useState("");
  const { run, busy, error } = useClientMutation();
  const start = (v: typeof mode) => {
    setConfirmed(false);
    setMode(v);
    setIds(file.accounts.map((a) => a.id));
    setAccount({
      ...blankAccount(),
      email: file.client.email,
      displayName: file.client.contact_name || file.client.company_name,
    });
  };
  const done = async () => {
    setMode("none");
    setAccount(blankAccount());
    setPassword("");
    toast.success("Accesul clientului a fost actualizat.");
    await onChanged();
  };
  return (
    <div className="cw-stack">
      <div className="cw-section-title">
        <h2>Conturi și autentificare</h2>
        {file.permissions.manageAccounts && (
          <div className="cw-actions">
            <Button onClick={() => start("new")}>Creează cont client</Button>
            <Button variant="outline" onClick={() => start("existing")}>
              Asociază conturi existente
            </Button>
          </div>
        )}
      </div>
      <p className="cw-hint">
        Accesul este acordat entității selectate. Un cont poate reprezenta mai
        multe firme numai prin asocieri explicite.
      </p>
      <section className="cw-card">
        {file.accounts.map((a) => (
          <article className="cw-account" key={a.id}>
            <div>
              <strong className="block text-sm break-all">
                {a.display_name || a.email}
              </strong>
              <p className="cw-muted">
                {a.email} {a.username && `· @${a.username}`}
              </p>
              <div className="cw-meta">
                <span className="cw-pill">
                  {a.disabled_at ? "Cont dezactivat" : "Cont activ"}
                </span>
                <span>
                  {a.must_change_password
                    ? "Schimbare parolă obligatorie"
                    : "Parolă personală configurată"}
                </span>
                <span>Ultima autentificare: {date(a.last_login_at)}</span>
              </div>
            </div>
            {file.permissions.manageAccounts && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  start("reset");
                  setResetId(a.id);
                }}
              >
                Parolă temporară
              </Button>
            )}
          </article>
        ))}
        {!file.accounts.length && (
          <p className="cw-empty">Nu există un cont asociat acestui client.</p>
        )}
      </section>
      {mode !== "none" && (
        <form
          className="cw-card cw-stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!confirmed) return;
            if (mode === "new")
              void run(
                { account, client: file.client.id },
                (k) => api.provision(file.client.id, account, k),
                done,
              );
            else if (mode === "existing")
              void run(
                { ids, expected: file.accounts.map((a) => a.id) },
                (k) =>
                  api.accounts(
                    file.client.id,
                    ids,
                    file.accounts.map((a) => a.id),
                    k,
                  ),
                done,
              );
            else
              void run(
                { resetId, password },
                () => internApi.setTemporaryPassword(resetId, password),
                done,
              );
          }}
        >
          <h3>
            {mode === "new"
              ? "Cont nou"
              : mode === "existing"
                ? "Conturi autorizate"
                : "Schimbă parola temporară"}
          </h3>
          {mode === "new" && (
            <AccountFields value={account} onChange={setAccount} />
          )}
          {mode === "existing" && (
            <>
              <Field label="Caută cont">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Field>
              <div className="cw-picker">
                {[
                  ...file.accountOptions,
                  ...file.accounts.filter(
                    (a) => !file.accountOptions.some((o) => o.id === a.id),
                  ),
                ]
                  .filter((a) =>
                    `${a.display_name} ${a.email}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((a) => (
                    <label key={a.id}>
                      <input
                        type="checkbox"
                        checked={ids.includes(a.id)}
                        disabled={!!a.disabled_at && !ids.includes(a.id)}
                        onChange={(e) => {
                          setConfirmed(false);
                          setIds((v) =>
                            e.target.checked
                              ? [...v, a.id]
                              : v.filter((id) => id !== a.id),
                          );
                        }}
                      />
                      <span className="break-all">
                        {a.display_name || a.email}
                        <span className="block cw-muted">{a.email}</span>
                      </span>
                    </label>
                  ))}
              </div>
              <p className="cw-hint">
                Debifarea revocă această asociere. Alte drepturi explicite
                asupra proiectelor sau altor entități rămân gestionate separat.
              </p>
            </>
          )}
          {mode === "reset" && (
            <>
              <p className="cw-muted">
                Cont: {file.accounts.find((a) => a.id === resetId)?.email}.
                Schimbarea afectează autentificarea persoanei pentru toate
                firmele reprezentate.
              </p>
              <Field label="Noua parolă temporară">
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={256}
                  pattern="(?=.*[A-Z])(?=.*[0-9]).{10,}"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            </>
          )}
          <Confirm checked={confirmed} onChange={setConfirmed}>
            {mode === "reset"
              ? "Confirm resetarea parolei acestui cont."
              : "Confirm identitatea persoanelor selectate și drepturile acordate sau revocate pentru acest client."}
          </Confirm>
          {error && (
            <p role="alert" className="cw-error">
              {error}
            </p>
          )}
          <div className="cw-actions">
            <Button type="submit" disabled={busy || !confirmed}>
              {busy ? "Se salvează…" : "Confirmă modificarea"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode("none");
                setAccount(blankAccount());
                setPassword("");
              }}
            >
              Renunță
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
