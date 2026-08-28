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
import { Crown, ShieldCheck, LayoutDashboard, ArrowLeft, MessageCircle } from "lucide-react";
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

const Auth = () => {
  const { t, lang } = useLang();
  const { user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [verificationMessage, setVerificationMessage] = useState("");
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
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, from, navigate]);

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
    setSubmitting(true);
    try {
      await cfAuth.login(data.email, data.password);
      await refreshProfile();
      toast.success(t.auth.welcomeBack);
      navigate(from, { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Autentificarea nu a reușit.");
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (data: RegisterInput) => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error("Confirmă verificarea anti-spam.");
      return;
    }
    setSubmitting(true);
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
      toast.error(error instanceof Error ? error.message : "Înregistrarea nu a reușit.");
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left — branded copy */}
      <section className="relative hidden lg:flex flex-col p-12 bg-gradient-to-br from-foreground via-foreground to-brand text-background overflow-hidden">
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
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-background/60">
            v1.0 · secure
          </span>
        </div>

        <div className="relative z-10 mt-10 max-w-md">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase text-background/70 mb-5">
            <span className="size-1.5 rounded-full bg-brand-foreground animate-pulse" />
            access · granted
          </span>
          <h1 className="font-display text-5xl xl:text-6xl font-bold leading-[0.95] tracking-tight">
            {t.auth.heroTitle}
          </h1>
          <p className="mt-5 font-mono text-[13px] leading-relaxed text-background/75">
            {t.auth.heroDesc}
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { n: "01", Icon: Crown, text: t.auth.clientPerksDesc },
              { n: "02", Icon: ShieldCheck, text: "Infrastructură Cloudflare — D1, KV, R2, edge auth." },
              { n: "03", Icon: LayoutDashboard, text: "Mini-dashboard intuitiv pentru produse, mentenanță și plăți recurente." },
              { n: "04", Icon: MessageCircle, text: "Chat direct cu membrii echipei." },
            ].map(({ n, Icon, text }) => (
              <li
                key={n}
                className="group relative flex items-start gap-4 rounded-xl border border-background/10 bg-background/[0.04] backdrop-blur-sm p-3.5 transition-colors hover:bg-background/[0.08] hover:border-background/20"
              >
                <span className="font-mono text-[10px] tracking-widest text-background/50 pt-0.5 w-6">
                  {n}
                </span>
                <Icon className="size-4 mt-0.5 text-brand-foreground shrink-0" strokeWidth={2.25} />
                <p className="text-[13px] leading-relaxed text-background/90">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-auto pt-8 font-mono text-[10px] tracking-[0.2em] uppercase text-background/50">
          © {new Date().getFullYear()} · Avyron Tech
        </div>
      </section>

      {/* Right — form */}
      <section className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          <a href={homeHref} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Înapoi
          </a>

          {verificationMessage && (
            <div role="status" className="rounded-xl border border-brand/25 bg-brand/10 px-4 py-3 text-sm">
              {verificationMessage}
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="register">{t.auth.register}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5 mt-6">
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
