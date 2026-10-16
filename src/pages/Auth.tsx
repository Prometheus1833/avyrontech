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
import { PasswordInput } from "@/components/auth/PasswordInput";
import "./auth.css";

const AuthPortal3D = lazy(() => import("@/components/auth/AuthPortal3D"));

class OptionalPortalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const Auth = () => {
  const { t, lang } = useLang();
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
        title: `${staffPage ? "Acces echipă" : t.auth.login} — Avyron`,
        description:
          "Autentificare și înregistrare în contul Avyron — accesează panoul de proiecte, facturi și mesaje.",
        path: staffPage ? "/staff" : "/auth",
        robots: "noindex, nofollow",
      })
    );
  }, [t.auth.login, staffPage]);

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
        setVerificationMessage("Adresa de email a fost schimbată. Autentifică-te din nou cu noua adresă.");
        toast.success("Adresa de email a fost actualizată.");
        navigate("/auth", { replace: true });
      })
      .catch((error: Error) => active && setVerificationMessage(error.message))
      .finally(() => active && setSubmitting(false));
    return () => { active = false; };
  }, [user, emailChangeToken, navigate]);

  useEffect(() => {
    const token = new URLSearchParams(location.search).get("verify");
    if (!token) return;
    let active = true;
    cfAuth.verifyEmail(token)
      .then(() => {
        if (!active) return;
        setTab("login");
        setVerificationMessage("Adresa a fost confirmată. Te poți autentifica.");
        navigate("/auth", { replace: true });
      })
      .catch((error: Error) => active && setVerificationMessage(error.message));
    return () => { active = false; };
  }, [location.search, navigate]);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: localStorage.getItem("avyron:login-identifier") || "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "", entityType: "individual" },
  });

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
        setVerificationMessage("Acest cont este de client. Intră din pagina pentru clienți.");
        return;
      }
      if (rememberIdentifier) localStorage.setItem("avyron:login-identifier", data.identifier.trim());
      else localStorage.removeItem("avyron:login-identifier");
      await refreshProfile();
      if (result.mfa_enrollment_required) {
        toast.info("Activează autentificarea în doi pași ca să deschizi zonele echipei.");
        if (!emailChangeToken) navigate("/profil?tab=settings", { replace: true });
        return;
      }
      toast.success(t.auth.welcomeBack);
      if (!emailChangeToken) navigate(destination(staff), { replace: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "invalid_credentials" ? "Datele de autentificare nu sunt corecte." : message || "Autentificarea nu a reușit.");
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
        setVerificationMessage("Acest cont este de client. Intră din pagina pentru clienți.");
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
      toast.error(error instanceof Error ? error.message : "Codul MFA nu este valid.");
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterInput) => {
    if (turnstileEnabled && TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Confirmă verificarea anti-spam.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await cfAuth.signup({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        entityType: data.entityType,
        turnstileToken,
      });
      setVerificationEmail(data.email);
      setVerificationMessage(result.verification_email_sent
        ? "Contul a fost creat în siguranță. Confirmă adresa din email pentru a intra."
        : "Contul a fost creat, dar emailul de confirmare nu a putut fi trimis. Reîncearcă trimiterea mai jos.");
      loginForm.setValue("identifier", data.email);
      changeTab("login");
      if (result.verification_email_sent) toast.success("Ți-am trimis linkul de confirmare.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message === "email_taken" ? "Adresa are deja un cont. Intră în cont sau resetează parola." : message || "Înregistrarea nu a reușit.");
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
      toast.success("Dacă adresa are un cont neconfirmat, am retrimis linkul.");
    } catch {
      toast.error("Nu am putut retrimite mesajul acum. Încearcă din nou mai târziu.");
    } finally { setSubmitting(false); }
  };

  return (
    <main className="auth-page dark min-h-screen text-slate-100">
      <div className="auth-ambient auth-ambient-a" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-b" aria-hidden="true" />
      <div className="auth-stars" aria-hidden="true" />
      <header className="auth-topbar">
        <a href={homeHref} className="auth-brand font-display" aria-label="AVYRON — pagina principală">
          <img src={logo} alt="" width={34} height={34} />
          <span>AVYRON</span>
        </a>
        <span className="auth-topbar-caption"><ShieldCheck size={15} /> {staffPage ? "ACCES ECHIPĂ" : "CONT AVYRON"}</span>
      </header>

      <section className="auth-stage" aria-label={staffPage ? "Autentificare staff" : "Autentificare și înregistrare"}>
        <div className="auth-portal" ref={portalRef} aria-hidden="true">
          <div className="auth-portal-face auth-portal-face-front" />
          <div className="auth-portal-face auth-portal-face-back" />
          <div className="auth-portal-halo" />
        </div>
        {portalReady && <OptionalPortalBoundary><Suspense fallback={null}><AuthPortal3D /></Suspense></OptionalPortalBoundary>}
        <div className="auth-orbit-info auth-orbit-info-left"><span className="auth-info-dot" aria-hidden="true" /><span>{staffPage ? "AVYRON OS" : viewTab === "register" ? "PERSOANĂ FIZICĂ · FIRMĂ" : "PROIECTE · SERVICII"}</span></div>
        <div className="auth-orbit-info auth-orbit-info-right"><span className="auth-info-dot" aria-hidden="true" /><span>{staffPage ? "ACCES PE ROLURI" : viewTab === "register" ? "DATE MINIME" : "CONVERSAȚII · FACTURI"}</span></div>
        <div className="auth-panel" ref={contentRef}>
          <div className="flex items-center justify-between gap-4">
            <PageBackLink to={homeHref} label={lang === "en" ? "Back" : "Înapoi"} />
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Acces securizat</span>
          </div>
          <div>
            <p className="auth-eyebrow"><Sparkles className="size-3.5" /> {staffPage ? "AVYRON OS" : "SPAȚIUL TĂU AVYRON"}</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{staffPage ? "Bine ai revenit în echipă" : viewTab === "register" ? "Începe aici" : "Bine ai revenit"}</h1>
            <p className="mt-2 text-sm text-slate-400">{staffPage ? "Intră cu email, username sau telefon." : viewTab === "register" ? "Un cont pentru proiectele tale. Completezi restul mai târziu." : "Proiectele și conversațiile tale te așteaptă."}</p>
          </div>

          {verificationMessage && (
            <div role="status" className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm">
              {verificationMessage}
              {verificationEmail && <button type="button" onClick={() => void resendVerification()} disabled={submitting} className="mt-2 block font-semibold text-brand underline underline-offset-4">Retrimite emailul de confirmare</button>}
            </div>
          )}

          {staffPage && user && !isStaff && <div role="alert" className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">Ești conectat cu un cont de client. <Link to="/profil" className="font-semibold underline">Deschide contul de client</Link> sau <button type="button" onClick={() => void signOut()} className="font-semibold underline">deconectează-te</button> pentru a intra ca staff.</div>}

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
                    <h2 className="font-semibold">Confirmare în doi pași</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Introdu codul din aplicația de autentificare sau un cod de recuperare.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mfa-code">Cod de securitate</Label>
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
                    {submitting ? "..." : "Confirmă accesul"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setMfaChallenge(null)}>
                    Revino la autentificare
                  </Button>
                </form>
              ) : (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="li-identifier">Email, username sau telefon</Label>
                  <Input id="li-identifier" type="text" autoComplete="username" {...loginForm.register("identifier")} />
                  {loginForm.formState.errors.identifier && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.identifier.message}</p>
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
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rememberIdentifier} onChange={(event) => setRememberIdentifier(event.target.checked)} /> Reține identificatorul</label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={keepSignedIn} onChange={(event) => setKeepSignedIn(event.target.checked)} /> Menține-mă conectat</label>
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
                  <Label htmlFor="rg-entity">Înregistrezi contul ca</Label>
                  <Select
                    value={registerForm.watch("entityType")}
                    onValueChange={(v) => registerForm.setValue("entityType", v as RegisterInput["entityType"])}
                  >
                    <SelectTrigger id="rg-entity"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Persoană fizică</SelectItem>
                      <SelectItem value="srl">Firmă (SRL)</SelectItem>
                      <SelectItem value="pfa">PFA</SelectItem>
                      <SelectItem value="ii">Întreprindere individuală</SelectItem>
                      <SelectItem value="other">Alt tip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-name">{registerForm.watch("entityType") === "individual" ? "Numele tău" : "Persoană de contact"}</Label>
                  <Input id="rg-name" autoComplete="name" placeholder={registerForm.watch("entityType") === "individual" ? "Numele tău" : "Numele persoanei de contact"} {...registerForm.register("displayName")} />
                  {registerForm.formState.errors.displayName && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.displayName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-email">{t.auth.email}</Label>
                  <Input id="rg-email" type="email" autoComplete="email" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-pass">{t.auth.password}</Label>
                  <PasswordInput id="rg-pass" autoComplete="new-password" {...registerForm.register("password")} />
                  <p className="text-xs text-muted-foreground">Minimum 8 caractere, o literă mare și o cifră.</p>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                {turnstileEnabled && <Turnstile action="signup" onToken={setTurnstileToken} resetKey={turnstileReset} />}
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
                  {submitting ? "..." : <>{t.auth.register}<ArrowRight className="ml-2 size-4" /></>}
                </Button>
                <p className="text-center text-xs text-muted-foreground">Un email de confirmare verifică adresa. Datele suplimentare se completează în profil.</p>
              </form>
            </TabsContent>
          </Tabs>
          <div className="border-t pt-5 text-center text-sm text-muted-foreground">{staffPage ? <>Ești client? <Link className="font-semibold text-brand hover:underline" to="/auth">Intră în contul de client</Link></> : <>Faci parte din echipă? <Link className="font-semibold text-brand hover:underline" to="/staff">Acces staff</Link></>}</div>
        </div>
      </section>
      <p className="auth-page-footnote">{staffPage ? "Un spațiu de lucru pentru echipa AVYRON." : "Un spațiu pentru idei, proiecte și lucrurile care urmează."}</p>
    </main>
  );
};

export default Auth;
