import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setOpen(Boolean(user?.must_change_password)), [user]);

  const submit = async () => {
    if (newPassword.length < 10) return toast.error("Parola nouă trebuie să aibă minimum 10 caractere.");
    if (newPassword !== confirm) return toast.error("Parolele noi nu coincid.");
    setSaving(true);
    try {
      await cfAuth.changePassword(currentPassword, newPassword);
      toast.success("Parola a fost schimbată. Autentifică-te din nou.");
      setOpen(false);
      await signOut();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parola nu a putut fi schimbată.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !open) return null;
  return (
    <Dialog open={open}>
      <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <ShieldAlert className="size-6" />
          <DialogTitle>Schimbă parola</DialogTitle>
          <DialogDescription>Contul folosește o parolă temporară. Alege o parolă personală înainte să continui.</DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
};

export default MustChangePassword;
