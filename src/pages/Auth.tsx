import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, LayoutDashboard, ArrowLeft, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import SocialButtons from "@/components/auth/SocialButtons";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validators/auth";
import logo from "@/assets/avyron-logo.jpg";

const Auth = () => {
  const { t } = useLang();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/profil";

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: `${t.auth.login} — Avyron`,
        description:
          "Autentificare și înregistrare în contul Avyron — accesează panoul de proiecte, facturi și mesaje.",
        path: "/auth",
      })
    );
  }, [t.auth.login]);

  useEffect(() => {
    if (!loading && user) navigate(from, { replace: true });
  }, [user, loading, from, navigate]);

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
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.welcomeBack);
    navigate(from, { replace: true });
  };

  const onRegister = async (data: RegisterInput) => {
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/profil`,
        data: {
          display_name: data.displayName,
          entity_type: data.entityType,
        },
      },
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    // entity_type isn't on profiles via metadata trigger — update after signup
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session?.user) {
      await supabase
        .from("profiles")
        .update({ entity_type: data.entityType, display_name: data.displayName })
        .eq("id", sess.session.user.id);
    }
    setSubmitting(false);
    toast.success(t.auth.accountCreated);
    navigate(from, { replace: true });
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left — branded copy */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-foreground via-foreground to-brand text-background overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--brand))_0%,transparent_50%),radial-gradient(circle_at_80%_80%,hsl(var(--accent))_0%,transparent_50%)]" />
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl">
            <img src={logo} alt="Avyron" className="size-8 rounded-lg object-cover" />
            Avyron
          </Link>
        </div>
        <div className="relative z-10 space-y-6 max-w-md mx-auto text-center">
          <h1 className="font-display text-4xl font-bold leading-tight">{t.auth.heroTitle}</h1>
          <p className="text-base text-background/80">{t.auth.heroDesc}</p>
          <div className="space-y-4 pt-4 text-left">
            <div className="flex gap-3">
              <Sparkles className="size-5 mt-1 text-brand-foreground/80 shrink-0" />
              <p className="text-sm text-background/80">{t.auth.clientPerksDesc}</p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="size-5 mt-1 text-brand-foreground/80 shrink-0" />
              <p className="text-sm text-background/80">
                Sfaturi periodice de securitate, noutăți tech și acces prioritar la noile colaborări.
              </p>
            </div>
            <div className="flex gap-3">
              <LayoutDashboard className="size-5 mt-1 text-brand-foreground/80 shrink-0" />
              <p className="text-sm text-background/80">
                Mini-dashboard intuitiv pentru produse, mentenanță și plăți recurente.
              </p>
            </div>
            <div className="flex gap-3">
              <MessageCircle className="size-5 mt-1 text-brand-foreground/80 shrink-0" />
              <p className="text-sm text-background/80">
                Chat direct cu membrii echipei.
              </p>
            </div>
          </div>
        </div>
        <div className="relative z-10 text-xs text-background/60">© {new Date().getFullYear()} Avyron</div>
      </section>

      {/* Right — form */}
      <section className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Înapoi
          </Link>

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="register">{t.auth.register}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-5 mt-6">
              <SocialButtons />
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase">{t.auth.orContinue}</span>
                <Separator className="flex-1" />
              </div>
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
              <SocialButtons />
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase">{t.auth.orContinue}</span>
                <Separator className="flex-1" />
              </div>
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
                  <Label>{t.auth.entityType}</Label>
                  <Select
                    value={registerForm.watch("entityType")}
                    onValueChange={(v) => registerForm.setValue("entityType", v as RegisterInput["entityType"])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">{t.auth.entity.individual}</SelectItem>
                      <SelectItem value="srl">{t.auth.entity.srl}</SelectItem>
                      <SelectItem value="pfa">{t.auth.entity.pfa}</SelectItem>
                      <SelectItem value="ii">{t.auth.entity.ii}</SelectItem>
                      <SelectItem value="other">{t.auth.entity.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
