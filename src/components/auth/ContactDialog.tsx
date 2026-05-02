import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, MessageCircle, HelpCircle } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";

const MessengerIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.34.27.56l.05 1.78a.8.8 0 0 0 1.12.71l1.99-.88a.8.8 0 0 1 .53-.04c.91.25 1.88.39 2.9.39 5.64 0 10-4.13 10-9.69C22 6.13 17.64 2 12 2Zm6 7.6-2.93 4.65a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.93-4.65a1.5 1.5 0 0 1 2.17-.4l2.34 1.75c.21.16.5.16.72 0l3.16-2.4c.42-.32.97.18.69.63Z"/>
  </svg>
);

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export function ContactDialog({ open, onOpenChange }: Props) {
  const { t } = useLang();
  const c = t.auth.menu.contactDialog;

  const items = [
    { label: c.whatsapp, value: "+40 734 605 055", icon: MessageCircle, href: "https://wa.me/40734605055", color: "text-[#25D366]" },
    { label: c.messenger, value: "m.me/Avyron", icon: MessengerIcon, href: "https://m.me/61560319432764", color: "text-[#0078FF]" },
    { label: c.phone, value: "+40 734 605 055", icon: Phone, href: "tel:+40734605055", color: "text-foreground" },
    { label: c.email, value: "avyrontech@gmail.com", icon: Mail, href: "mailto:avyrontech@gmail.com", color: "text-brand" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{c.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              target={it.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition"
            >
              <div className={`size-10 rounded-md bg-muted grid place-items-center ${it.color}`}>
                <it.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{it.label}</div>
                <div className="text-xs text-muted-foreground truncate">{it.value}</div>
              </div>
            </a>
          ))}
          <a
            href="/#faq"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition mt-1"
          >
            <div className="size-10 rounded-md bg-brand/10 text-brand grid place-items-center">
              <HelpCircle className="size-5" />
            </div>
            <div className="flex-1 text-sm font-medium">{c.faq}</div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
