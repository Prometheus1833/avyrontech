import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cfAuth, type AuthSession, type MfaFactor } from "@/lib/cfAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/i18n/LanguageContext";
import {
  Bell, Globe, Palette, Shield, Mail, Trash2, KeyRound, MonitorSmartphone
} from "lucide-react";
import { toast } from "sonner";
import BillingSettingsCard from "./BillingSettingsCard";
export const SettingsTab = () => {
  const { user, isStaff, isAdmin } = useAuth();
  const { lang, setLang } = useLang();
  const [theme, setTheme] = useState<string>(localStorage.getItem("theme") || "system");

  // notifications
  const [notifEmail, setNotifEmail] = useState<boolean>(localStorage.getItem("notif_email") !== "false");
  const [notifPush, setNotifPush] = useState<boolean>(localStorage.getItem("notif_push") === "true");
  const [notifMarketing, setNotifMarketing] = useState<boolean>(localStorage.getItem("notif_marketing") === "true");
  const [notifInvoices, setNotifInvoices] = useState<boolean>(localStorage.getItem("notif_invoices") !== "false");

  // staff-only
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(localStorage.getItem("staff_maintenance") === "true");
  const [autoAssign, setAutoAssign] = useState<boolean>(localStorage.getItem("staff_auto_assign") === "true");
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [mfaPassword, setMfaPassword] = useState("");
  const [mfaEnrollment, setMfaEnrollment] = useState<{ factorId: string; secret: string; otpauthUri: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // theme apply
  useEffect(() => {
    localStorage.setItem("theme", theme);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => { localStorage.setItem("notif_email", String(notifEmail)); }, [notifEmail]);
  useEffect(() => { localStorage.setItem("notif_push", String(notifPush)); }, [notifPush]);
  useEffect(() => { localStorage.setItem("notif_marketing", String(notifMarketing)); }, [notifMarketing]);
  useEffect(() => { localStorage.setItem("notif_invoices", String(notifInvoices)); }, [notifInvoices]);
  useEffect(() => { localStorage.setItem("staff_maintenance", String(maintenanceMode)); }, [maintenanceMode]);
  useEffect(() => { localStorage.setItem("staff_auto_assign", String(autoAssign)); }, [autoAssign]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([cfAuth.listSessions(), cfAuth.mfaStatus()])
      .then(([sessionRows, mfa]) => {
        if (!active) return;
        setSessions(sessionRows);
        setMfaFactors(mfa.data);
      })
      .catch(() => active && toast.error("Starea de securitate nu a putut fi încărcată."));
    return () => { active = false; };
  }, [user]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await cfAuth.forgot(user.email);
      toast.success("Email de resetare trimis");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trimiterea nu a reușit.");
    }
  };

  const startMfaEnrollment = async () => {
    if (!mfaPassword) return toast.error("Introdu parola curentă.");
    setSecurityBusy(true);
    try {
      const enrollment = await cfAuth.enrollTotp(mfaPassword);
      setMfaEnrollment(enrollment);
      setRecoveryCodes([]);
      toast.success("Secretul MFA a fost generat. Confirmă-l cu primul cod.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Activarea MFA nu a reușit.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const confirmMfaEnrollment = async () => {
    if (!mfaEnrollment) return;
    setSecurityBusy(true);
    try {
      const result = await cfAuth.verifyTotpEnrollment(mfaEnrollment.factorId, mfaCode);
      setRecoveryCodes(result.recoveryCodes);
      setMfaFactors((factors) => factors.some((factor) => factor.id === mfaEnrollment.factorId)
        ? factors.map((factor) => factor.id === mfaEnrollment.factorId
          ? { ...factor, status: "active", verified_at: Date.now() }
          : factor)
        : [...factors, {
          id: mfaEnrollment.factorId,
          kind: "totp",
          label: "Aplicație de autentificare",
          status: "active",
          verified_at: Date.now(),
          last_used_at: Date.now(),
          created_at: Date.now(),
        }]);
      setMfaEnrollment(null);
      setMfaPassword("");
      setMfaCode("");
      toast.success("MFA este activ. Salvează codurile de recuperare.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Codul MFA nu este valid.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const revokeSession = async (session: AuthSession) => {
    setSecurityBusy(true);
    try {
      await cfAuth.revokeSession(session.id);
      setSessions((rows) => rows.filter((row) => row.id !== session.id));
      if (session.current) {
        await cfAuth.logout();
        window.location.assign("/auth");
      } else {
        toast.success("Sesiunea a fost revocată.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sesiunea nu a putut fi revocată.");
    } finally {
      setSecurityBusy(false);
    }
  };

  const requestEmailChange = async () => {
    if (!newEmail || !emailPassword) return toast.error("Completează noul email și parola curentă.");
    setSecurityBusy(true);
    try {
      await cfAuth.requestEmailChange(emailPassword, newEmail);
      setNewEmail("");
      setEmailPassword("");
      toast.success("Confirmarea a fost trimisă la noua adresă.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Solicitarea nu a reușit.");
    } finally {
      setSecurityBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
        Preferințele de notificare rămân pe acest dispozitiv. Profilul de facturare, abonamentele și identificatorii tokenizați ai metodelor de plată sunt păstrate securizat în cont.
      </p>
      {/* Account */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Shield className="size-4" />Cont</CardTitle>
          <CardDescription className="text-xs">Informații despre contul tău</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm pt-0 pb-3">
          <div className="flex justify-between"><span className="text-muted-foreground text-xs">Email</span><span className="font-medium text-xs">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-xs">ID</span><span className="font-mono text-[10px]">{user?.id.slice(0, 8)}…</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-xs">Rol</span><span className="font-medium text-xs">{isAdmin ? "Administrator" : isStaff ? "Membru staff" : "Utilizator"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-xs">Cont creat</span><span className="text-xs">{user?.created_at && new Date(user.created_at).toLocaleDateString("ro-RO")}</span></div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Mail className="size-4" />Securitate cont</CardTitle>
          <CardDescription className="text-xs">Parolă și adresă de autentificare administrate de Workerul Cloudflare.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 pb-3">
          <Button variant="outline" size="sm" onClick={handlePasswordReset}>Schimbă parola prin email</Button>
          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="new-account-email" className="text-xs">Adresă nouă</Label>
              <Input id="new-account-email" type="email" autoComplete="email" className="h-9" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-current-password" className="text-xs">Parola curentă</Label>
              <Input id="email-current-password" type="password" autoComplete="current-password" className="h-9" value={emailPassword} onChange={(event) => setEmailPassword(event.target.value)} />
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={securityBusy} onClick={requestEmailChange}>Solicită schimbarea emailului</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm"><KeyRound className="size-4" />Autentificare în doi pași</CardTitle>
          <CardDescription className="text-xs">Obligatorie pentru administratori și acțiuni privilegiate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0 pb-3">
          {mfaFactors.some((factor) => factor.status === "active") ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
              <span>Aplicație de autentificare</span><Badge variant="secondary">Activ</Badge>
            </div>
          ) : mfaEnrollment ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Adaugă manual cheia în aplicația ta TOTP, apoi introdu primul cod de 6 cifre.</p>
              <code className="block break-all rounded bg-muted p-2 text-xs select-all">{mfaEnrollment.secret}</code>
              <a className="block break-all text-xs text-brand underline" href={mfaEnrollment.otpauthUri}>Deschide în aplicația de autentificare</a>
              <div className="flex gap-2">
                <Input aria-label="Cod MFA" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="h-9" value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" />
                <Button size="sm" disabled={securityBusy || mfaCode.length !== 6} onClick={confirmMfaEnrollment}>Confirmă</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input type="password" autoComplete="current-password" className="h-9 sm:max-w-xs" value={mfaPassword} onChange={(event) => setMfaPassword(event.target.value)} placeholder="Parola curentă" />
              <Button size="sm" disabled={securityBusy} onClick={startMfaEnrollment}>Activează MFA</Button>
            </div>
          )}
          {recoveryCodes.length > 0 && (
            <div role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="mb-2 text-xs font-medium">Salvează acum codurile de recuperare. Nu vor mai fi afișate.</p>
              <pre className="grid grid-cols-2 gap-1 whitespace-pre-wrap font-mono text-xs">{recoveryCodes.join("\n")}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm"><MonitorSmartphone className="size-4" />Sesiuni active</CardTitle>
          <CardDescription className="text-xs">Revocarea dispozitivului curent necesită o autentificare nouă.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 pb-3">
          {sessions.length === 0 && <p className="text-xs text-muted-foreground">Nu există sesiuni active de afișat.</p>}
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{session.device_name || "Dispozitiv necunoscut"} {session.current && <Badge className="ml-1">Curent</Badge>}</p>
                <p className="text-[10px] text-muted-foreground">Activitate: {new Date(session.last_seen_at).toLocaleString("ro-RO")}</p>
              </div>
              <Button variant="ghost" size="sm" disabled={securityBusy} onClick={() => revokeSession(session)}><Trash2 className="size-3.5" /><span className="sr-only">Revocă sesiunea</span></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Palette className="size-4" />Aspect</CardTitle></CardHeader>
        <CardContent className="pt-0 pb-3 space-y-2">
          <Label className="text-xs">Temă</Label>
          <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="h-8 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Sistem</SelectItem>
              <SelectItem value="light">Luminos</SelectItem>
              <SelectItem value="dark">Întunecat</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Globe className="size-4" />Limbă</CardTitle></CardHeader>
        <CardContent className="pt-0 pb-3">
          <Select value={lang} onValueChange={(value) => {
            if (value === "ro" || value === "en") setLang(value);
          }}>
            <SelectTrigger className="h-8 text-sm max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ro">Română</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Bell className="size-4" />Notificări</CardTitle></CardHeader>
        <CardContent className="pt-0 pb-3 space-y-2.5">
          <ToggleRow label="Email" desc="Notificări generale pe email" checked={notifEmail} onChange={setNotifEmail} />
          <ToggleRow label="Push" desc="Notificări în browser" checked={notifPush} onChange={setNotifPush} />
          <ToggleRow label="Facturi & plăți" desc="Alerte la emiterea facturilor" checked={notifInvoices} onChange={setNotifInvoices} />
          <ToggleRow label="Marketing" desc="Promoții și noutăți Avyron" checked={notifMarketing} onChange={setNotifMarketing} />
        </CardContent>
      </Card>

      <BillingSettingsCard />

      {/* Staff-only settings */}
      {isStaff && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><Shield className="size-4" />Setări staff</CardTitle></CardHeader>
          <CardContent className="pt-0 pb-3 space-y-2.5">
            <ToggleRow label="Mod mentenanță" desc="Afișează banner pentru utilizatori" checked={maintenanceMode} onChange={setMaintenanceMode} />
            <ToggleRow label="Auto-asignare tichete" desc="Preia automat tichete noi" checked={autoAssign} onChange={setAutoAssign} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ToggleRow = ({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="min-w-0">
      <Label className="text-xs">{label}</Label>
      {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
