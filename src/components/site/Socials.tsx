import { Instagram, Facebook, Linkedin, Globe } from "lucide-react";

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
    name: "LinkedIn",
    handle: "Avyron Tech",
    href: "https://www.linkedin.com/company/avyron",
    Icon: Linkedin,
    gradient: "from-[#0A66C2] to-[#004182]",
    ring: "ring-[#0A66C2]/40",
  },
  {
    name: "X",
    handle: "@avyrontech",
    href: "#",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    gradient: "from-[#000] to-[#1a1a1a]",
    ring: "ring-white/40",
  },
  {
    name: "Google Business",
    handle: "Avyron Tech",
    href: "#",
    Icon: () => (
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
      </svg>
    ),
    gradient: "from-[#4285F4] via-[#34A853] to-[#EA4335]",
    ring: "ring-[#4285F4]/40",
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3 flex-1">
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
