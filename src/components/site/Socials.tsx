import { Instagram, Facebook, MessageCircle } from "lucide-react";

const WhatsAppIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26L4.205 21.16l3.443-.967z"/>
  </svg>
);

const socials = [
  {
    name: "Instagram",
    handle: "@avyrontech",
    href: "https://www.instagram.com/avyrontech?igsh=ZTBuOXpmcDMyc2oz",
    Icon: Instagram,
    gradient: "from-[#feda75] via-[#fa7e1e] to-[#d62976]",
    ring: "ring-[#fa7e1e]/40",
  },
  {
    name: "Facebook",
    handle: "Avyron Tech",
    href: "https://www.facebook.com/share/1DiFYQhpre/",
    Icon: Facebook,
    gradient: "from-[#1877F2] to-[#0a4fb3]",
    ring: "ring-[#1877F2]/40",
  },
  {
    name: "TikTok",
    handle: "@avyron4",
    href: "https://www.tiktok.com/@avyron4?_r=1&_t=ZN-95qaCeOW0N4",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.1 20.1a6.34 6.34 0 0 0 10.86-4.43V8.84a8.16 8.16 0 0 0 4.77 1.52V6.91a4.79 4.79 0 0 1-1.14-.22z" />
      </svg>
    ),
    gradient: "from-[#25F4EE] via-[#000] to-[#FE2C55]",
    ring: "ring-[#FE2C55]/40",
  },
  {
    name: "Messenger",
    handle: "Chat direct",
    href: "https://m.me/61560319432764",
    Icon: MessageCircle,
    gradient: "from-[#00B2FF] via-[#006AFF] to-[#A033FF]",
    ring: "ring-[#006AFF]/40",
  },
  {
    name: "WhatsApp",
    handle: "+40 734 605 055",
    href: "https://wa.me/40734605055",
    Icon: WhatsAppIcon,
    gradient: "from-[#25D366] to-[#128C7E]",
    ring: "ring-[#25D366]/40",
  },
];

const Socials = () => {
  return (
    <section id="social" className="py-8 md:py-10 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-4 md:px-6 md:py-5 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="md:w-1/4">
              <div className="inline-block text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-[#fa7e1e] via-[#d62976] to-[#A033FF] bg-clip-text text-transparent">
                Conectează-te
              </div>
              <h3 className="font-display font-bold text-lg md:text-xl leading-tight bg-gradient-to-r from-brand via-[#d62976] to-[#006AFF] bg-clip-text text-transparent">
                Urmărește Avyron
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 flex-1">
              {socials.map(({ name, handle, href, Icon, gradient, ring }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className={`group relative overflow-hidden rounded-xl border border-border/60 bg-background hover:bg-background/80 px-3 py-3 flex items-center gap-3 transition-all hover:-translate-y-0.5 hover:shadow-elev ring-1 ring-transparent hover:${ring}`}
                >
                  <span
                    className={`size-9 rounded-lg bg-gradient-to-br ${gradient} text-white grid place-items-center shrink-0 shadow-sm`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-display font-semibold text-foreground leading-tight">
                      {name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {handle}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Socials;
