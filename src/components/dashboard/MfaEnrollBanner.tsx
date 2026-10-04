import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { isMfaEnrollmentNeeded, MFA_ENROLL_EVENT } from "@/lib/cfAuth";

/** Tells privileged users why team areas are locked and opens the two-step setup. */
const MfaEnrollBanner = ({ onOpenSettings }: { onOpenSettings: () => void }) => {
  const [needed, setNeeded] = useState(isMfaEnrollmentNeeded);
  useEffect(() => {
    const sync = () => setNeeded(isMfaEnrollmentNeeded());
    window.addEventListener(MFA_ENROLL_EVENT, sync);
    return () => window.removeEventListener(MFA_ENROLL_EVENT, sync);
  }, []);
  if (!needed) return null;
  return (
    <div role="alert" data-testid="mfa-enroll-banner" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <ShieldAlert className="size-5 shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1">Zonele echipei se deschid după ce activezi autentificarea în doi pași (aplicație de tip Google Authenticator).</p>
      <button type="button" onClick={onOpenSettings} className="rounded-full bg-amber-300 px-4 py-1.5 text-xs font-semibold text-slate-950 transition active:scale-[0.98] hover:bg-amber-200">Activează acum</button>
    </div>
  );
};

export default MfaEnrollBanner;
