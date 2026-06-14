import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cfAuth } from "@/lib/cfAuth";
import { useAuth } from "@/hooks/useAuth";
import { useLang } from "@/i18n/LanguageContext";

export function ProfileTab() {
  const { t } = useLang();
  const { user, profile, isStaff, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    display_name: "",
    pseudonym: "",
    staff_role: "dev" as "dev" | "designer" | "marketing" | "support" | "admin",
    phone: "",
    address: "",
    entity_type: "individual" as "individual" | "srl" | "pfa" | "ii" | "other",
    company_name: "",
    cui: "",
    social_facebook: "",
    social_instagram: "",
    social_tiktok: "",
    website: "",
    language: "ro" as "ro" | "en",
    theme: "system" as "light" | "dark" | "system",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? "",
        pseudonym: profile.pseudonym ?? "",
        staff_role: profile.staff_role ?? "dev",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
        entity_type: profile.entity_type ?? "individual",
        company_name: profile.company_name ?? "",
        cui: profile.cui ?? "",
        social_facebook: profile.social_facebook ?? "",
        social_instagram: profile.social_instagram ?? "",
        social_tiktok: profile.social_tiktok ?? "",
        website: profile.website ?? "",
        language: profile.language,
        theme: profile.theme,
      });
    }
  }, [profile]);

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Fișierul depășește 5MB");
    setUploading(true);
    try {
      await cfAuth.uploadAvatar(file);
      await refreshProfile();
      toast.success(t.auth.profile.saved);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await cfAuth.updateProfile({ ...form } as any);
      await refreshProfile();
      toast.success(t.auth.profile.saved);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.display_name || user?.email || "A")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const isCompany = form.entity_type !== "individual";

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-display font-bold leading-tight">{t.auth.profile.title}</h2>
        <p className="text-xs text-muted-foreground">{t.auth.profile.subtitle}</p>
      </div>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">{t.auth.profile.avatar}</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-3 pt-0 pb-3">
          <Avatar className="size-14">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-foreground to-brand text-background text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="size-3.5 mr-1.5" />{uploading ? "..." : t.auth.profile.changeAvatar}
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG • max 5MB</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Date personale</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2.5 pt-0 pb-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t.auth.displayName}</Label>
            <Input className="h-8 text-sm" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.auth.email}</Label>
            <Input className="h-8 text-sm" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.auth.profile.phone}</Label>
            <Input className="h-8 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">{t.auth.profile.address}</Label>
            <Textarea rows={2} className="text-sm min-h-[56px]" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          {isStaff ? (
            <>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">{t.auth.profile.pseudonym}</Label>
                <Input
                  className="h-8 text-sm"
                  value={form.pseudonym}
                  onChange={(e) => setForm({ ...form, pseudonym: e.target.value })}
                  placeholder="ex: Alex_Dev"
                />
                <p className="text-[10px] text-muted-foreground">{t.auth.profile.pseudonymHint}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.auth.profile.staffRole}</Label>
                <Select
                  value={form.staff_role}
                  onValueChange={(v) => setForm({ ...form, staff_role: v as typeof form.staff_role })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">{t.auth.profile.staffRoles.admin}</SelectItem>
                    <SelectItem value="dev">{t.auth.profile.staffRoles.dev}</SelectItem>
                    <SelectItem value="designer">{t.auth.profile.staffRoles.designer}</SelectItem>
                    <SelectItem value="marketing">{t.auth.profile.staffRoles.marketing}</SelectItem>
                    <SelectItem value="support">{t.auth.profile.staffRoles.support}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">{t.auth.entityType}</Label>
                <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v as typeof form.entity_type })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{t.auth.entity.individual}</SelectItem>
                    <SelectItem value="srl">{t.auth.entity.srl}</SelectItem>
                    <SelectItem value="pfa">{t.auth.entity.pfa}</SelectItem>
                    <SelectItem value="ii">{t.auth.entity.ii}</SelectItem>
                    <SelectItem value="other">{t.auth.entity.other}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isCompany && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.auth.profile.companyName}</Label>
                    <Input className="h-8 text-sm" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t.auth.profile.cui}</Label>
                    <Input className="h-8 text-sm" value={form.cui} onChange={(e) => setForm({ ...form, cui: e.target.value })} />
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">{t.auth.profile.socials}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2.5 pt-0 pb-3">
          <div className="space-y-1"><Label className="text-xs">Facebook</Label>
            <Input className="h-8 text-sm" placeholder="https://facebook.com/..." value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Instagram</Label>
            <Input className="h-8 text-sm" placeholder="https://instagram.com/..." value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">TikTok</Label>
            <Input className="h-8 text-sm" placeholder="https://tiktok.com/@..." value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">{t.auth.profile.website}</Label>
            <Input className="h-8 text-sm" placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3"><CardTitle className="text-sm">Preferințe</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-2.5 pt-0 pb-3">
          <div className="space-y-1">
            <Label className="text-xs">{t.auth.profile.language}</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as "ro" | "en" })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">Română</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.auth.profile.theme}</Label>
            <Select
              value={form.theme}
              onValueChange={(v) => {
                const next = v as typeof form.theme;
                setForm({ ...form, theme: next });
                localStorage.setItem("theme", next);
                const root = document.documentElement;
                root.classList.remove("light", "dark");
                if (next === "system") {
                  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                  root.classList.add(prefersDark ? "dark" : "light");
                } else {
                  root.classList.add(next);
                }
              }}
            >
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.auth.profile.themes.light}</SelectItem>
                <SelectItem value="dark">{t.auth.profile.themes.dark}</SelectItem>
                <SelectItem value="system">{t.auth.profile.themes.system}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/forgot-password">{t.auth.profile.changePassword}</Link>
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving} className="rounded-full">
          {saving ? "..." : t.auth.profile.save}
        </Button>
      </div>
    </div>
  );
}
