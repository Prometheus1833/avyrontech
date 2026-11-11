import { useRef, useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cfAuth } from "@/lib/cfAuth";

/**
 * Forces imported/bootstrap accounts to replace their temporary password.
 */
export const MustChangePassword = () => {
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (newPassword.length < 10) return setError("Parola nouă trebuie să aibă minimum 10 caractere.");
    if (newPassword === currentPassword) return setError("Alege o parolă diferită de cea temporară.");
    if (newPassword !== confirm) return setError("Parolele noi nu coincid.");
    pending.current = true;
    setSaving(true);
    try {
      await cfAuth.changePassword(currentPassword, newPassword);
      toast.success("Parola a fost schimbată. Autentifică-te din nou.");
      await signOut();
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? error.status : null;
      setError(status === 401 ? "Sesiunea a expirat. Autentifică-te din nou cu parola temporară." :
        error instanceof TypeError ? "Serviciul de autentificare nu a răspuns. Încearcă din nou." :
        error instanceof Error ? error.message : "Parola nu a putut fi schimbată.");
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };

  if (!user?.must_change_password) return null;
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-lg space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-xl sm:p-8" aria-labelledby="temporary-password-title">
        <header className="space-y-2">
          <ShieldAlert className="size-6" />
          <h1 id="temporary-password-title" className="text-2xl font-semibold">Schimbă parola</h1>
          <p className="text-sm text-muted-foreground">Contul folosește o parolă temporară. Alege o parolă personală înainte să continui.</p>
        </header>
        <Alert><KeyRound className="size-4" /><AlertDescription>După schimbare vei fi delogat de pe toate dispozitivele.</AlertDescription></Alert>
        <form className="space-y-3" onSubmit={submit} aria-busy={saving}>
          <Label htmlFor="current-password">Parola temporară</Label>
          <PasswordInput id="current-password" autoComplete="current-password" required disabled={saving} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <Label htmlFor="new-password">Parola nouă</Label>
          <PasswordInput id="new-password" autoComplete="new-password" required maxLength={1024} disabled={saving} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <Label htmlFor="confirm-password">Confirmă parola nouă</Label>
          <PasswordInput id="confirm-password" autoComplete="new-password" required maxLength={1024} disabled={saving} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          <Button type="submit" disabled={saving || !currentPassword || !newPassword || !confirm}>
            {saving ? "Se salvează…" : "Schimbă parola"}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default MustChangePassword;
