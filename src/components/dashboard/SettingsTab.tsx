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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLang } from "@/i18n/LanguageContext";
import {
  Bell, Globe, Palette, Shield, Mail, CreditCard, Plus, Trash2,
  Wallet, FileText, Link2, Banknote, Building2, Star, StarOff, KeyRound, MonitorSmartphone
} from "lucide-react";
import { toast } from "sonner";

type PayMethodType = "card" | "paypal" | "invoice" | "payment_link" | "bank_transfer" | "revolut";

type SavedPayMethod = {
  id: string;
  type: PayMethodType;
  label: string;
  // card
  brand?: string;
  last4?: string;
  exp_month?: string;
  exp_year?: string;
  holder?: string;
  // paypal / payment_link
  email?: string;
  url?: string;
  // bank / invoice
  iban?: string;
  bank_name?: string;
  beneficiary?: string;
  // billing
  default?: boolean;
};

const PM_KEY = "avyron_payment_methods_v1";
const BILL_KEY = "avyron_billing_pref_v1";

const detectBrand = (num: string): string => {
  const n = num.replace(/\s+/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^(6011|65|64[4-9])/.test(n)) return "Discover";
  return "Card";
};

const typeIcon = (t: PayMethodType) => {
  switch (t) {
    case "card": return <CreditCard className="size-4" />;
    case "paypal": return <Wallet className="size-4" />;
    case "invoice": return <FileText className="size-4" />;
    case "payment_link": return <Link2 className="size-4" />;
    case "bank_transfer": return <Building2 className="size-4" />;
    case "revolut": return <Banknote className="size-4" />;
  }
};

const typeLabel = (t: PayMethodType) => ({
  card: "Card de credit/debit",
  paypal: "PayPal",
  invoice: "Factură (plată ulterioară)",
  payment_link: "Link de plată",
  bank_transfer: "Transfer bancar",
  revolut: "Revolut",
}[t]);

export const SettingsTab = () => {
  const { user, isStaff, isAdmin } = useAuth();
  const { lang, setLang } = useLang();
  const [theme, setTheme] = useState<string>(localStorage.getItem("theme") || "system");

  // notifications
  const [notifEmail, setNotifEmail] = useState<boolean>(localStorage.getItem("notif_email") !== "false");
  const [notifPush, setNotifPush] = useState<boolean>(localStorage.getItem("notif_push") === "true");
  const [notifMarketing, setNotifMarketing] = useState<boolean>(localStorage.getItem("notif_marketing") === "true");
  const [notifInvoices, setNotifInvoices] = useState<boolean>(localStorage.getItem("notif_invoices") !== "false");

  // payment methods
  const [methods, setMethods] = useState<SavedPayMethod[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [pmType, setPmType] = useState<PayMethodType>("card");
  const [pmDraft, setPmDraft] = useState<Partial<SavedPayMethod> & { card_number?: string }>({});

  // billing prefs
  const [billing, setBilling] = useState<{ entity: string; vat: string; auto_charge: boolean }>(() => {
    try { return JSON.parse(localStorage.getItem(BILL_KEY) || "") || { entity: "", vat: "", auto_charge: false }; }
    catch { return { entity: "", vat: "", auto_charge: false }; }
  });

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
  useEffect(() => { localStorage.setItem(BILL_KEY, JSON.stringify(billing)); }, [billing]);

  // load saved methods
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PM_KEY);
      if (raw) setMethods(JSON.parse(raw));
    } catch {
      // Keep the default local-only preferences when storage is unavailable.
    }
  }, []);
  useEffect(() => { localStorage.setItem(PM_KEY, JSON.stringify(methods)); }, [methods]);

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

  const addMethod = () => {
    const id = crypto.randomUUID();
    let m: SavedPayMethod | null = null;

    // SECURITY: only persist masked/display metadata in localStorage.
    // Full PAN, IBAN, cardholder name, expiry, and beneficiary are NEVER stored.
    if (pmType === "card") {
      const num = (pmDraft.card_number || "").replace(/\s+/g, "");
      if (num.length < 12) return toast.error("Număr card invalid");
      if (!pmDraft.holder) return toast.error("Introdu titularul");
      const brand = detectBrand(num);
      const last4 = num.slice(-4);
      m = {
        id, type: "card",
        brand,
        last4,
        label: `${brand} •••• ${last4}`,
      };
    } else if (pmType === "paypal") {
      if (!pmDraft.email) return toast.error("Introdu email-ul PayPal");
      const masked = pmDraft.email.replace(/(.{2}).+(@.+)/, "$1•••$2");
      m = { id, type: "paypal", label: `PayPal — ${masked}` };
    } else if (pmType === "payment_link") {
      if (!pmDraft.url) return toast.error("Introdu URL-ul");
      const host = pmDraft.url.replace(/^https?:\/\//, "").split("/")[0].slice(0, 40);
      m = { id, type: "payment_link", label: `Link — ${host}` };
    } else if (pmType === "bank_transfer") {
      if (!pmDraft.iban) return toast.error("Introdu IBAN-ul");
      const last4 = pmDraft.iban.slice(-4);
      m = {
        id, type: "bank_transfer",
        bank_name: pmDraft.bank_name?.slice(0, 40),
        label: `${pmDraft.bank_name || "Bancă"} — •••• ${last4}`,
      };
    } else if (pmType === "revolut") {
      if (!pmDraft.email) return toast.error("Introdu email/număr Revolut");
      const masked = pmDraft.email.replace(/(.{2}).+/, "$1•••");
      m = { id, type: "revolut", label: `Revolut — ${masked}` };
    } else if (pmType === "invoice") {
      m = { id, type: "invoice", label: "Factură (plată ulterioară)" };
    }

    if (!m) return;
    setMethods((prev) => [...prev, { ...m!, default: prev.length === 0 }]);
    setOpenAdd(false);
    setPmDraft({});
    toast.success("Metodă de plată adăugată");
  };

  const removeMethod = (id: string) => {
    setMethods((prev) => {
      const next = prev.filter((m) => m.id !== id);
      if (!next.some((m) => m.default) && next.length) next[0].default = true;
      return next;
    });
  };

  const setDefault = (id: string) => {
    setMethods((prev) => prev.map((m) => ({ ...m, default: m.id === id })));
  };

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
        Preferințele de notificare și metadatele mascate de plată sunt salvate doar pe acest dispozitiv; profilul și parola sunt persistate în contul Cloudflare.
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

      {/* Payment methods */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm"><CreditCard className="size-4" />Metode de plată</CardTitle>
            <CardDescription className="text-xs">Salvează metodele preferate pentru plăți rapide</CardDescription>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full"><Plus className="size-3.5 mr-1" />Adaugă</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="text-base">Adaugă metodă de plată</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tip</Label>
                  <Select value={pmType} onValueChange={(v) => { setPmType(v as PayMethodType); setPmDraft({}); }}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card de credit/debit</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank_transfer">Transfer bancar (IBAN)</SelectItem>
                      <SelectItem value="revolut">Revolut</SelectItem>
                      <SelectItem value="payment_link">Link de plată</SelectItem>
                      <SelectItem value="invoice">Factură (plată ulterioară)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {pmType === "card" && (
                  <div className="space-y-2">
                    <div className="space-y-1"><Label className="text-xs">Titular</Label>
                      <Input className="h-9" maxLength={60} value={pmDraft.holder || ""} onChange={(e) => setPmDraft({ ...pmDraft, holder: e.target.value })} placeholder="Nume Prenume" /></div>
                    <div className="space-y-1"><Label className="text-xs">Număr card</Label>
                      <Input className="h-9" inputMode="numeric" maxLength={23}
                        value={pmDraft.card_number || ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                          setPmDraft({ ...pmDraft, card_number: v.replace(/(.{4})/g, "$1 ").trim() });
                        }}
                        placeholder="1234 5678 9012 3456" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-xs">Lună</Label>
                        <Input className="h-9" inputMode="numeric" maxLength={2} value={pmDraft.exp_month || ""} onChange={(e) => setPmDraft({ ...pmDraft, exp_month: e.target.value.replace(/\D/g, "").slice(0,2) })} placeholder="MM" /></div>
                      <div className="space-y-1"><Label className="text-xs">An</Label>
                        <Input className="h-9" inputMode="numeric" maxLength={4} value={pmDraft.exp_year || ""} onChange={(e) => setPmDraft({ ...pmDraft, exp_year: e.target.value.replace(/\D/g, "").slice(0,4) })} placeholder="YYYY" /></div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Stocăm doar ultimele 4 cifre, brand și expirarea. Datele complete nu sunt salvate.</p>
                  </div>
                )}

                {(pmType === "paypal" || pmType === "revolut") && (
                  <div className="space-y-1"><Label className="text-xs">Email / Identificator</Label>
                    <Input className="h-9" maxLength={120} type="email" value={pmDraft.email || ""} onChange={(e) => setPmDraft({ ...pmDraft, email: e.target.value })} placeholder="exemplu@email.ro" /></div>
                )}

                {pmType === "payment_link" && (
                  <div className="space-y-1"><Label className="text-xs">URL link de plată</Label>
                    <Input className="h-9" maxLength={300} value={pmDraft.url || ""} onChange={(e) => setPmDraft({ ...pmDraft, url: e.target.value })} placeholder="https://buy.stripe.com/..." /></div>
                )}

                {pmType === "bank_transfer" && (
                  <div className="space-y-2">
                    <div className="space-y-1"><Label className="text-xs">Bancă</Label>
                      <Input className="h-9" maxLength={60} value={pmDraft.bank_name || ""} onChange={(e) => setPmDraft({ ...pmDraft, bank_name: e.target.value })} placeholder="Banca Transilvania" /></div>
                    <div className="space-y-1"><Label className="text-xs">IBAN</Label>
                      <Input className="h-9" maxLength={34} value={pmDraft.iban || ""} onChange={(e) => setPmDraft({ ...pmDraft, iban: e.target.value.toUpperCase().replace(/\s/g, "") })} placeholder="RO49AAAA1B31..." /></div>
                    <div className="space-y-1"><Label className="text-xs">Beneficiar</Label>
                      <Input className="h-9" maxLength={60} value={pmDraft.beneficiary || ""} onChange={(e) => setPmDraft({ ...pmDraft, beneficiary: e.target.value })} /></div>
                  </div>
                )}

                {pmType === "invoice" && (
                  <div className="space-y-1"><Label className="text-xs">Beneficiar / Companie (opțional)</Label>
                    <Input className="h-9" maxLength={60} value={pmDraft.beneficiary || ""} onChange={(e) => setPmDraft({ ...pmDraft, beneficiary: e.target.value })} placeholder="SC Avyron SRL" /></div>
                )}

                <Button onClick={addMethod} className="w-full">Salvează metoda</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {methods.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nicio metodă de plată salvată.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {methods.map((m) => (
                <li key={m.id} className="flex items-center gap-3 p-2.5">
                  <div className="size-8 rounded-md bg-brand/10 text-brand grid place-items-center shrink-0">{typeIcon(m.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      {m.label}
                      {m.default && <Badge variant="secondary" className="text-[9px] py-0 h-4">Implicit</Badge>}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{typeLabel(m.type)}{m.exp_month && m.exp_year ? ` • ${m.exp_month}/${m.exp_year}` : ""}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => setDefault(m.id)} aria-label={m.default ? "Implicit" : "Setează implicit"}>
                    {m.default ? <Star className="size-3.5 text-brand fill-brand" /> : <StarOff className="size-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => removeMethod(m.id)} aria-label="Șterge">
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Billing prefs */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4" />Facturare</CardTitle></CardHeader>
        <CardContent className="pt-0 pb-3 grid sm:grid-cols-2 gap-2.5">
          <div className="space-y-1"><Label className="text-xs">Beneficiar facturi</Label>
            <Input className="h-8 text-sm" value={billing.entity} onChange={(e) => setBilling({ ...billing, entity: e.target.value })} placeholder="Persoană fizică / SRL" /></div>
          <div className="space-y-1"><Label className="text-xs">CUI / CNP</Label>
            <Input className="h-8 text-sm" value={billing.vat} onChange={(e) => setBilling({ ...billing, vat: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <ToggleRow label="Plată automată" desc="Folosește metoda implicită la fiecare factură" checked={billing.auto_charge} onChange={(v) => setBilling({ ...billing, auto_charge: v })} />
          </div>
        </CardContent>
      </Card>

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
