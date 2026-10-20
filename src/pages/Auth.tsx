import { Component, lazy, Suspense, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, KeyRound, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators/auth";
import logo from "@/assets/avyron-logo.webp";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import { isPlatformHostname, publicSiteHref } from "@/lib/appHost";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { authCopy, authValidationMessage } from "./authCopy";
import "./auth.css";

const AuthPortal3D = lazy(() => import("@/components/auth/AuthPortal3D"));

class OptionalPortalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const Auth = () => {
  const { t, lang } = useLang();
  const copy = authCopy[lang];
  const { user, loading, isStaff, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "register">(() => new URLSearchParams(window.location.search).get("tab") === "register" ? "register" : "login");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [rememberIdentifier, setRememberIdentifier] = useState(() => Boolean(localStorage.getItem("avyron:login-identifier")));
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [viewTab, setViewTab] = useState<"login" | "register">(tab);
  const portalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef(0);
  const transitionRef = useRef<((syncView?: boolean) => void) | null>(null);
  const staffPage = location.pathname === "/staff";
  const emailChangeToken = new URLSearchParams(location.search).get("email_change");
  const platformHost = isPlatformHostname();
  const heroPath = lang === "en" ? "/en#hero" : "/#hero";
  const homeHref = platformHost ? publicSiteHref(heroPath) : heroPath;

  useEffect(() => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)").matches) return;
    let webglAvailable = false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      webglAvailable = Boolean(gl);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglAvailable = false;
    }
    if (!webglAvailable) return;
    const schedule = window.requestIdleCallback?.(() => setPortalReady(true), { timeout: 1600 });
    const fallback = schedule === undefined ? window.setTimeout(() => setPortalReady(true), 900) : undefined;
    return () => {
      if (schedule !== undefined) window.cancelIdleCallback?.(schedule);
      if (fallback !== undefined) window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => () => transitionRef.current?.(false), []);

  const changeTab = useCallback((next: "login" | "register") => {
    if (next === tab || staffPage) return;
    transitionRef.current?.();
    setTab(next);
    const ring = portalRef.current;
    const content = contentRef.current;
    if (!ring || !content || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setViewTab(next);
      return;
    }
    let cancelled = false;
    void import("gsap").then(({ default: gsap }) => {
      if (cancelled) return;
      const nextTurn = turnRef.current + 180;
      const timeline = gsap.timeline({ onComplete: () => { turnRef.current = nextTurn; transitionRef.current = null; } });
      timeline.to(content, { opacity: 0, y: -10, duration: 0.22, ease: "power2.in" }, 0)
        .to(ring, { rotateY: nextTurn, rotateZ: next === "register" ? 18 : -18, duration: 0.9, ease: "power3.inOut" }, 0)
        .call(() => setViewTab(next), [], 0.42)
        .fromTo(content, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0.55);
      transitionRef.current = (syncView = true) => {
        cancelled = true;
        timeline.kill();
        gsap.set(content, { clearProps: "opacity,transform" });
        if (syncView) setViewTab(next);
      };
    }).catch(() => {
      if (!cancelled) {
        transitionRef.current = null;
        setViewTab(next);
      }
    });
    transitionRef.current = (syncView = true) => { cancelled = true; if (syncView) setViewTab(next); };
  }, [staffPage, tab]);

  useEffect(() => {
    if (tab !== viewTab && !transitionRef.current) setViewTab(tab);
  }, [tab, viewTab]);

  const requestedFrom = (location.state as { from?: string } | null)?.from;
  const from = requestedFrom?.startsWith("/") && !requestedFrom.startsWith("//") ? requestedFrom : null;
  const destination = useCallback((staff: boolean) => from || (staff ? "/profil?tab=overview" : "/profil"), [from]);

  useEffect(() => {
    cfAuth.signupProtectionEnabled().then(setTurnstileEnabled).catch(() => setTurnstileEnabled(false));
  }, []);

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: `${staffPage ? copy.metaStaff : t.auth.login} — Avyron`,
        description: copy.metaDescription,
        path: staffPage ? "/staff" : "/auth",
        locale: lang === "en" ? "en_US" : "ro_RO",
        robots: "noindex, nofollow",
      })
    );
  }, [copy, lang, t.auth.login, staffPage]);

  useEffect(() => {
    if (!loading && user && !emailChangeToken && (!staffPage || isStaff)) navigate(destination(isStaff), { replace: true });
  }, [user, loading, isStaff, destination, navigate, emailChangeToken, staffPage]);

  useEffect(() => {
    if (!user || !emailChangeToken) return;
    let active = true;
    setSubmitting(true);
    cfAuth.confirmEmailChange(emailChangeToken)
      .then(() => {
        if (!active) return;
        setVerificationMessage(copy.emailChanged);
        toast.success(copy.emailUpdated);
        navigate("/auth", { replace: true });
      })
      .catch((error: Error) => active && setVerificationMessage(error.message))
      .finally(() => active && setSubmitting(false));
    return () => { active = false; };
  }, [user, emailChangeToken, navigate, copy]);

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("verify");
    if (!token) return;
    let active = true;
    cfAuth.verifyEmail(token)
      .then(() => {
        if (!active) return;
        setTab("login");
        setVerificationMessage(copy.verified);
        navigate("/auth", { replace: true });
      })
      .catch((error: Error) => active && setVerificationMessage(error.message));
    return () => { active = false; };
  }, [location.search, navigate, copy]);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: localStorage.getItem("avyron:login-identifier") || "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "", entityType: "individual", organizationName: "", taxId: "" },
  });
  const selectedEntityType = registerForm.watch("entityType");
  const formalEntity = selectedEntityType === "srl" || selectedEntityType === "pfa" || selectedEntityType === "ii";

  const onLogin = async (data: LoginInput) => {
    setSubmitting(true);
    try {
      const result = await cfAuth.login(data.identifier, data.password, keepSignedIn);
      if ("mfa_required" in result) {
        setMfaChallenge(result.challenge_token);
        setMfaCode("");
        return;
      }
      const staff = result.user.roles.includes("staff") || result.user.roles.includes("admin");
      if (staffPage && !staff) {
        await cfAuth.logout();
        setVerificationMessage(copy.clientStaffOnly);
        return;
      }
      if (rememberIdentifier) localStorage.setItem("avyron:login-identifier", data.identifier.trim());
      else localStorage.removeItem("avyron:login-identifier");
      await refreshProfile();
      if (result.mfa_enrollment_required) {
        toast.info(copy.mfaEnroll);
        if (!emailChangeToken) navigate("/profil?tab=settings", { replace: true });
        return;
      }
      toast.success(t.auth.welcomeBack);
      if (!emailChangeToken) navigate(destination(staff), { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "invalid_credentials" ? copy.invalidCredentials : message || copy.loginError);
    } finally {
      setSubmitting(false);
    }
  };

  const onMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaChallenge) return;
    setSubmitting(true);
    try {
      const result = await cfAuth.verifyMfaChallenge(mfaChallenge, mfaCode);
      const staff = result.user.roles.includes("staff") || result.user.roles.includes("admin");
      if (staffPage && !staff) {
        await cfAuth.logout();
        setVerificationMessage(copy.clientStaffOnly);
        setMfaChallenge(null);
        return;
      }
      if (rememberIdentifier) localStorage.setItem("avyron:login-identifier", loginForm.getValues("identifier").trim());
      else localStorage.removeItem("avyron:login-identifier");
      await refreshProfile();
      toast.success(t.auth.welcomeBack);
      setMfaChallenge(null);
      if (!emailChangeToken) navigate(destination(staff), { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : copy.mfaError);
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterInput) => {
    if (turnstileEnabled && TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error(copy.captcha);
      return;
    }
    setSubmitting(true);
    try {
      const result = await cfAuth.signup({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        entityType: data.entityType,
        organizationName: data.entityType === "individual" ? "" : data.organizationName,
        taxId: ["srl", "pfa", "ii"].includes(data.entityType) ? data.taxId : "",
        language: lang,
        turnstileToken,
      });
      setVerificationEmail(data.email);
      setVerificationMessage(result.verification_email_sent ? copy.verifySent : copy.verifyUnsent);
      loginForm.setValue("identifier", data.email);
      changeTab("login");
      if (result.verification_email_sent) toast.success(copy.verifyToast);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "email_taken" ? copy.emailTaken
        : message === "verification_delivery_unavailable" ? copy.verifyUnavailable
        : message === "organization_name_required" ? copy.organizationRequired
        : message === "invalid_tax_id" ? copy.taxInvalid
        : message || copy.registerError);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerification = async () => {
    setSubmitting(true);
    try {
      await cfAuth.resendVerification(verificationEmail);
      toast.success(copy.resendSuccess);
    } catch {
      toast.error(copy.resendError);
    } finally { setSubmitting(false); }
  };

  return (
    <main className="auth-page dark min-h-screen text-slate-100">
      <div className="auth-ambient auth-ambient-a" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-b" aria-hidden="true" />
      <div className="auth-stars" aria-hidden="true" />
      <header className="auth-topbar">
        <a href={homeHref} className="auth-brand font-display" aria-label={copy.home}>
          <img src={logo} alt="" width={34} height={34} />
          <span>AVYRON</span>
        </a>
        <div className="auth-topbar-actions"><span className="auth-topbar-caption"><ShieldCheck size={15} /> {staffPage ? copy.staffAccess : copy.account}</span><LangSwitch className="auth-lang-switch" /></div>
      </header>

      <section className="auth-stage" aria-label={staffPage ? copy.staffSection : copy.accountSection}>
        <div className="auth-portal" ref={portalRef} aria-hidden="true">
          <div className="auth-portal-face auth-portal-face-front" />
          <div className="auth-portal-face auth-portal-face-back" />
          <div className="auth-portal-halo" />
        </div>
        {portalReady && <OptionalPortalBoundary><Suspense fallback={null}><AuthPortal3D /></Suspense></OptionalPortalBoundary>}
        <div className="auth-orbit-info auth-orbit-info-left"><span className="auth-info-dot" aria-hidden="true" /><span>{staffPage ? "AVYRON OS" : viewTab === "register" ? copy.accountTypes : copy.projectsServices}</span></div>
        <div className="auth-orbit-info auth-orbit-info-right"><span className="auth-info-dot" aria-hidden="true" /><span>{staffPage ? copy.staffAccess : viewTab === "register" ? copy.minimumDetails : copy.conversationsInvoices}</span></div>
        <div className="auth-panel" ref={contentRef}>
          <div className="flex items-center justify-between gap-4">
            <PageBackLink to={homeHref} label={lang === "en" ? "Back" : "Înapoi"} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> {copy.secure}</span>
          </div>
          <div>
            <p className="auth-eyebrow"><Sparkles className="size-3.5" /> {staffPage ? "AVYRON OS" : copy.area}</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{staffPage ? copy.staffWelcome : viewTab === "register" ? copy.start : copy.welcome}</h1>
            <p className="mt-2 text-sm text-slate-400">{staffPage ? copy.staffIntro : viewTab === "register" ? copy.registerIntro : copy.loginIntro}</p>
          </div>

          {verificationMessage && (
            <div role="status" className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm">
              {verificationMessage}
              {verificationEmail && <button type="button" onClick={() => void resendVerification()} disabled={submitting} className="mt-2 block font-semibold text-brand underline underline-offset-4">{copy.resend}</button>}
            </div>
          )}

          {staffPage && user && !isStaff && <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">{copy.clientWarning} <Link to="/profil" className="font-semibold underline">{copy.clientOpen}</Link> {copy.or} <button type="button" onClick={() => void signOut()} className="font-semibold underline">{copy.signOut}</button>.</div>}

          <Tabs value={staffPage ? "login" : viewTab} onValueChange={(v) => changeTab(v as typeof tab)} className="w-full">
            {!staffPage && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="register">{t.auth.register}</TabsTrigger>
            </TabsList>
            )}

            <TabsContent value="login" className="space-y-5 mt-6">
              {mfaChallenge ? (
                <form onSubmit={onMfa} className="space-y-4">
                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-4">
                    <KeyRound className="mb-2 size-5 text-brand" />
                    <h2 className="font-semibold">{copy.mfaTitle}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.mfaIntro}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mfa-code">{copy.securityCode}</Label>
                    <Input
                      id="mfa-code"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value.toUpperCase())}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={14}
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full h-11" disabled={submitting || mfaCode.length < 6}>
                    {submitting ? "..." : copy.confirmAccess}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setMfaChallenge(null)}>
                    {copy.backToLogin}
                  </Button>
                </form>
              ) : (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="li-identifier">{copy.identifier}</Label>
                  <Input id="li-identifier" type="text" autoComplete="username" {...loginForm.register("identifier")} />
                  {loginForm.formState.errors.identifier && (
                    <p className="text-xs text-destructive">{authValidationMessage(loginForm.formState.errors.identifier.message, lang)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="li-pass">{t.auth.password}</Label>
                    <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                      {t.auth.forgot}
                    </Link>
                  </div>
                  <PasswordInput id="li-pass" autoComplete="current-password" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{authValidationMessage(loginForm.formState.errors.password.message, lang)}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rememberIdentifier} onChange={(event) => setRememberIdentifier(event.target.checked)} /> {copy.remember}</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> {copy.staySignedIn}</label>
                </div>
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting || (staffPage && Boolean(user && !isStaff))}>
                  {submitting ? "..." : t.auth.login}
                </Button>
              </form>
              )}
            </TabsContent>

            <TabsContent value="register" className="space-y-5 mt-6">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rg-entity">{copy.registerAs}</Label>
                  <Select
                    value={selectedEntityType}
                    onValueChange={(v) => registerForm.setValue("entityType", v as RegisterInput["entityType"], { shouldValidate: true })}
                  >
                    <SelectTrigger id="rg-entity"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">{t.auth.entity.individual}</SelectItem>
                      <SelectItem value="srl">{t.auth.entity.srl}</SelectItem>
                      <SelectItem value="pfa">{t.auth.entity.pfa}</SelectItem>
                      <SelectItem value="ii">{t.auth.entity.ii}</SelectItem>
                      <SelectItem value="startup">{t.auth.entity.startup}</SelectItem>
                      <SelectItem value="public_institution">{t.auth.entity.public_institution}</SelectItem>
                      <SelectItem value="avyron_partner">{t.auth.entity.avyron_partner}</SelectItem>
                      <SelectItem value="other">{t.auth.entity.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-name">{selectedEntityType === "individual" ? copy.yourName : copy.contactName}</Label>
                  <Input id="rg-name" autoComplete="name" placeholder={selectedEntityType === "individual" ? copy.yourName : copy.contactPlaceholder} {...registerForm.register("displayName")} />
                  {registerForm.formState.errors.displayName && (
                    <p className="text-xs text-destructive">{authValidationMessage(registerForm.formState.errors.displayName.message, lang)}</p>
                  )}
                </div>
                {selectedEntityType !== "individual" && <div className="space-y-1.5">
                  <Label htmlFor="rg-organization">{copy.organizationLabels[selectedEntityType]}</Label>
                  <Input id="rg-organization" autoComplete="organization" maxLength={160} {...registerForm.register("organizationName")} />
                  {registerForm.formState.errors.organizationName && <p className="text-xs text-destructive">{authValidationMessage(registerForm.formState.errors.organizationName.message, lang)}</p>}
                </div>}
                {formalEntity && <div className="space-y-1.5">
                  <Label htmlFor="rg-tax-id">{copy.taxId}</Label>
                  <Input id="rg-tax-id" inputMode="numeric" autoComplete="off" maxLength={40} {...registerForm.register("taxId")} />
                  <p className="text-xs text-slate-400">{copy.taxHint}</p>
                  {registerForm.formState.errors.taxId && <p className="text-xs text-destructive">{authValidationMessage(registerForm.formState.errors.taxId.message, lang)}</p>}
                </div>}
                {selectedEntityType === "avyron_partner" && <p className="text-xs leading-relaxed text-slate-400">{copy.partnerHint}</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="rg-email">{t.auth.email}</Label>
                  <Input id="rg-email" type="email" autoComplete="email" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{authValidationMessage(registerForm.formState.errors.email.message, lang)}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-pass">{t.auth.password}</Label>
                  <PasswordInput id="rg-pass" autoComplete="new-password" {...registerForm.register("password")} />
                  <p className="text-xs text-muted-foreground">{copy.passwordHint}</p>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{authValidationMessage(registerForm.formState.errors.password.message, lang)}</p>
                  )}
                </div>
                {turnstileEnabled && <Turnstile action="signup" onToken={setTurnstileToken} resetKey={turnstileReset} />}
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
                  {submitting ? "..." : <>{t.auth.register}<ArrowRight className="ml-2 size-4" /></>}
                </Button>
                <p className="text-center text-xs text-muted-foreground">{copy.verificationHint}</p>
              </form>
            </TabsContent>
          </Tabs>
          <div className="border-t pt-5 text-center text-sm text-muted-foreground">{staffPage ? <>{copy.clientQuestion} <Link className="font-semibold text-brand hover:underline" to="/auth">{copy.clientLink}</Link></> : <>{copy.staffQuestion} <Link className="font-semibold text-brand hover:underline" to="/staff">{copy.staffLink}</Link></>}</div>
        </div>
      </section>
      <p className="auth-page-footnote">{staffPage ? copy.staffFootnote : copy.footnote}</p>
    </main>
  );
};

export default Auth;
