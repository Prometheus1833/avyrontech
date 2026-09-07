import { MessageCircle } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";

const PHONE = "40734605055";

interface Props {
  /** Pre-filled message; falls back to a blog-oriented default. */
  message?: { ro: string; en: string };
  location?: string;
}

/**
 * Floating WhatsApp button (same visual language as the homepage contact rail),
 * with a suggestive pre-filled message.
 */
const FloatingWhatsApp = ({ message, location = "blog_profesional" }: Props) => {
  const { lang } = useLang();
  const ro = lang === "ro";

  const text =
    message?.[ro ? "ro" : "en"] ??
    (ro
      ? "Salut, Avyron! Vreau un blog profesional / content hub pentru afacerea mea. Îmi puteți trimite o ofertă?"
      : "Hi Avyron! I'd like a professional blog / content hub for my business. Could you send me an offer?");

  const label = ro ? "Scrie-ne pe WhatsApp" : "Message us on WhatsApp";

  return (
    <a
      href={`https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      onClick={() => trackEvent("contact_click", { method: "whatsapp", location })}
      className="fixed bottom-3 right-3 z-40 grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-elev transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-4 md:right-4 md:size-14"
    >
      <MessageCircle className="size-5 md:size-6" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </a>
  );
};

export default FloatingWhatsApp;
