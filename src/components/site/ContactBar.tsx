import { MessageCircle, Phone, Mail } from "lucide-react";

const ContactBar = () => {
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      <a
        href="https://wa.me/40734607077"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="size-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <MessageCircle className="size-5" />
      </a>
      <a
        href="tel:+40734607077"
        aria-label="Apel"
        className="size-12 rounded-full bg-foreground text-background grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Phone className="size-5" />
      </a>
      <a
        href="mailto:avyrontech@gmail.com"
        aria-label="Email"
        className="size-12 rounded-full bg-brand text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <Mail className="size-5" />
      </a>
    </div>
  );
};

export default ContactBar;
