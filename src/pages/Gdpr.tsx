import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, ArrowLeft, Lock, FileText, Database, Users, Globe, Cookie, Server, Mail, Phone } from "lucide-react";
import logo from "@/assets/avyron-logo.jpg";
import { COMPANY } from "@/config/company";

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
        <p>Această Politică de Confidențialitate descrie modul în care este realizată prelucrarea datelor cu caracter personal în cadrul serviciilor furnizate sub marca <strong>Avyron</strong>, dezvoltată și operată prin colaborarea dintre <strong>{COMPANY.associationName}</strong>.</p>
        <p>Politica are rol de informare în conformitate cu Regulamentul (UE) 2016/679 (GDPR). Utilizarea site-ului nu echivalează cu acordarea unui consimțământ general; consimțământul este solicitat distinct numai pentru prelucrările care se bazează pe acest temei.</p>
      </>
    ),
  },
  {
    icon: Users,
    title: "Identitate juridică și organizarea colaborării",
    body: (
      <>
        <p>Avyron reprezintă cadrul comercial și operațional în care colaborează următoarele entități juridice:</p>
        <div className="grid gap-3 mt-4">
          {COMPANY.legalEntities.map((entity) => (
            <div key={entity.id} className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="font-semibold text-foreground">{entity.legalName}</div>
              <div className="mt-1 text-sm leading-relaxed">
                {entity.taxId && <div><strong>CUI:</strong> {entity.taxId}</div>}
                <div><strong>Sediu:</strong> {entity.registeredAddress}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4">Entitatea responsabilă pentru un proiect, o factură sau o relație contractuală este identificată în oferta, contractul și documentele fiscale aplicabile. Rolurile privind prelucrarea datelor sunt stabilite în funcție de scopul concret și de implicarea fiecărei entități, fără a extinde accesul la date dincolo de ceea ce este necesar.</p>
        <p>Pentru site, solicitări inițiale și exercitarea drepturilor GDPR este disponibil un punct unic de contact: <a className="text-brand hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <a className="text-brand hover:underline" href={`tel:${COMPANY.phone}`}>+40 734 605 055</a>. Cererea va fi direcționată către entitatea responsabilă.</p>
      </>
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
          <li>Între entitățile care colaborează sub marca Avyron, numai în măsura necesară furnizării serviciului</li>
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
        <p className="mt-3">Pentru exercitarea acestor drepturi, indiferent de entitatea indicată în documentele contractuale, ne puteți contacta la: <a className="text-brand hover:underline" href="mailto:contact@avyron.ro">contact@avyron.ro</a>. Solicitarea va fi transmisă intern entității responsabile și tratată în termenul legal.</p>
      </>
    ),
  },
  {
    icon: Lock,
    title: "Securitatea datelor",
    body: (
      <>
        <p>Entitățile implicate implementează, în raport cu rolul și sistemele administrate, măsuri tehnice și organizatorice adecvate:</p>
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
          <li>Analiză de trafic, numai după activarea opțiunii Analytics</li>
          <li>Marketing și personalizare publicitară, numai după activarea separată a opțiunii Marketing</li>
        </ul>
        <p className="mt-3">Preferințele pot fi modificate sau retrase oricând din opțiunea „Setări cookie” disponibilă în footer.</p>
      </>
    ),
  },
  {
    icon: Server,
    title: "Servicii IT digitale — specific",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Datele clienților sunt prelucrate strict conform instrucțiunilor acestora</li>
        <li>Fiecare entitate acționează, după caz și conform documentelor contractuale, ca operator, operator asociat sau persoană împuternicită</li>
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

const sectionsEn = [
  {
    icon: FileText,
    title: "Introduction",
    body: (
      <>
        <p>This Privacy Policy explains how personal data is processed in connection with services provided under the <strong>Avyron</strong> brand, developed and operated through the collaboration between <strong>{COMPANY.associationName}</strong>.</p>
        <p>It is provided in accordance with Regulation (EU) 2016/679 (GDPR). Using the website does not constitute general consent; consent is requested separately only for processing activities that rely on consent.</p>
      </>
    ),
  },
  {
    icon: Users,
    title: "Legal identity and collaboration structure",
    body: (
      <>
        <p>Avyron is the commercial and operational framework in which the following legal entities collaborate:</p>
        <div className="grid gap-3 mt-4">
          {COMPANY.legalEntities.map((entity) => (
            <div key={entity.id} className="rounded-2xl border border-border bg-background/70 p-4">
              <div className="font-semibold text-foreground">{entity.legalName}</div>
              <div className="mt-1 text-sm leading-relaxed">
                {entity.taxId && <div><strong>Romanian tax identifier (CUI):</strong> {entity.taxId}</div>}
                <div><strong>Registered office:</strong> {entity.registeredAddress}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4">The entity responsible for a project, invoice, or contractual relationship is identified in the applicable proposal, contract, and fiscal documents. Data-processing roles depend on the specific purpose and each entity's involvement, without extending access beyond what is necessary.</p>
        <p>For this website, initial enquiries, and GDPR rights requests, a single contact point is available at <a className="text-brand hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <a className="text-brand hover:underline" href={`tel:${COMPANY.phone}`}>+40 734 605 055</a>. The request will be directed to the responsible entity.</p>
      </>
    ),
  },
  {
    icon: Database,
    title: "Categories of personal data",
    body: (
      <>
        <p className="font-semibold text-foreground">Information provided directly</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name</li><li>Email address</li><li>Telephone number</li>
          <li>Billing information such as address, company name, and tax identifier</li>
          <li>Messages and files submitted through forms or email</li>
        </ul>
        <p className="font-semibold text-foreground mt-4">Information collected automatically</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>IP address</li><li>Browser and device type</li><li>Pages visited and website interactions</li><li>Cookies and similar technologies</li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText,
    title: "Purposes of processing",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Providing IT and digital services, including software development, maintenance, and consulting</li>
        <li>Managing contractual and commercial relationships</li><li>Invoicing and legal compliance</li>
        <li>Technical support and customer communication</li><li>Improving the website experience</li>
        <li>Marketing only where explicit consent has been provided</li>
      </ul>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Legal bases",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Performance of a contract — Article 6(1)(b) GDPR</li><li>Compliance with legal obligations — Article 6(1)(c)</li>
        <li>Consent — Article 6(1)(a)</li><li>Legitimate interests — Article 6(1)(f), where applicable and balanced against individual rights</li>
      </ul>
    ),
  },
  {
    icon: Server,
    title: "Retention",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>For the duration of the contractual relationship</li><li>For periods required by law, including applicable financial-document retention periods</li>
        <li>Until consent is withdrawn for consent-based marketing, unless another legal requirement applies</li>
      </ul>
    ),
  },
  {
    icon: Users,
    title: "Disclosure and service providers",
    body: (
      <>
        <p>Data may be disclosed only as necessary to:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>the entities collaborating under the Avyron brand</li><li>IT, hosting, maintenance, email, and analytics providers</li>
          <li>payment processors where a paid service is used</li><li>public authorities where disclosure is legally required</li>
          <li>contractual partners strictly within the scope needed to deliver the service</li>
        </ul>
        <p className="mt-3">Providers and partners are required to protect confidentiality and data security according to their role.</p>
      </>
    ),
  },
  {
    icon: Globe,
    title: "International transfers",
    body: <p>Where personal data is transferred outside the European Economic Area, appropriate safeguards are used as required, such as adequacy decisions or standard contractual clauses.</p>,
  },
  {
    icon: ShieldCheck,
    title: "Your GDPR rights",
    body: (
      <>
        <p>Subject to the conditions in applicable law, you may request:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>access and a copy of your data</li><li>rectification</li><li>erasure</li><li>restriction of processing</li>
          <li>data portability</li><li>objection to processing</li><li>withdrawal of consent at any time</li>
        </ul>
        <p className="mt-3">Contact <a className="text-brand hover:underline" href="mailto:contact@avyron.ro">contact@avyron.ro</a> to exercise a right. The request will be routed to the responsible entity and handled within the applicable legal period.</p>
      </>
    ),
  },
  {
    icon: Lock,
    title: "Data security",
    body: (
      <>
        <p>The entities involved apply technical and organizational measures appropriate to their role and the systems they manage, including:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2"><li>encryption in appropriate contexts</li><li>restricted and role-based access</li><li>monitoring and audit trails</li><li>regular backups and recovery procedures</li></ul>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "Cookies and measurement",
    body: (
      <>
        <p>The website uses technologies for essential operation and, only after the relevant choice, for:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>traffic and performance measurement when Analytics is enabled</li>
          <li>advertising storage, advertising user data, and ad personalization when Marketing is enabled separately</li>
        </ul>
        <p className="mt-3">Preferences can be changed or withdrawn at any time through “Cookie settings” in the footer.</p>
      </>
    ),
  },
  {
    icon: Server,
    title: "Digital and IT services",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Client data is processed according to the documented instructions and agreed scope</li>
        <li>Each entity acts, depending on the contract and context, as controller, joint controller, or processor</li>
        <li>A data processing agreement is concluded when required</li><li>Logical separation between client datasets is maintained</li>
      </ul>
    ),
  },
  {
    icon: FileText,
    title: "Policy changes",
    body: <p>This policy may be updated to reflect legal, technical, or operational changes. The current version and its version date will be published on this page.</p>,
  },
  {
    icon: Globe,
    title: "Supervisory authority",
    body: (
      <>
        <p>You may lodge a complaint with the Romanian supervisory authority:</p>
        <p className="mt-2"><strong>National Supervisory Authority for Personal Data Processing (ANSPDCP)</strong><br />
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
          ? `Avyron privacy and GDPR policy: how personal data is processed in the collaboration between ${COMPANY.associationName}.`
          : `Politica GDPR Avyron: transparență privind prelucrarea datelor în colaborarea dintre ${COMPANY.associationName}`,
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
              ? "Clear information on how we collect, process, retain, and protect personal data under the GDPR."
              : "Transparență totală asupra modului în care colectăm, prelucrăm și protejăm datele tale."}
          </p>
          <p className="mt-8 text-xs uppercase tracking-widest text-muted-foreground/80">
            {isEn ? "Policy version · 2026-08-23" : "Versiunea politicii · 2026-08-23"}
          </p>


          {/* Friendly commitment statement */}
          <div className="mt-10 rounded-3xl border border-border bg-card/60 p-6 md:p-8 text-left">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-brand mb-3">
              <ShieldCheck className="size-3.5" />
              {isEn ? "Avyron's commitment" : "Angajamentul Avyron"}
            </div>
            <p className="text-base md:text-lg leading-relaxed text-foreground/90">
              {isEn
                ? "Avyron handles client information with care and accountability. Security agreements are fundamental because effective collaboration depends on trust. Projects can be arranged so that client or product information is not used in a portfolio or public communication. We apply data minimization and, where appropriate, anonymization or pseudonymization. Access, use, and publication limits can be documented in the contract or a confidentiality agreement."
                : "La Avyron, administrăm informațiile și detaliile clienților noștri cu maximă grijă și responsabilitate. Acordurile de securitate sunt fundamentale pentru noi — credem că o colaborare reală se construiește pe încredere. Putem organiza proiecte în care informațiile despre client și produs nu sunt utilizate în portofoliu sau în comunicarea publică. Aplicăm minimizarea datelor și, acolo unde este adecvat, anonimizarea sau pseudonimizarea acestora. La cerere, stabilim prin contract ori acord de confidențialitate limitele de acces, utilizare și publicare aplicabile proiectului."}
            </p>
          </div>
        </div>
      </section>

      {/* Sections — clean cards, no numbers, generous spacing */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="divide-y divide-border/60">
            {(isEn ? sectionsEn : sections).map((s) => {
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
              {isEn ? "Questions about your personal data?" : "Întrebări despre protecția datelor?"}
            </h2>
            <p className="mt-3 text-muted-foreground">
              {isEn ? "Contact us for a clear response to a privacy or GDPR request." : "Suntem aici. Răspundem prompt și clar la orice solicitare privind datele tale."}
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
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{isEn ? "Phone" : "Telefon"}</div>
                  <div className="text-sm font-medium">+40 734 605 055</div>
                </div>
              </a>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              to={isEn ? "/en" : "/"}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-medium transition-colors"
            >
              <ArrowLeft className="size-4" />
              {isEn ? "Back to the homepage" : "Înapoi la pagina principală"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Gdpr;
