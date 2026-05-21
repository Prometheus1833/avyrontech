import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageContext";
import { resetSchema } from "@/lib/validators/auth";
import { z } from "zod";

type Input = z.infer<typeof resetSchema>;

const ResetPassword = () => {
  const { t } = useLang();
  const navigate = useNavigate();

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: "Setează o parolă nouă — Avyron",
        description:
          "Definește o parolă nouă pentru contul tău Avyron și continuă către panoul de proiecte.",
        path: "/reset-password",
      })
    );
  }, []);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Input>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data: Input) => {
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t.auth.passwordUpdated);
    navigate("/profil");
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">{t.auth.updatePassword}</h1>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-pass">{t.auth.newPassword}</Label>
            <Input id="rp-pass" type="password" autoComplete="new-password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">Min 8, 1 majusculă, 1 cifră</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-conf">{t.auth.confirmPassword}</Label>
            <Input id="rp-conf" type="password" autoComplete="new-password" {...form.register("confirm")} />
            {form.formState.errors.confirm && (
              <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
            {submitting ? "..." : t.auth.updatePassword}
          </Button>
        </form>
      </div>
    </main>
  );
};

export default ResetPassword;
