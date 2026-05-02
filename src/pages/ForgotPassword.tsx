import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/i18n/LanguageContext";
import { forgotSchema } from "@/lib/validators/auth";
import { z } from "zod";

type Input = z.infer<typeof forgotSchema>;

const ForgotPassword = () => {
  const { t } = useLang();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<Input>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: Input) => {
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success(t.auth.resetSent);
  };

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {t.auth.backToLogin}
        </Link>

        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold">{t.auth.forgot}</h1>
          <p className="text-sm text-muted-foreground">
            {t.auth.resetSent}
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-border bg-secondary/40 p-5 text-sm">
            ✓ {t.auth.resetSent}
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">{t.auth.email}</Label>
              <Input id="fp-email" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full rounded-full h-11" disabled={submitting}>
              {submitting ? "..." : t.auth.sendReset}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ForgotPassword;
