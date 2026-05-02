import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageContext";

const GoogleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="size-5" viewBox="0 0 24 24" aria-hidden fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.21-1.13 3.02-.78.92-2.05 1.62-3.06 1.55-.13-1.1.42-2.27 1.1-3.04.77-.88 2.07-1.55 3.09-1.53zM21 17.27c-.5 1.16-.74 1.68-1.39 2.71-.9 1.43-2.18 3.21-3.76 3.22-1.4.01-1.76-.91-3.66-.9-1.9.01-2.3.92-3.7.9-1.58-.02-2.79-1.62-3.69-3.05C2.06 16.73 1.78 12.05 3.27 9.5 4.32 7.7 5.96 6.6 7.5 6.6c1.55 0 2.52.86 3.81.86 1.25 0 2.01-.86 3.83-.86 1.36 0 2.8.74 3.84 2.02-3.37 1.85-2.82 6.66.02 8.65z"/>
  </svg>
);

const SocialButtons = () => {
  const { t } = useLang();

  const handleOAuth = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/profil",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Eroare la autentificare");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full h-11 gap-2"
        onClick={() => handleOAuth("google")}
      >
        <GoogleIcon />
        <span>{t.auth.continueGoogle}</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full h-11 gap-2"
        onClick={() => handleOAuth("apple")}
      >
        <AppleIcon />
        <span>{t.auth.continueApple}</span>
      </Button>
    </div>
  );
};

export default SocialButtons;
