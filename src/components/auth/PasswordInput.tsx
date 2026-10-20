import { forwardRef, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLang } from "@/i18n/LanguageContext";

type Props = ComponentProps<typeof Input>;

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  const { lang } = useLang();
  return <div className="relative">
    <Input {...props} ref={ref} type={visible ? "text" : "password"} className={`${props.className || ""} pr-11`} />
    <button type="button" aria-label={visible ? (lang === "ro" ? "Ascunde parola" : "Hide password") : (lang === "ro" ? "Arată parola" : "Show password")} aria-pressed={visible}
      onClick={() => setVisible((current) => !current)}
      className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  </div>;
});
