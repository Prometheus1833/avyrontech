import "./auth-cinematic.css";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Crown, ShieldCheck, LayoutDashboard, MessageCircle, KeyRound } from "lucide-react";
import { cfAuth } from "@/lib/cfAuth";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators/auth";
import logo from "@/assets/avyron-mark-ai.png";
import Turnstile from "@/components/site/Turnstile";
import { TURNSTILE_SITE_KEY } from "@/config/turnstile";
import { isPlatformHostname, publicSiteHref } from "@/lib/appHost";
import PageBackLink from "@/components/site/PageBackLink";

const Auth = () => {
  const { t, lang } = useLang();
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [authError,setAuthError]=useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const emailChangeToken = new URLSearchParams(location.search).get("email_change");
  const platformHost = isPlatformHostname();
  const heroPath = lang === "en" ? "/en#hero" : "/#hero";
  const homeHref = platformHost ? publicSiteHref(heroPath) : heroPath;

  const from = (location.state as { from?: string } | null)?.from ?? "/profil";

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: `${t.auth.login} — Avyron`,
        description:
          "Autentificare și înregistrare în contul Avyron — accesează panoul de proiecte, facturi și mesaje.",
        path: "/auth",
        robots: "noindex, nofollow",
      })
    );
  }, [t.auth.login]);

  useEffect(() => {
    if (!loading && user && !emailChangeToken) navigate(from, { replace: true });
  }, [user, loading, from, navigate, emailChangeToken]);

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
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", displayName: "", entityType: "individual" },
  });

  const onLogin = async (data: LoginInput) => {
    setSubmitting(true);setAuthError("");
    try {
      const result = await cfAuth.login(data.email, data.password);
      if ("mfa_required" in result) {
        setMfaChallenge(result.challenge_token);
        setMfaCode("");
        return;
      }
      await refreshProfile();
      toast.success(t.auth.welcomeBack);
      if (!emailChangeToken) navigate(from, { replace: true });
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Autentificarea nu a reușit.");
      toast.error(error instanceof Error ? error.message : "Autentificarea nu a reușit.");
    } finally {
      setSubmitting(false);
    }
  };

  const onMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mfaChallenge) return;
    setSubmitting(true);setAuthError("");
    try {
      await cfAuth.verifyMfaChallenge(mfaChallenge, mfaCode);
      await refreshProfile();
      toast.success(t.auth.welcomeBack);
      setMfaChallenge(null);
      if (!emailChangeToken) navigate(from, { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Codul MFA nu este valid.");
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterInput) => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Confirmă verificarea anti-spam.");
      return;
    }
    setSubmitting(true);setAuthError("");
    try {
      await cfAuth.signup({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        entityType: data.entityType,
        turnstileToken,
      });
      setVerificationMessage("Contul a fost creat. Verifică emailul și confirmă adresa înainte de autentificare.");
      setTab("login");
      toast.success("Ți-am trimis linkul de confirmare.");
    } catch (error: unknown) {
      setAuthError(error instanceof Error ? error.message : "Înregistrarea nu a reușit.");
      toast.error(error instanceof Error ? error.message : "Înregistrarea nu a reușit.");
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-cinematic grid lg:grid-cols-2">
      {/* Left — branded copy */}
      <section className="auth-stage relative flex flex-col p-12 overflow-hidden">
        <div aria-hidden="true" className="auth-orbit"/>
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--brand))_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent))_0%,transparent_50%)]" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,hsl(var(--background))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--background))_1px,transparent_1px)] [background-size:42px_42px]"
        />
        <div className="relative z-10 flex items-center justify-between">
          <a href={homeHref} className="inline-flex items-center gap-2 font-display font-bold text-xl">
            <img src={logo} alt="Avyron" width={32} height={32} className="size-8 rounded-lg bg-foreground/95 object-contain p-0.5" />
            Avyron
          </a>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400">
            AVYRON OS · workspace
          </span>
        </div>

        <div className="auth-stage-copy relative z-10 mt-10 max-w-md">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-slate-400 mb-5">
            <span className="size-1.5 rounded-full bg-brand-foreground animate-pulse" />
            {lang === "en" ? "your next chapter starts here" : "următorul capitol începe aici"}
          </span>
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[0.95] tracking-tight">
            {lang === "en" ? "Your ideas. One connected workspace." : "Ideile tale. Un spațiu conectat."}
          </h1>
          <p className="mt-5 font-mono text-[13px] leading-relaxed text-slate-400">
            {lang === "en" ? "From the first brief to the next launch. Projects, people and decisions, together in Avyron." : "De la primul brief la următoarea lansare. Proiecte, oameni și decizii, împreună în Avyron."}
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { n: "01", Icon: Crown, text: lang === "en" ? "Your briefs, documents and project updates in one place." : "Briefuri, documente și actualizări de proiect, într-un singur loc." },
              { n: "02", Icon: ShieldCheck, text: lang === "en" ? "Secure access, tailored to your role." : "Acces securizat, adaptat rolului tău." },
              { n: "03", Icon: LayoutDashboard, text: lang === "en" ? "Your projects and next steps, clearly organized." : "Proiectele și pașii următori, organizate clar." },
              { n: "04", Icon: MessageCircle, text: lang === "en" ? "Stay connected with your team." : "Rămâi conectat cu echipa ta." },
            ].map(({ n, Icon, text }) => (
              <li
                key={n}
                onPointerMove={e=>{if(e.pointerType!=="mouse")return;const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty("--tilt-x",`${(0.5-(e.clientY-r.top)/r.height)*5}deg`);e.currentTarget.style.setProperty("--tilt-y",`${((e.clientX-r.left)/r.width-0.5)*5}deg`);}} onPointerLeave={e=>{e.currentTarget.style.setProperty("--tilt-x","0deg");e.currentTarget.style.setProperty("--tilt-y","0deg");}}
                className="auth-feature group relative flex items-start gap-4 rounded-xl border border-background/10 bg-background/[0.04] backdrop-blur-sm p-3.5 transition-colors hover:bg-background/[0.08] hover:border-background/20"
              >
                <span className="font-mono text-[10px] tracking-widest text-slate-400 pt-0.5 w-6">
                  {n}
                </span>
                <Icon className="size-4 mt-0.5 text-violet-300 shrink-0" strokeWidth={2.25} />
                <p className="text-[13px] leading-relaxed text-slate-200">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <footer className="relative z-10 mt-auto pt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400">
          © {new Date().getFullYear()} · Avyron Tech
        </footer>
      </section>

      {/* Right — form */}
      <section className="auth-form-wrap flex items-center justify-center p-6 sm:p-12">
        <div className="auth-form-panel w-full max-w-md space-y-6">
          <PageBackLink to={homeHref} label={lang === "en" ? "Back" : "Înapoi"} />

          <div><p className="mb-2 text-xs uppercase tracking-[.2em] text-violet-300">{lang==='en'?'Welcome to Avyron':'Bine ai venit în Avyron'}</p><h2 className="text-2xl font-display font-semibold">{tab==='login'?(lang==='en'?'Continue your work.':'Continuă ce ai început.'):(lang==='en'?'Let’s build your next chapter.':'Construim următorul capitol.')}</h2><p className="mt-2 text-sm text-slate-400">{tab==='login'?(lang==='en'?'Sign in to your projects and workspace.':'Intră în cont pentru proiectele și spațiul tău de lucru.'):(lang==='en'?'Create your account. We’ll confirm your email before your first sign in.':'Creează contul. Confirmăm adresa de email înainte de prima conectare.')}</p></div>
          {authError&&<div role="alert" className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{authError}</div>}
          {verificationMessage && (
            <div role="status" className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm">
              {verificationMessage}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => {if(!submitting){setAuthError("");setTab(v as typeof tab);}}} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="register">{t.auth.register}</TabsTrigger>
            </TabsList>

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
                  <Label htmlFor="li-email">{t.auth.email}</Label>
                  <Input id="li-email" type="email" autoComplete="email" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="li-pass">{t.auth.password}</Label>
                    <Link to="/forgot-password" className="text-xs text-brand hover:underline">
                      {t.auth.forgot}
                    </Link>
                  </div>
                  <Input id="li-pass" type="password" autoComplete="current-password" {...loginForm.register("password")} />
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
                  {submitting ? "..." : t.auth.login}
                </Button>
              </form>
              )}
            </TabsContent>

            <TabsContent value="register" className="space-y-5 mt-6">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rg-name">{t.auth.displayName}</Label>
                  <Input id="rg-name" {...registerForm.register("displayName")} />
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
                  <Input id="rg-pass" type="password" autoComplete="new-password" {...registerForm.register("password")} />
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rg-entity">{t.auth.entityType}</Label>
                  <Select
                    value={registerForm.watch("entityType")}
                    onValueChange={(v) => registerForm.setValue("entityType", v as RegisterInput["entityType"])}
                  >
                    <SelectTrigger id="rg-entity"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">{t.auth.entity.individual}</SelectItem>
                      <SelectItem value="srl">{t.auth.entity.srl}</SelectItem>
                      <SelectItem value="pfa">{t.auth.entity.pfa}</SelectItem>
                      <SelectItem value="ii">{t.auth.entity.ii}</SelectItem>
                      <SelectItem value="other">{t.auth.entity.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Turnstile action="signup" onToken={setTurnstileToken} resetKey={turnstileReset} />
                <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
                  {submitting ? "..." : t.auth.register}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
};

export default Auth;
