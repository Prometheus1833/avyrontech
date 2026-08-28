import { type ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  FileCheck2,
  Fingerprint,
  Gauge,
  Handshake,
  KeyRound,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Footer from "@/components/site/Footer";
import logo from "@/assets/avyron-logo.webp";
import { COMPANY } from "@/config/company";
import { useLang } from "@/i18n/LanguageContext";

const VERSION = "2026-08-28";

type LegalSection = {
  id: string;
  title: string;
  icon: typeof Scale;
  body: ReactNode;
};

const Terms = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const path = ro ? "/termeni" : "/en/terms";
  const homePath = ro ? "/#hero" : "/en#hero";
  const productsPath = ro ? "/costurisiproduse" : "/en/pricing";
  const privacyPath = ro ? "/gdpr" : "/en/privacy";

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Termeni de utilizare și servicii digitale | Avyron"
      : "Website and Digital Services Terms of Use | Avyron";
    const description = ro
      ? "Termenii Avyron explică transparent utilizarea site-ului, solicitările, conturile, ofertele, livrarea serviciilor digitale și drepturile clienților."
      : "Avyron terms clearly explain website use, enquiries, accounts, proposals, digital service delivery and customer rights.";

    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/termeni", en: "/en/terms" },
          image: "/og/home.jpg",
          imageAlt: ro
            ? "Avyron — termeni clari pentru servicii și produse digitale"
            : "Avyron — clear terms for digital services and products",
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Termeni de utilizare" : "Terms of use", path },
          ]),
        );
        setJsonLd("ld-terms-page", {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `https://avyron.ro${path}#webpage`,
          url: `https://avyron.ro${path}`,
          name: title,
          description,
          inLanguage: ro ? "ro-RO" : "en",
          dateModified: VERSION,
          isPartOf: { "@id": "https://avyron.ro/#website" },
          about: { "@id": "https://avyron.ro/#organization" },
        });
      },
    );
  }, [path, ro]);

  const sections: LegalSection[] = ro
    ? [
        {
          id: "operator",
          title: "Cine este Avyron",
          icon: Fingerprint,
          body: (
            <>
              <p>
                Site-ul <strong>avyron.ro</strong> și comunicarea inițială sub marca Avyron sunt administrate în principal de <strong>{COMPANY.primaryLegalEntity.legalName}</strong>, CUI <strong>{COMPANY.primaryLegalEntity.taxId}</strong>, cu sediul în {COMPANY.primaryLegalEntity.registeredAddress}.
              </p>
              <p>
                În funcție de proiect, <strong>FV Tech Solutions SRL</strong>, cu sediul în Municipiul Pașcani, județul Iași, poate participa în rolul precizat în ofertă, contract și documentele fiscale. Entitatea care contractează, facturează și răspunde pentru livrare este întotdeauna identificată explicit în documentele proiectului.
              </p>
            </>
          ),
        },
        {
          id: "scop",
          title: "Ce reglementează acești termeni",
          icon: BookOpenCheck,
          body: (
            <>
              <p>Acești termeni se aplică navigării pe site, formularelor, materialelor demonstrative, conturilor și zonelor de client. Ei explică regulile generale într-un limbaj direct.</p>
              <p>Trimiterea unui formular sau solicitarea unui audit nu creează automat un contract și nu obligă utilizatorul să cumpere. Pentru un proiect plătit, oferta acceptată, contractul, anexele și documentele fiscale completează acești termeni și prevalează pentru aspectele specifice proiectului.</p>
            </>
          ),
        },
        {
          id: "oferte",
          title: "Oferte, prețuri și începerea proiectului",
          icon: BriefcaseBusiness,
          body: (
            <>
              <p>Prețurile „de la”, intervalele de timp și exemplele publicate sunt orientative. Volumul final se stabilește după clarificarea obiectivelor, funcțiilor, conținutului, integrărilor și dependențelor tehnice.</p>
              <ul>
                <li>Oferta precizează livrabilele, etapele, costurile, calendarul și condițiile de plată.</li>
                <li>Lucrul începe după acceptarea documentelor convenite și îndeplinirea condițiilor inițiale menționate în acestea.</li>
                <li>Solicitările care schimbă aria agreată sunt estimate și aprobate separat înainte de implementare.</li>
              </ul>
            </>
          ),
        },
        {
          id: "colaborare",
          title: "O colaborare clară, de ambele părți",
          icon: Handshake,
          body: (
            <>
              <p>Avyron se angajează la comunicare profesionistă, decizii explicate, verificări proporționale cu proiectul și protejarea informațiilor primite. Clientul furnizează la timp informații corecte, feedback consolidat și materialele necesare.</p>
              <p>Clientul confirmă că deține drepturile sau permisiunile pentru textele, imaginile, mărcile, bazele de date și celelalte materiale transmise. Conținutul ilegal, înșelător, discriminatoriu sau care încalcă drepturile altora nu poate fi publicat prin serviciile Avyron.</p>
            </>
          ),
        },
        {
          id: "livrare",
          title: "Livrare, verificare și modificări",
          icon: FileCheck2,
          body: (
            <>
              <p>Etapele de prezentare, testare, feedback și acceptare sunt cele din ofertă sau contract. Perioadele estimate presupun răspunsuri și resurse disponibile la datele agreate; întârzierile unei dependențe externe pot ajusta calendarul în mod rezonabil.</p>
              <p>Erorile care țin de livrabilele convenite sunt analizate și corectate conform garanției sau suportului documentat. Funcțiile noi, schimbările de direcție și intervențiile asupra unor sisteme modificate ulterior de terți pot necesita o estimare separată.</p>
            </>
          ),
        },
        {
          id: "conturi",
          title: "Conturi și utilizare responsabilă",
          icon: KeyRound,
          body: (
            <>
              <p>Utilizatorul păstrează confidențiale datele de acces și ne anunță prompt la <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> dacă suspectează o utilizare neautorizată. Accesul este personal și limitat la rolul alocat.</p>
              <p>Sunt interzise tentativele de ocolire a autentificării, scanarea neautorizată, automatizarea abuzivă, încărcarea de cod malițios și acțiunile care afectează securitatea ori disponibilitatea platformei. Putem limita temporar accesul necesar protejării sistemului, cu informare atunci când este rezonabil posibil.</p>
            </>
          ),
        },
        {
          id: "proprietate",
          title: "Proprietate intelectuală și licențe",
          icon: BadgeCheck,
          body: (
            <>
              <p>Brandul, designul, textele, codul și materialele publice Avyron sunt protejate de legislația aplicabilă și nu pot fi copiate ori revândute fără permisiune. Distribuirea linkurilor publice și citarea scurtă cu indicarea sursei sunt permise.</p>
              <p>Drepturile asupra livrabilelor unui client, momentul transferului și drepturile de portofoliu sunt stabilite în contract. Licențele open-source, fonturile, platformele și componentele terțe își păstrează propriile condiții; acestea nu pot fi transferate mai larg decât permite licența lor.</p>
            </>
          ),
        },
        {
          id: "rezultate",
          title: "Performanță, disponibilitate și rezultate",
          icon: Gauge,
          body: (
            <>
              <p>Construim și testăm cu obiective măsurabile, însă rezultatele comerciale, pozițiile în motoarele de căutare, traficul, conversiile și aprobările platformelor terțe depind și de factori pe care Avyron nu îi controlează. Nu le prezentăm ca rezultate garantate, dacă un document semnat nu prevede expres altfel.</p>
              <p>Pot exista mentenanță planificată, actualizări urgente sau indisponibilități ale furnizorilor externi. Pentru servicii care necesită un nivel garantat de disponibilitate, indicatorii și remediile se stabilesc într-un acord de nivel al serviciului.</p>
            </>
          ),
        },
        {
          id: "consumatori",
          title: "Drepturile consumatorilor",
          icon: Scale,
          body: (
            <>
              <p>Consumatorii primesc informațiile precontractuale și beneficiază de drepturile obligatorii prevăzute de legislația română și europeană. Pentru contractele la distanță, dreptul de retragere se aplică în condițiile și cu excepțiile legale.</p>
              <p>Dacă un consumator solicită începerea serviciului în perioada de retragere, vom cere declarațiile necesare înainte de începere. Consecințele unei executări parțiale sau integrale sunt cele prevăzute de lege și vor fi explicate în documentele aplicabile. Nicio clauză de aici nu limitează garanțiile sau remediile obligatorii.</p>
              <div className="legal-links">
                <a href="https://legislatie.just.ro/Public/DetaliiDocument/169141" target="_blank" rel="noreferrer">OUG nr. 34/2014</a>
                <a href="https://legislatie.just.ro/Public/DetaliiDocument/77218" target="_blank" rel="noreferrer">Legea nr. 365/2002</a>
                <a href="https://legislatie.just.ro/Public/DetaliiDocument/149436" target="_blank" rel="noreferrer">Legea nr. 193/2000</a>
              </div>
            </>
          ),
        },
        {
          id: "raspundere",
          title: "Răspundere și servicii externe",
          icon: ShieldCheck,
          body: (
            <>
              <p>Răspunderea părților se stabilește prin contract și lege, ținând cont de rol, prejudiciul dovedit și legătura directă cu obligația încălcată. Nimic din acești termeni nu exclude răspunderea care nu poate fi limitată legal și nu restrânge drepturile consumatorilor.</p>
              <p>Integrările, găzduirea, registrele de domenii, rețelele sociale, serviciile de email și alte produse externe sunt guvernate și de termenii furnizorilor respectivi. Avyron răspunde pentru selecția și configurarea aflate în aria agreată, nu pentru modificări independente ale serviciilor terțe.</p>
            </>
          ),
        },
        {
          id: "confidentialitate",
          title: "Confidențialitate, date și cookies",
          icon: Fingerprint,
          body: (
            <p>Datele personale și opțiunile de măsurare sunt tratate conform <Link to={privacyPath}>Politicii de Confidențialitate și GDPR</Link>. Preferințele pentru cookies pot fi modificate sau retrase oricând din „Setări cookie” în subsol. Pentru proiecte sensibile putem documenta obligații suplimentare prin contract sau acord de confidențialitate.</p>
          ),
        },
        {
          id: "solutionare",
          title: "Întrebări, reclamații și soluționare",
          icon: CircleHelp,
          body: (
            <>
              <p>Ne dorim să rezolvăm direct, clar și documentat. Trimite situația, proiectul și rezultatul urmărit la <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>; confirmăm primirea și direcționăm cererea către entitatea contractuală responsabilă.</p>
              <p>Consumatorii pot utiliza și procedurile autorităților competente, inclusiv mecanismul de Soluționare Alternativă a Litigiilor al ANPC. Legea aplicabilă este legea română, iar instanța competentă se determină potrivit normelor obligatorii; alegerea legii nu înlătură protecția acordată consumatorului.</p>
              <div className="legal-links">
                <a href="https://anpc.ro/sal/" target="_blank" rel="noreferrer">ANPC · SAL</a>
                <a href="https://legislatie.just.ro/Public/DetaliiDocument/193569" target="_blank" rel="noreferrer">OG nr. 38/2015</a>
              </div>
            </>
          ),
        },
        {
          id: "actualizari",
          title: "Actualizarea termenilor",
          icon: Sparkles,
          body: <p>Putem actualiza acești termeni când se schimbă serviciile, infrastructura sau cadrul legal. Versiunea și data sunt publicate vizibil. Pentru contractele deja încheiate se aplică documentele și versiunea relevante la momentul respectiv, cu excepția modificărilor obligatorii prin lege sau acceptate de părți.</p>,
        },
      ]
    : [
        {
          id: "operator",
          title: "Who Avyron is",
          icon: Fingerprint,
          body: (
            <>
              <p>The <strong>avyron.ro</strong> website and initial communication under the Avyron brand are primarily operated by <strong>{COMPANY.primaryLegalEntity.legalName}</strong>, Romanian tax identifier <strong>{COMPANY.primaryLegalEntity.taxId}</strong>, registered at {COMPANY.primaryLegalEntity.registeredAddress}.</p>
              <p>Depending on the project, <strong>FV Tech Solutions SRL</strong>, registered in Pașcani, Iași County, may participate in the role described in the proposal, contract and fiscal documents. The entity contracting, invoicing and responsible for delivery is always identified in the project documents.</p>
            </>
          ),
        },
        {
          id: "scope",
          title: "What these terms cover",
          icon: BookOpenCheck,
          body: <><p>These terms apply to browsing, forms, demonstrations, accounts and client areas. They explain the general rules in straightforward language.</p><p>Submitting a form or requesting an audit does not automatically create a contract or require a purchase. For paid work, the accepted proposal, contract, schedules and fiscal documents supplement these terms and prevail for project-specific matters.</p></>,
        },
        {
          id: "proposals",
          title: "Proposals, pricing and project start",
          icon: BriefcaseBusiness,
          body: <><p>“From” prices, timelines and public examples are indicative. Final scope follows clarification of goals, features, content, integrations and technical dependencies.</p><ul><li>The proposal defines deliverables, stages, costs, schedule and payment terms.</li><li>Work starts after the agreed documents are accepted and their initial conditions are met.</li><li>Requests changing the agreed scope are estimated and approved separately before implementation.</li></ul></>,
        },
        {
          id: "collaboration",
          title: "A clear, two-way collaboration",
          icon: Handshake,
          body: <><p>Avyron commits to professional communication, explained decisions, proportionate testing and careful handling of received information. The client provides accurate information, consolidated feedback and required materials on time.</p><p>The client confirms it holds the rights or permissions for supplied text, images, marks, databases and other materials. Illegal, misleading, discriminatory or rights-infringing content may not be published through Avyron services.</p></>,
        },
        {
          id: "delivery",
          title: "Delivery, review and changes",
          icon: FileCheck2,
          body: <><p>Presentation, testing, feedback and acceptance stages are those in the proposal or contract. Estimates assume responses and resources are available on agreed dates; delays in external dependencies may reasonably adjust the schedule.</p><p>Issues within the agreed deliverables are reviewed and corrected under documented warranty or support terms. New functions, direction changes and work on systems later modified by third parties may require a separate estimate.</p></>,
        },
        {
          id: "accounts",
          title: "Accounts and responsible use",
          icon: KeyRound,
          body: <><p>Users keep credentials confidential and promptly notify <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> of suspected unauthorised use. Access is personal and limited to the assigned role.</p><p>Authentication bypass, unauthorised scanning, abusive automation, malicious code and actions affecting security or availability are prohibited. We may temporarily restrict access where needed to protect the system, with notice when reasonably possible.</p></>,
        },
        {
          id: "intellectual-property",
          title: "Intellectual property and licences",
          icon: BadgeCheck,
          body: <><p>The Avyron brand, design, text, code and public materials are protected by applicable law and may not be copied or resold without permission. Sharing public links and brief quotation with attribution are permitted.</p><p>Rights to client deliverables, transfer timing and portfolio permissions are defined by contract. Open-source licences, fonts, platforms and third-party components retain their own terms and cannot be transferred more broadly than their licences allow.</p></>,
        },
        {
          id: "outcomes",
          title: "Performance, availability and outcomes",
          icon: Gauge,
          body: <><p>We build and test against measurable objectives, but commercial outcomes, search rankings, traffic, conversions and third-party approvals also depend on factors outside Avyron's control. They are not guaranteed unless a signed document expressly states otherwise.</p><p>Planned maintenance, urgent updates or external provider outages may occur. Where guaranteed availability is required, metrics and remedies are defined in a service-level agreement.</p></>,
        },
        {
          id: "consumers",
          title: "Consumer rights",
          icon: Scale,
          body: <><p>Consumers receive pre-contract information and retain all mandatory rights under Romanian and European law. For distance contracts, withdrawal rights apply subject to statutory conditions and exceptions.</p><p>If a consumer requests service commencement during the withdrawal period, we obtain the required statements first. The consequences of partial or full performance are those set by law and explained in the applicable documents. Nothing here limits mandatory guarantees or remedies.</p><div className="legal-links"><a href="https://legislatie.just.ro/Public/DetaliiDocument/169141" target="_blank" rel="noreferrer">Romanian GEO 34/2014</a><a href="https://legislatie.just.ro/Public/DetaliiDocument/77218" target="_blank" rel="noreferrer">Law 365/2002</a><a href="https://legislatie.just.ro/Public/DetaliiDocument/149436" target="_blank" rel="noreferrer">Law 193/2000</a></div></>,
        },
        {
          id: "liability",
          title: "Liability and external services",
          icon: ShieldCheck,
          body: <><p>Liability is governed by contract and applicable law, considering each party's role, proven loss and direct connection to the breached obligation. Nothing excludes liability that cannot legally be limited or restricts consumer rights.</p><p>Integrations, hosting, domain registries, social networks, email and other external products are also governed by their providers' terms. Avyron remains responsible for selection and configuration within the agreed scope, not for independent changes to third-party services.</p></>,
        },
        {
          id: "privacy",
          title: "Privacy, data and cookies",
          icon: Fingerprint,
          body: <p>Personal data and measurement choices are handled under the <Link to={privacyPath}>Privacy and GDPR Policy</Link>. Cookie preferences may be changed or withdrawn at any time through “Cookie settings” in the footer. Additional confidentiality duties can be documented for sensitive projects.</p>,
        },
        {
          id: "resolution",
          title: "Questions, complaints and resolution",
          icon: CircleHelp,
          body: <><p>We aim to resolve concerns directly, clearly and with a documented response. Send the circumstances, project and desired outcome to <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>; we acknowledge receipt and route it to the responsible contracting entity.</p><p>Consumers may also use competent authority procedures, including the Romanian consumer authority's Alternative Dispute Resolution mechanism. Romanian law applies and jurisdiction is determined by mandatory rules; this choice does not remove consumer protections.</p><div className="legal-links"><a href="https://anpc.ro/sal/" target="_blank" rel="noreferrer">ANPC · ADR</a><a href="https://legislatie.just.ro/Public/DetaliiDocument/193569" target="_blank" rel="noreferrer">Romanian GO 38/2015</a></div></>,
        },
        {
          id: "updates",
          title: "Updates to these terms",
          icon: Sparkles,
          body: <p>We may update these terms when services, infrastructure or law change. The version and date are displayed here. Existing contracts continue under their relevant documents and version, except for changes required by law or accepted by the parties.</p>,
        },
      ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050711] text-white antialiased selection:bg-cyan-300 selection:text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050711]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to={homePath} className="inline-flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft className="size-4" aria-hidden />
            {ro ? "Acasă" : "Home"}
          </Link>
          <a href={homePath} className="inline-flex items-center gap-2" aria-label={ro ? "Avyron — mergi la hero" : "Avyron — go to hero"}>
            <img src={logo} alt="Avyron" width={26} height={26} className="size-[26px] rounded-lg object-cover ring-1 ring-white/15" />
            <span className="font-display text-xs font-bold tracking-[0.22em]">AVYRON</span>
          </a>
        </div>
      </header>

      <section className="relative px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-22rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-purple-600/20 blur-[110px]" />
          <div className="absolute right-[-10rem] top-48 h-80 w-80 rounded-full bg-cyan-400/10 blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-300/[0.07] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
            <Scale className="size-3.5" aria-hidden />
            {ro ? "Claritate înainte de colaborare" : "Clarity before collaboration"}
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
            {ro ? "Termeni clari pentru" : "Clear terms for"}{" "}
            <span className="bg-gradient-to-r from-cyan-200 via-white to-purple-300 bg-clip-text text-transparent">
              {ro ? "produse digitale bune." : "better digital work."}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {ro
              ? "Am scris această pagină ca să știi cine livrează, cum începe un proiect, ce poți aștepta și cum rezolvăm o situație — fără formulări inutile și fără drepturi ascunse în text mic."
              : "We wrote this page so you know who delivers, how a project starts, what to expect and how concerns are resolved — without unnecessary language or rights hidden in fine print."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{ro ? "Versiune" : "Version"} · {VERSION}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{ro ? "Română + English" : "English + Română"}</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">{ro ? "Contractul specific prevalează" : "Project contract prevails"}</span>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
            <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 lg:sticky lg:top-20">
              <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">{ro ? "Navigare rapidă" : "Quick navigation"}</p>
              <nav className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label={ro ? "Cuprins termeni" : "Terms contents"}>
                {sections.map((section, index) => (
                  <a key={section.id} href={`#${section.id}`} className="group flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left text-[11px] leading-tight text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white sm:text-xs">
                    <span className="font-mono text-[9px] text-cyan-300/60">{String(index + 1).padStart(2, "0")}</span>
                    <span>{section.title}</span>
                  </a>
                ))}
              </nav>
              <div className="mt-4 rounded-2xl border border-purple-300/15 bg-purple-400/[0.06] p-3 text-xs leading-relaxed text-slate-300">
                <CheckCircle2 className="mb-2 size-4 text-purple-300" aria-hidden />
                {ro ? "Pe scurt: confirmăm aria, costul și calendarul înainte de lucru. Drepturile obligatorii rămân neatinse." : "In short: scope, cost and schedule are confirmed before work. Mandatory rights remain unaffected."}
              </div>
            </aside>

            <div className="min-w-0 divide-y divide-white/10 rounded-3xl border border-white/10 bg-[#090c18]/80 px-4 shadow-[0_35px_120px_-60px_rgba(34,211,238,.35)] sm:px-7">
              {sections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <article key={section.id} id={section.id} className="scroll-mt-24 py-8 sm:py-10">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-cyan-200 sm:size-11">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-purple-300/75">{ro ? "Clauza" : "Section"} {String(index + 1).padStart(2, "0")}</div>
                        <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{section.title}</h2>
                        <div className="terms-copy mt-4 space-y-3 text-[14px] leading-[1.75] text-slate-300 sm:text-[15px]">
                          {section.body}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10 px-4 py-16 sm:px-6 sm:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(168,85,247,.15),transparent_55%)]" aria-hidden />
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-6 text-center sm:p-10">
          <Mail className="mx-auto size-6 text-cyan-200" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-4xl">{ro ? "Ai o întrebare înainte să începem?" : "A question before we begin?"}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">{ro ? "Spune-ne ce vrei să construiești. Îți răspundem clar despre arie, livrare și condițiile potrivite proiectului tău." : "Tell us what you want to build. We will answer clearly about scope, delivery and the terms appropriate for your project."}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <a href={`mailto:${COMPANY.email}`} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">{ro ? "Scrie-ne" : "Contact us"}<ArrowRight className="size-4" aria-hidden /></a>
            <Link to={productsPath} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]">{ro ? "Vezi produsele" : "View products"}</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default Terms;
