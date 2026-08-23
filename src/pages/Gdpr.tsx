import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, ArrowLeft, Lock, FileText, Database, Users, Globe, Cookie, Server, Mail, Phone } from "lucide-react";
import logo from "@/assets/avyron-logo.jpg";

/**
 * Apple-inspired GDPR / Privacy page.
 * - Generous whitespace, large typography, neutral palette
 * - Subtle dividers, no numbers, calm rhythm
 * - One quiet color accent for the brand
 */

const sections = [
  {
    icon: FileText,
    title: "Introducere",
    body: (
      <>
        <p>Această Politică de Confidențialitate descrie modul în care <strong>S.C. Eco Tech Digital Solution S.R.L.</strong> (denumită în continuare „Societatea", „noi" sau „Operatorul") colectează, utilizează, stochează și protejează datele cu caracter personal în conformitate cu Regulamentul (UE) 2016/679 (GDPR).</p>
        <p>Prin utilizarea site-ului nostru și/sau a serviciilor oferite, sunteți de acord cu practicile descrise în prezenta politică.</p>
      </>
    ),
  },
  {
    icon: Users,
    title: "Datele Operatorului",
    body: (
      <ul className="space-y-1.5">
        <li><strong>Denumire:</strong> S.C. Eco Tech Digital Solution S.R.L.</li>
        <li><strong>Sediu:</strong> Iași, România</li>
        <li><strong>CUI:</strong> disponibil la cerere — solicitare prin email</li>
        <li><strong>Nr. Registrul Comerțului:</strong> disponibil la cerere — solicitare prin email</li>
        <li><strong>Email contact:</strong> contact@avyron.ro</li>
        <li><strong>Telefon:</strong> +40 734 605 055</li>
      </ul>
    ),
  },
  {
    icon: Database,
    title: "Categorii de date prelucrate",
    body: (
      <>
        <p className="font-semibold text-foreground">Date furnizate direct de utilizator</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nume și prenume</li>
          <li>Adresă de email</li>
          <li>Număr de telefon</li>
          <li>Date de facturare (adresă, CUI, denumire firmă)</li>
          <li>Conținutul mesajelor transmise prin formulare sau email</li>
        </ul>
        <p className="font-semibold text-foreground mt-4">Date colectate automat</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Adresa IP</li>
          <li>Tip browser și dispozitiv</li>
          <li>Pagini accesate și comportament pe site</li>
          <li>Cookie-uri și tehnologii similare</li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText,
    title: "Scopul prelucrării datelor",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Furnizarea serviciilor IT și digitale (dezvoltare software, mentenanță, consultanță)</li>
        <li>Gestionarea relațiilor contractuale și comerciale</li>
        <li>Emiterea facturilor și conformarea fiscală</li>
        <li>Suport tehnic și comunicare cu clienții</li>
        <li>Îmbunătățirea experienței utilizatorului pe site</li>
        <li>Marketing (doar cu consimțământul explicit)</li>
      </ul>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Temeiul legal al prelucrării",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Executării unui contract (art. 6 alin. 1 lit. b GDPR)</li>
        <li>Obligațiilor legale (art. 6 alin. 1 lit. c)</li>
        <li>Consimțământului (art. 6 alin. 1 lit. a)</li>
        <li>Interesului legitim (art. 6 alin. 1 lit. f)</li>
      </ul>
    ),
  },
  {
    icon: Server,
    title: "Durata stocării datelor",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Pe durata derulării relației contractuale</li>
        <li>Conform obligațiilor legale (ex: 5–10 ani pentru documente financiare)</li>
        <li>Până la retragerea consimțământului (pentru marketing)</li>
      </ul>
    ),
  },
  {
    icon: Users,
    title: "Divulgarea datelor",
    body: (
      <>
        <p>Datele pot fi transmise către:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Furnizori de servicii IT (hosting, mentenanță)</li>
          <li>Procesatori de plăți</li>
          <li>Autorități publice (în baza obligațiilor legale)</li>
          <li>Parteneri contractuali (doar în limita necesară)</li>
        </ul>
        <p className="mt-3">Toți partenerii sunt obligați să respecte confidențialitatea și securitatea datelor.</p>
      </>
    ),
  },
  {
    icon: Globe,
    title: "Transferuri internaționale",
    body: (
      <p>În cazul în care datele sunt transferate în afara Spațiului Economic European (SEE), ne asigurăm că există garanții adecvate (clauze contractuale standard sau alte mecanisme legale).</p>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Drepturile persoanei vizate",
    body: (
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
        <p className="mt-3">Pentru exercitarea acestor drepturi, ne puteți contacta la: <a className="text-brand hover:underline" href="mailto:contact@avyron.ro">contact@avyron.ro</a></p>
      </>
    ),
  },
  {
    icon: Lock,
    title: "Securitatea datelor",
    body: (
      <>
        <p>Societatea implementează măsuri tehnice și organizatorice adecvate:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Criptarea datelor</li>
          <li>Acces restricționat</li>
          <li>Monitorizare și audit</li>
          <li>Backup-uri regulate</li>
        </ul>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "Cookie-uri",
    body: (
      <>
        <p>Site-ul utilizează cookie-uri pentru:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Funcționare tehnică</li>
          <li>Analiză trafic</li>
          <li>Personalizare conținut</li>
        </ul>
        <p className="mt-3">Pentru detalii complete, consultați Politica de Cookie-uri.</p>
      </>
    ),
  },
  {
    icon: Server,
    title: "Servicii IT digitale — specific",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Datele clienților sunt prelucrate strict conform instrucțiunilor acestora</li>
        <li>Societatea acționează, după caz, ca operator sau persoană împuternicită</li>
        <li>Se încheie acorduri de prelucrare a datelor (DPA), dacă este necesar</li>
        <li>Se asigură separarea logică a datelor între clienți</li>
      </ul>
    ),
  },
  {
    icon: FileText,
    title: "Modificări ale politicii",
    body: (
      <p>Ne rezervăm dreptul de a actualiza această politică. Versiunea actualizată va fi publicată pe site.</p>
    ),
  },
  {
    icon: Globe,
    title: "Autoritate de supraveghere",
    body: (
      <>
        <p>Aveți dreptul de a depune plângere la:</p>
        <p className="mt-2"><strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong><br />
          Website: <a className="text-brand hover:underline" href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">https://www.dataprotection.ro</a></p>
      </>
    ),
  },
];

const Gdpr = () => {
  const isEn =
    typeof window !== "undefined" && window.location.pathname.startsWith("/en/");

  useEffect(() => {
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({
        title: isEn
          ? "Privacy Policy & GDPR | Avyron"
          : "Politica de Confidențialitate și GDPR | Avyron",
        description: isEn
          ? "Avyron Privacy Policy and GDPR Data Protection notice — Eco Tech Digital Solution S.R.L., Iași, Romania."
          : "Politica de Confidențialitate și Protecția Datelor (GDPR) Avyron — Eco Tech Digital Solution S.R.L. Iași, România.",
        path: isEn ? "/en/privacy" : "/gdpr",
        alternates: { ro: "/gdpr", en: "/en/privacy" },
      })
    );
    window.scrollTo(0, 0);
  }, [isEn]);

  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      {/* Top bar — Apple-like minimal */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
          <Link to={isEn ? "/en" : "/"} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            {isEn ? "Back" : "Înapoi"}
          </Link>
          <Link to={isEn ? "/en" : "/"} className="flex items-center gap-2">
            <img src={logo} alt="Avyron" width={24} height={24} className="size-6 rounded-md object-cover" />
            <span className="font-display font-semibold tracking-[0.2em] text-xs">AVYRON</span>
          </Link>
        </div>
      </header>

      {/* Hero — quiet, centered, large headline */}
      <section className="px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            GDPR · {isEn ? "Regulation (EU) 2016/679" : "Regulamentul (UE) 2016/679"}
          </div>
          <h1 className="mt-6 font-display font-semibold tracking-tight text-4xl md:text-6xl leading-[1.05]">
            {isEn ? "Privacy Policy" : "Politica de Confidențialitate"}
            <span className="block text-muted-foreground font-normal">
              {isEn ? "and Data Protection." : "și Protecția Datelor."}
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {isEn
              ? "Full transparency on how we collect, process and protect your data. The legally binding text below is published in Romanian."
              : "Transparență totală asupra modului în care colectăm, prelucrăm și protejăm datele tale."}
          </p>
          <p className="mt-8 text-xs uppercase tracking-widest text-muted-foreground/80">
            {isEn ? "Last updated · 25.04.2026" : "Ultima actualizare · 25.04.2026"}
          </p>


          {/* Friendly commitment statement */}
          <div className="mt-10 rounded-3xl border border-border bg-card/60 p-6 md:p-8 text-left">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-brand mb-3">
              <ShieldCheck className="size-3.5" />
              Angajamentul Avyron
            </div>
            <p className="text-base md:text-lg leading-relaxed text-foreground/90">
              La Avyron, administrăm informațiile și detaliile clienților noștri cu maximă grijă și responsabilitate.
              Acordurile de securitate sunt fundamentale pentru noi — credem că o colaborare reală se construiește pe încredere.
              Rămânem mereu deschiși la colaborări complete <strong>fără utilizarea datelor</strong>, inclusiv a celor despre produsul achiziționat,
              nicăieri în mediul online. Garantăm <strong>anonimizarea completă</strong> și neutilizarea vreunei informații
              din cadrul colaborării, iar la cerere oferim <strong>acorduri de confidențialitate maximă conform legii</strong>,
              pentru ca fiecare proiect să rămână strict între tine și echipa noastră.
            </p>
          </div>
        </div>
      </section>

      {/* Sections — clean cards, no numbers, generous spacing */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="divide-y divide-border/60">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <article key={s.title} className="py-10 first:pt-0 last:pb-0 grid md:grid-cols-[auto,1fr] gap-6 md:gap-10">
                  <div className="md:pt-1">
                    <span className="size-11 rounded-2xl bg-secondary text-foreground grid place-items-center">
                      <Icon className="size-5" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-semibold text-2xl md:text-[28px] tracking-tight">{s.title}</h2>
                    <div className="mt-4 text-[15px] md:text-base text-muted-foreground leading-relaxed space-y-3">
                      {s.body}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Contact card */}
          <div className="mt-16 rounded-3xl border border-border bg-card p-8 md:p-10">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Contact</div>
            <h2 className="mt-2 font-display font-semibold text-2xl md:text-3xl tracking-tight">
              Întrebări despre protecția datelor?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Suntem aici. Răspundem prompt și clar la orice solicitare privind datele tale.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3">
              <a href="mailto:contact@avyron.ro" className="group flex items-center gap-3 rounded-2xl border border-border bg-background hover:border-brand/40 px-5 py-4 transition-colors">
                <Mail className="size-4 text-brand" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</div>
                  <div className="text-sm font-medium">contact@avyron.ro</div>
                </div>
              </a>
              <a href="tel:+40734605055" className="group flex items-center gap-3 rounded-2xl border border-border bg-background hover:border-brand/40 px-5 py-4 transition-colors">
                <Phone className="size-4 text-brand" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Telefon</div>
                  <div className="text-sm font-medium">+40 734 605 055</div>
                </div>
              </a>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              Înapoi la pagina principală
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Gdpr;
