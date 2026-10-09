import { useState } from "react";
import { Input } from "@/components/ui/input";
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

  const submit = async () => {
    if (newPassword.length < 10) return toast.error("Parola nouă trebuie să aibă minimum 10 caractere.");
    if (newPassword !== confirm) return toast.error("Parolele noi nu coincid.");
    setSaving(true);
    try {
      await cfAuth.changePassword(currentPassword, newPassword);
      toast.success("Parola a fost schimbată. Autentifică-te din nou.");
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parola nu a putut fi schimbată.");
    } finally {
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
        <div className="space-y-2">
          <Label htmlFor="current-password">Parola temporară</Label>
          <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <Label htmlFor="new-password">Parola nouă</Label>
          <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <Label htmlFor="confirm-password">Confirmă parola nouă</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        </div>
        <Button onClick={submit} disabled={saving || !currentPassword || !newPassword || !confirm}>
          {saving ? "Se salvează…" : "Schimbă parola"}
        </Button>
      </section>
    </main>
  );
};

export default MustChangePassword;
