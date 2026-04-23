import { MessageCircle, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

const ContactBar = () => {
  return (
    <div className="fixed bottom-3 right-3 md:bottom-4 md:right-4 z-40 flex flex-col gap-2">
      <button
        type="button"
        onClick={() => toast.info("WhatsApp indisponibil momentan. Te rugăm să ne suni sau să ne scrii pe email.")}
        aria-label="WhatsApp indisponibil"
        className="size-11 md:size-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-elev hover:scale-110 transition-transform relative opacity-90"
      >
        <MessageCircle className="size-5" />
        <span className="absolute -top-1 -right-1 size-3 rounded-full bg-destructive border-2 border-background" aria-hidden />
      </button>
      <a
        href="tel:0734607077"
        aria-label="Apel"
        className="size-11 md:size-12 rounded-full bg-foreground text-background grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Phone className="size-5" />
      </a>
      <a
        href="mailto:avyrontech@gmail.com"
        aria-label="Email"
        className="size-11 md:size-12 rounded-full bg-brand text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Mail className="size-5" />
      </a>
    </div>
  );
};

export default ContactBar;
