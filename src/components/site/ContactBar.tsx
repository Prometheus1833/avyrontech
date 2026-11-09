import { MessageCircle, Phone, Mail } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const ContactBar = () => {
  return (
    <div data-testid="floating-contact-bar" className="public-contact-rail public-contact-shortcut fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] right-[max(.75rem,env(safe-area-inset-right))] z-40 flex flex-col gap-1.5 md:gap-2">
      <a
        href="https://wa.me/40734605055"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "home_contact_rail" })}
        className="size-10 md:size-12 rounded-full bg-[#25D366] text-slate-950 grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <MessageCircle className="size-4 md:size-5" />
      </a>
      <a
        href="tel:+40734605055"
        aria-label="Apel"
        onClick={() => trackEvent("contact_click", { method: "phone", location: "home_contact_rail" })}
        className="size-10 md:size-12 rounded-full bg-foreground text-background grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Phone className="size-4 md:size-5" />
      </a>
      <a
        href="mailto:contact@avyron.ro"
        aria-label="Email"
        onClick={() => trackEvent("contact_click", { method: "email", location: "home_contact_rail" })}
        className="size-10 md:size-12 rounded-full bg-brand text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Mail className="size-4 md:size-5" />
      </a>
    </div>
  );
};

export default ContactBar;
