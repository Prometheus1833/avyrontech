import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, ArrowLeft, Lock, FileText, Database, Users, Globe, Cookie, Server, Mail, Phone } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";
import planetBg from "@/assets/footer-planet-bg.jpg";

const sections = [
  { n: "1", icon: FileText, title: "Introducere", body: (
    <>
      <p>Această Politică de Confidențialitate descrie modul în care <strong>S.C. Eco Tech Digital Solution S.R.L.</strong> (denumită în continuare „Societatea", „noi" sau „Operatorul") colectează, utilizează, stochează și protejează datele cu caracter personal în conformitate cu Regulamentul (UE) 2016/679 privind protecția datelor cu caracter personal (GDPR).</p>
      <p>Prin utilizarea site-ului nostru și/sau a serviciilor oferite, sunteți de acord cu practicile descrise în prezenta politică.</p>
    </>
  )},
  { n: "2", icon: Users, title: "Datele Operatorului", body: (
    <ul className="space-y-1.5">
      <li><strong>Denumire:</strong> S.C. Eco Tech Digital Solution S.R.L.</li>
      <li><strong>Sediu:</strong> [se completează]</li>
      <li><strong>CUI:</strong> [se completează]</li>
      <li><strong>Nr. Registrul Comerțului:</strong> [se completează]</li>
      <li><strong>Email contact:</strong> avyrontech@gmail.com</li>
      <li><strong>Telefon:</strong> +40 734 605 055</li>
    </ul>
  )},
  { n: "3", icon: Database, title: "Categorii de date prelucrate", body: (
    <>
      <p className="font-semibold text-foreground">3.1 Date furnizate direct de utilizator:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nume și prenume</li>
        <li>Adresă de email</li>
        <li>Număr de telefon</li>
        <li>Date de facturare (adresă, CUI, denumire firmă)</li>
        <li>Conținutul mesajelor transmise prin formulare sau email</li>
      </ul>
      <p className="font-semibold text-foreground mt-3">3.2 Date colectate automat:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Adresa IP</li>
        <li>Tip browser și dispozitiv</li>
        <li>Pagini accesate și comportament pe site</li>
        <li>Cookie-uri și tehnologii similare</li>
      </ul>
    </>
  )},
  { n: "4", icon: FileText, title: "Scopul prelucrării datelor", body: (
    <ul className="list-disc pl-5 space-y-1">
      <li>Furnizarea serviciilor IT și digitale (dezvoltare software, mentenanță, consultanță)</li>
      <li>Gestionarea relațiilor contractuale și comerciale</li>
      <li>Emiterea facturilor și conformarea fiscală</li>
      <li>Suport tehnic și comunicare cu clienții</li>
      <li>Îmbunătățirea experienței utilizatorului pe site</li>
      <li>Marketing (doar cu consimțământul explicit)</li>
    </ul>
  )},
  { n: "5", icon: ShieldCheck, title: "Temeiul legal al prelucrării", body: (
    <ul className="list-disc pl-5 space-y-1">
      <li>Executării unui contract (art. 6 alin. 1 lit. b GDPR)</li>
      <li>Obligațiilor legale (art. 6 alin. 1 lit. c)</li>
      <li>Consimțământului (art. 6 alin. 1 lit. a)</li>
      <li>Interesului legitim (art. 6 alin. 1 lit. f)</li>
    </ul>
  )},
  { n: "6", icon: Server, title: "Durata stocării datelor", body: (
    <ul className="list-disc pl-5 space-y-1">
      <li>Pe durata derulării relației contractuale</li>
      <li>Conform obligațiilor legale (ex: 5-10 ani pentru documente financiare)</li>
      <li>Până la retragerea consimțământului (pentru marketing)</li>
    </ul>
  )},
  { n: "7", icon: Users, title: "Divulgarea datelor", body: (
    <>
      <p>Datele pot fi transmise către:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li>Furnizori de servicii IT (hosting, mentenanță)</li>
        <li>Procesatori de plăți</li>
        <li>Autorități publice (în baza obligațiilor legale)</li>
        <li>Parteneri contractuali (doar în limita necesară)</li>
      </ul>
      <p className="mt-2">Toți partenerii sunt obligați să respecte confidențialitatea și securitatea datelor.</p>
    </>
  )},
  { n: "8", icon: Globe, title: "Transferuri internaționale", body: (
    <p>În cazul în care datele sunt transferate în afara Spațiului Economic European (SEE), ne asigurăm că există garanții adecvate (clauze contractuale standard sau alte mecanisme legale).</p>
  )},
  { n: "9", icon: ShieldCheck, title: "Drepturile persoanei vizate", body: (
    <>
      <p>Conform GDPR, aveți următoarele drepturi:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li>Dreptul de acces la date</li>
        <li>Dreptul la rectificare</li>
        <li>Dreptul la ștergere („dreptul de a fi uitat")</li>
        <li>Dreptul la restricționare</li>
        <li>Dreptul la portabilitatea datelor</li>
        <li>Dreptul la opoziție</li>
        <li>Dreptul de a retrage consimțământul</li>
      </ul>
      <p className="mt-2">Pentru exercitarea acestor drepturi, ne puteți contacta la: <a className="text-brand hover:underline" href="mailto:avyrontech@gmail.com">avyrontech@gmail.com</a></p>
    </>
  )},
  { n: "10", icon: Lock, title: "Securitatea datelor", body: (
    <>
      <p>Societatea implementează măsuri tehnice și organizatorice adecvate:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li>Criptarea datelor</li>
        <li>Acces restricționat</li>
        <li>Monitorizare și audit</li>
        <li>Backup-uri regulate</li>
      </ul>
    </>
  )},
  { n: "11", icon: Cookie, title: "Cookie-uri", body: (
    <>
      <p>Site-ul utilizează cookie-uri pentru:</p>
      <ul className="list-disc pl-5 space-y-1 mt-2">
        <li>Funcționare tehnică</li>
        <li>Analiză trafic</li>
        <li>Personalizare conținut</li>
      </ul>
      <p className="mt-2">Pentru detalii complete, consultați Politica de Cookie-uri.</p>
    </>
  )},
  { n: "12", icon: Server, title: "Servicii IT digitale – specific", body: (
    <ul className="list-disc pl-5 space-y-1">
      <li>Datele clienților sunt prelucrate strict conform instrucțiunilor acestora</li>
      <li>Societatea acționează, după caz, ca operator sau persoană împuternicită</li>
      <li>Se încheie acorduri de prelucrare a datelor (DPA), dacă este necesar</li>
      <li>Se asigură separarea logică a datelor între clienți</li>
    </ul>
  )},
  { n: "13", icon: FileText, title: "Modificări ale politicii", body: (
    <p>Ne rezervăm dreptul de a actualiza această politică. Versiunea actualizată va fi publicată pe site.</p>
  )},
  { n: "14", icon: Globe, title: "Autoritate de supraveghere", body: (
    <>
      <p>Aveți dreptul de a depune plângere la:</p>
      <p className="mt-2"><strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong><br/>
      Website: <a className="text-brand hover:underline" href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">https://www.dataprotection.ro</a></p>
    </>
  )},
];

const Gdpr = () => {
  useEffect(() => {
    document.title = "GDPR — Politica de Confidențialitate | Avyron";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "Politica de Confidențialitate și Protecția Datelor (GDPR) Avyron — Eco Tech Digital Solution S.R.L.");
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <img src={planetBg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--brand)/0.25),transparent_60%)]" aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 pt-10 pb-14 md:pt-14 md:pb-20">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="size-4" />
              Înapoi acasă
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Avyron" width={28} height={28} className="size-7 rounded-lg object-cover" />
              <span className="font-display font-bold tracking-widest text-sm">AVYRON</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 text-brand px-3 py-1 text-xs uppercase tracking-widest">
              <ShieldCheck className="size-3.5" />
              GDPR · Regulamentul (UE) 2016/679
            </span>
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-5xl leading-tight">
            Politica de Confidențialitate <span className="bg-gradient-to-r from-brand to-foreground bg-clip-text text-transparent">și Protecția Datelor</span>
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl">
            Transparență totală asupra modului în care colectăm, prelucrăm și protejăm datele tale personale. Documentul este redactat conform GDPR.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Ultima actualizare: 25.04.2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        <div className="space-y-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <article
                key={s.n}
                className="group relative rounded-2xl border border-border bg-card p-5 md:p-7 hover:border-brand/40 hover:shadow-soft transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <span className="size-12 md:size-14 rounded-xl bg-gradient-to-br from-brand/15 to-brand/5 text-brand grid place-items-center">
                      <Icon className="size-5 md:size-6" />
                    </span>
                    <span className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center">
                      {s.n}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 className="font-display font-bold text-lg md:text-xl mb-2">{s.title}</h2>
                    <div className="text-sm md:text-[15px] text-muted-foreground leading-relaxed space-y-2">
                      {s.body}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Contact card */}
          <article className="relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="size-12 rounded-xl bg-brand text-brand-foreground grid place-items-center">
                <Mail className="size-5" />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Secțiunea 15</p>
                <h2 className="font-display font-bold text-xl">Contact</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pentru orice întrebări privind protecția datelor:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <a href="mailto:avyrontech@gmail.com" className="flex items-center gap-3 rounded-xl border border-border bg-background hover:border-brand/40 px-4 py-3 transition-colors">
                <Mail className="size-4 text-brand" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</div>
                  <div className="text-sm font-medium">avyrontech@gmail.com</div>
                </div>
              </a>
              <a href="tel:+40734605055" className="flex items-center gap-3 rounded-xl border border-border bg-background hover:border-brand/40 px-4 py-3 transition-colors">
                <Phone className="size-4 text-brand" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Telefon</div>
                  <div className="text-sm font-medium">+40 734 605 055</div>
                </div>
              </a>
            </div>
          </article>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-5 py-3 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Înapoi la pagina principală
          </Link>
        </div>
      </section>
    </main>
  );
};

export default Gdpr;
