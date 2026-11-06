import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { internApi } from "@/lib/internApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/auth/PasswordInput";
export default function CodexOperatorControl() {
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [state, setState] = useState<{
      exists: boolean;
      synchronized: boolean;
    } | null>(null);
  const load = () =>
    internApi
      .codexOperator()
      .then((r) => setState(r.data))
      .catch(() => setState(null));
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <button className="agency-button" onClick={() => setOpen(true)}>
        <Bot size={16} /> Cont operațional Codex
      </button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) {
            setOpen(v);
            setPassword("");
            setError("");
          }
        }}
      >
        <DialogContent className="agency-dialog dark sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cont operațional Codex</DialogTitle>
            <DialogDescription className="text-slate-300">
              Un singur cont dedicat agenților Leads și AI AVY Prod.
              Sincronizarea păstrează politica sa specifică; nu îi acordă rang
              administrativ.
            </DialogDescription>
          </DialogHeader>
          <p className="agency-notice">
            {state?.synchronized
              ? "Acces sincronizat"
              : state?.exists
                ? "Cont existent; sincronizarea poate fi reluată"
                : "Cont neconfigurat sau verificare indisponibilă"}
            . Această stare nu confirmă execuția agenților sau instalarea
            skillurilor.
          </p>
          <label className="agency-label">
            Parolă temporară{" "}
            {state?.exists
              ? "(opțional, pentru rotire)"
              : "(necesară pentru cont nou)"}
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="agency-input"
            />
          </label>
          {error && (
            <p role="alert" className="agency-notice">
              {error}
            </p>
          )}
          <button
            className="agency-button agency-primary"
            disabled={busy || (!state?.exists && password.length < 10)}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await internApi.synchronizeCodexOperator(password || undefined);
                setPassword("");
                await load();
                setOpen(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Se sincronizează…" : "Sincronizează accesul"}
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
