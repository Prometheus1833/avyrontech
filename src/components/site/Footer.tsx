const Footer = () => {
  return (
    <footer className="border-t border-border/60 py-12 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <span className="size-7 rounded-lg bg-brand grid place-items-center text-white text-sm">W</span>
            Webcore
          </div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            În mediul online, vizibilitatea înseamnă încredere.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-3">Contact</div>
          <ul className="space-y-1.5 text-sm">
            <li><a className="hover:text-brand" href="mailto:contact@webcore.ro">contact@webcore.ro</a></li>
            <li><a className="hover:text-brand" href="tel:+40700000000">+40 700 000 000</a></li>
            <li><a className="hover:text-brand" href="https://wa.me/40700000000">WhatsApp</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-foreground/60 mb-3">Navigare</div>
          <ul className="space-y-1.5 text-sm">
            <li><a className="hover:text-brand" href="#solutie">Soluție</a></li>
            <li><a className="hover:text-brand" href="#exemple">Exemple</a></li>
            <li><a className="hover:text-brand" href="#proces">Proces</a></li>
            <li><a className="hover:text-brand" href="#faq">FAQ</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 mt-10 pt-6 border-t border-border/60 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
        <span>© {new Date().getFullYear()} Webcore. Toate drepturile rezervate.</span>
        <span>Construit cu pasiune în România.</span>
      </div>
    </footer>
  );
};

export default Footer;
