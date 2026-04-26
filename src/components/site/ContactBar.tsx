import { MessageCircle, Phone, Mail } from "lucide-react";

const MessengerIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.34.27.56l.05 1.78a.8.8 0 0 0 1.12.71l1.99-.88a.8.8 0 0 1 .53-.04c.91.25 1.88.39 2.9.39 5.64 0 10-4.13 10-9.69C22 6.13 17.64 2 12 2Zm6 7.6-2.93 4.65a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.93-4.65a1.5 1.5 0 0 1 2.17-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.18.69.63Z"/>
  </svg>
);

const ContactBar = () => {
  return (
    <div className="fixed bottom-3 right-3 md:bottom-4 md:right-4 z-40 flex flex-col gap-2">
      <a
        href="https://wa.me/40734605055"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="size-11 md:size-12 rounded-full bg-[#25D366] text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <MessageCircle className="size-5" />
      </a>
      <a
        href="https://m.me/61560319432764"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Messenger Facebook"
        className="size-11 md:size-12 rounded-full bg-gradient-to-br from-[#0078FF] via-[#A033FF] to-[#FF5A5A] text-white grid place-items-center shadow-elev hover:scale-110 transition-transform"
      >
        <MessengerIcon className="size-5" />
      </a>
      <a
        href="tel:+40734605055"
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
