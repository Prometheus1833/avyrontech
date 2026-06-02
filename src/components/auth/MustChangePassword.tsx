import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Forces password change on first login when user_metadata.must_change_password === true.
 * Mounted globally; renders nothing unless required.
 */
export const MustChangePassword = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.user_metadata?.must_change_password === true) setOpen(true);
    else setOpen(false);
  }, [user]);

  const submit = async () => {
    if (pwd.length < 8) return toast.error("Parola trebuie să aibă cel puțin 8 caractere.");
    if (pwd !== confirm) return toast.error("Parolele nu coincid.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: pwd,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Parola a fost schimbată cu succes.");
    setOpen(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* not dismissible */ }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto size-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
            <ShieldAlert className="size-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Schimbă parola inițială</DialogTitle>
          <DialogDescription className="text-center">
            Notificare de securitate: contul tău folosește parola inițială atribuită de Avyron.
            Pentru a continua, setează o parolă nouă, doar a ta.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-500/40 bg-amber-500/5">
          <KeyRound className="size-4 text-amber-500" />
          <AlertDescription className="text-xs">
            Minim 8 caractere. Recomandăm o frază lungă, cu cifre și simboluri.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd">Parolă nouă</Label>
            <Input id="new-pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pwd-2">Confirmă parola</Label>
            <Input id="new-pwd-2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>

        <Button onClick={submit} disabled={loading} className="w-full">
          {loading ? "Se salvează…" : "Salvează parola nouă"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default MustChangePassword;
