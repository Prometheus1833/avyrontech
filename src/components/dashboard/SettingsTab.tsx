import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLang } from "@/i18n/LanguageContext";
import { Bell, Globe, Palette, Shield, Mail } from "lucide-react";
import { toast } from "sonner";

export const SettingsTab = () => {
  const { user, isStaff, isAdmin } = useAuth();
  const { lang, setLang } = useLang();
  const [theme, setTheme] = useState<string>(localStorage.getItem("theme") || "system");
  const [notifEmail, setNotifEmail] = useState<boolean>(localStorage.getItem("notif_email") !== "false");
  const [notifPush, setNotifPush] = useState<boolean>(localStorage.getItem("notif_push") === "true");

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

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Email de resetare trimis");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="size-4" />Cont</CardTitle><CardDescription>Informații despre contul tău</CardDescription></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">ID utilizator</span><span className="font-mono text-xs">{user?.id.slice(0, 8)}…</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Rol</span><span className="font-medium">{isAdmin ? "Administrator" : isStaff ? "Membru staff" : "Utilizator"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cont creat</span><span>{user?.created_at && new Date(user.created_at).toLocaleDateString("ro-RO")}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="size-4" />Securitate</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handlePasswordReset}>Schimbă parola prin email</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="size-4" />Aspect</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Temă</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Sistem</SelectItem>
                <SelectItem value="light">Luminos</SelectItem>
                <SelectItem value="dark">Întunecat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="size-4" />Limbă</CardTitle></CardHeader>
        <CardContent>
          <Select value={lang} onValueChange={(v: any) => setLang(v)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ro">Română</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="size-4" />Notificări</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div><Label>Email</Label><p className="text-xs text-muted-foreground">Primește notificări pe email</p></div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Push</Label><p className="text-xs text-muted-foreground">Notificări în browser</p></div>
            <Switch checked={notifPush} onCheckedChange={setNotifPush} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
