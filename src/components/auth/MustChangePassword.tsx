import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Placeholder: forced password-change flow disabled after Cloudflare auth migration.
 * Will be reintroduced when the worker emits a `must_change_password` claim.
 */
export const MustChangePassword = () => {
  const { user } = useAuth();
  const [open] = useState(false);

  // No-op until CF worker emits the claim.
  useEffect(() => { void user; }, [user]);

  if (!user || !open) return null;
  return (
    <Dialog open={open}>
      <DialogContent>
        <DialogHeader>
          <ShieldAlert className="size-6" />
          <DialogTitle>Schimbă parola</DialogTitle>
          <DialogDescription>—</DialogDescription>
        </DialogHeader>
        <Alert><KeyRound className="size-4" /><AlertDescription>—</AlertDescription></Alert>
        <Label />  <Input />
        <Button onClick={() => toast.info("—")}>Ok</Button>
      </DialogContent>
    </Dialog>
  );
};

export default MustChangePassword;
