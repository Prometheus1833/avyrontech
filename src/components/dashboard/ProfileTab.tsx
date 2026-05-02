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
import { supabase } from "@/integrations/supabase/client";
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
    staff_role: "dev" as "dev" | "designer" | "marketing" | "support",
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
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    await refreshProfile();
    toast.success(t.auth.profile.saved);
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ ...form }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success(t.auth.profile.saved);
  };

  const initials = (form.display_name || user?.email || "A")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const isCompany = form.entity_type !== "individual";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold">{t.auth.profile.title}</h2>
        <p className="text-sm text-muted-foreground">{t.auth.profile.subtitle}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.auth.profile.avatar}</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-20">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-foreground to-brand text-background">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera className="size-4 mr-2" />{uploading ? "..." : t.auth.profile.changeAvatar}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG • max 5MB</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Date personale</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t.auth.displayName}</Label>
            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.auth.email}</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t.auth.profile.phone}</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t.auth.profile.address}</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>{t.auth.entityType}</Label>
            <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v as typeof form.entity_type })}>
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
          {isCompany && (
            <>
              <div className="space-y-1.5">
                <Label>{t.auth.profile.companyName}</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t.auth.profile.cui}</Label>
                <Input value={form.cui} onChange={(e) => setForm({ ...form, cui: e.target.value })} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t.auth.profile.socials}</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Facebook</Label>
            <Input placeholder="https://facebook.com/..." value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Instagram</Label>
            <Input placeholder="https://instagram.com/..." value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>TikTok</Label>
            <Input placeholder="https://tiktok.com/@..." value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>{t.auth.profile.website}</Label>
            <Input placeholder="https://..." value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preferințe</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>{t.auth.profile.language}</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as "ro" | "en" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ro">Română</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t.auth.profile.theme}</Label>
            <Select value={form.theme} onValueChange={(v) => setForm({ ...form, theme: v as typeof form.theme })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t.auth.profile.themes.light}</SelectItem>
                <SelectItem value="dark">{t.auth.profile.themes.dark}</SelectItem>
                <SelectItem value="system">{t.auth.profile.themes.system}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/forgot-password">{t.auth.profile.changePassword}</Link>
        </Button>
        <Button onClick={onSave} disabled={saving} className="rounded-full">
          {saving ? "..." : t.auth.profile.save}
        </Button>
      </div>
    </div>
  );
}
