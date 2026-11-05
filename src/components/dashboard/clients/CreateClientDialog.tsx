import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clientWorkspaceApi as api } from "@/lib/clientWorkspaceApi";
import type {
  ClientAccount,
  CreateClientInput,
} from "@/shared/clientWorkspace";
import { blankIdentity, blankAccount, errorText } from "./clientPresentation";
import { IdentityFields, AccountFields, Confirm, Field } from "./ClientFields";
import { useClientMutation } from "./useClientMutation";
export default function CreateClientDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [identity, setIdentity] = useState(blankIdentity),
    [account, setAccount] = useState(blankAccount),
    [mode, setMode] = useState("none"),
    [accountId, setAccountId] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [options, setOptions] = useState<{
      accounts: ClientAccount[];
      canManageAccounts: boolean;
    } | null>(null),
    [loadError, setLoadError] = useState("");
  const { run, busy, error } = useClientMutation();
  useEffect(() => {
    let active = true;
    api
      .options()
      .then((v) => {
        if (active) setOptions(v);
      })
      .catch((e) => {
        if (active) setLoadError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== "none" && !confirmed) return;
    const body: CreateClientInput = {
      identity,
      account:
        mode === "new"
          ? { mode: "new", identity: account, confirmed: true }
          : mode === "existing"
            ? { mode: "existing", accountId, confirmed: true }
            : { mode: "none" },
    };
    void run(
      body,
      (k) => api.create(body, k),
      (r) => {
        setAccount(blankAccount());
        toast.success("Clientul a fost creat.");
        onCreated(r.id);
      },
    );
  };
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="cw-dialog client-workspace">
        <header>
          <DialogHeader>
            <DialogTitle>Adaugă client</DialogTitle>
            <DialogDescription className="cw-hint">
              Identitate comercială și, opțional, acces în portal. Proiectele și
              abonamentele se adaugă din fișa clientului.
            </DialogDescription>
          </DialogHeader>
        </header>
        <div className="cw-body">
          <form onSubmit={submit} className="cw-stack">
            <IdentityFields value={identity} onChange={setIdentity} />
            <section className="cw-card">
              <h3>Acces în cont</h3>
              {loadError && (
                <p role="alert" className="cw-error">
                  {loadError} Poți crea fișa și configura contul ulterior.
                </p>
              )}
              <Field label="Opțiune cont">
                <select
                  disabled={!options?.canManageAccounts}
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setConfirmed(false);
                    setAccount({
                      ...blankAccount(),
                      email: identity.email,
                      displayName: identity.contactName || identity.companyName,
                    });
                  }}
                >
                  <option value="none">
                    Doar fișa clientului · fără cont nou
                  </option>
                  <option value="existing">Asociază un cont existent</option>
                  <option value="new">Creează un cont client nou</option>
                </select>
              </Field>
              {mode === "existing" && (
                <Field label="Cont existent">
                  <select
                    required
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="">Selectează contul…</option>
                    {options?.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.display_name || a.email} · {a.email}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {mode === "new" && (
                <AccountFields value={account} onChange={setAccount} />
              )}{" "}
              {mode !== "none" && (
                <Confirm checked={confirmed} onChange={setConfirmed}>
                  Confirm identitatea persoanei și acord acces la proiectele,
                  abonamentele și documentele publicate pentru acest client.
                </Confirm>
              )}
            </section>
            {error && (
              <p role="alert" className="cw-error">
                {error}
              </p>
            )}
            <div className="cw-actions">
              <Button
                type="submit"
                disabled={busy || (mode !== "none" && !confirmed)}
              >
                {busy ? "Se creează…" : "Creează clientul"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onClose}
              >
                Renunță
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
