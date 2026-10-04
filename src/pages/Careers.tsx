import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  HeartHandshake,
  Mail,
  Palette,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import { COMPANY } from "@/config/company";
import logo from "@/assets/avyron-logo.webp";
import ContactBar from "@/components/site/ContactBar";
import Footer from "@/components/site/Footer";
import LangSwitch from "@/components/site/LangSwitch";
import PageBackLink from "@/components/site/PageBackLink";
import ThemeToggle from "@/components/site/ThemeToggle";

const Careers = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const path = ro ? "/cariere" : "/en/careers";
  const subject = encodeURIComponent(ro ? "Candidatură spontană — AVYRON" : "Open application — AVYRON");

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Cariere Avyron — design, development, QA și produse digitale"
      : "Avyron Careers — Design, Development, QA and Digital Products";
    const description = ro
      ? "Descoperă cum lucrăm la Avyron și trimite o candidatură spontană pentru colaborări în design, development, QA, securitate, conținut și produse digitale."
      : "Discover how Avyron works and send an open application for design, development, QA, security, content and digital product collaborations.";

    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/cariere", en: "/en/careers" },
          image: "/og/about-us-2026.jpg",
          imageAlt: ro
            ? "Cariere și colaborări profesionale la Avyron"
            : "Careers and professional collaboration at Avyron",
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Cariere" : "Careers", path },
          ]),
        );
        setJsonLd("ld-careers-page", {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url: `https://avyron.ro${path}`,
          inLanguage: ro ? "ro-RO" : "en",
          about: { "@id": "https://avyron.ro/#organization" },
        });
      },
    );
  }, [path, ro]);

  const disciplines = [
    {
      icon: Palette,
      title: ro ? "Design și experiență" : "Design and experience",
      text: ro ? "UI/UX, identitate vizuală și interfețe accesibile, gândite pentru utilizare reală." : "UI/UX, visual identity and accessible interfaces designed for real use.",
    },
    {
      icon: Code2,
      title: ro ? "Development și produse" : "Development and products",
      text: ro ? "Frontend, backend, integrări și produse digitale construite curat și extensibil." : "Frontend, backend, integrations and digital products built for clarity and growth.",
    },
    {
      icon: SearchCheck,
      title: ro ? "QA, SEO și conținut" : "QA, SEO and content",
      text: ro ? "Testare atentă, structură semantică și conținut util, fără promisiuni decorative." : "Thoughtful testing, semantic structure and useful content without decorative claims.",
    },
    {
      icon: ShieldCheck,
      title: ro ? "Securitate și automatizare" : "Security and automation",
      text: ro ? "Procese sigure, infrastructură edge și automatizări în care controlul rămâne la oameni." : "Secure processes, edge infrastructure and automation that keeps people in control.",
    },
  ];

  const principles = ro
    ? ["Lucru documentat și verificabil", "Comunicare directă, fără teatru corporatist", "Respect pentru utilizator, date și timp", "AI folosit responsabil, cu revizie umană"]
    : ["Documented, verifiable work", "Direct communication without corporate theatre", "Respect for users, data and time", "Responsible AI with human review"];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050914] text-white selection:bg-violet-300 selection:text-slate-950">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050914]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} inverse />
            <Link to={ro ? "/" : "/en"} className="hidden items-center gap-2.5 sm:flex" aria-label="Avyron">
              <img src={logo} alt="" width={30} height={30} className="size-7 rounded-md object-cover ring-1 ring-white/20" />
              <span className="font-display text-sm font-extrabold tracking-[0.2em]">AVYRON</span>
            </Link>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-2 py-1">
            <LangSwitch />
            <span className="h-3 w-px bg-white/15" aria-hidden />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-20 pt-32 sm:pb-24 sm:pt-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(124,58,237,.25),transparent_35%),radial-gradient(circle_at_82%_30%,rgba(34,211,238,.14),transparent_32%)]" aria-hidden />
        <div className="absolute inset-x-0 top-20 mx-auto h-72 max-w-5xl opacity-30 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:38px_38px] [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
        <div className="relative mx-auto max-w-6xl">
          <nav aria-label={ro ? "Navigare contextuală" : "Breadcrumb"} className="mb-8 flex items-center gap-2 text-xs text-white/45">
            <Link to={ro ? "/" : "/en"} className="hover:text-white">{ro ? "Acasă" : "Home"}</Link>
            <span aria-hidden>/</span>
            <span className="text-violet-200">{ro ? "Cariere" : "Careers"}</span>
          </nav>
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_20rem]">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-violet-300/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200">
                <BriefcaseBusiness className="size-3.5" aria-hidden />
                {ro ? "Lucrează cu Avyron" : "Work with Avyron"}
              </div>
              <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                {ro ? "Construiește lucruri digitale care " : "Build digital work that "}
                <span className="bg-gradient-to-r from-violet-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                  {ro ? "au sens." : "makes sense."}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                {ro
                  ? "Căutăm oameni atenți, curioși și responsabili, care pot transforma o problemă reală într-un produs clar. Nu publicăm roluri fictive: când există un post concret, îl vei vedea aici."
                  : "We look for thoughtful, curious and responsible people who can turn a real problem into a clear product. We do not publish fictional roles: when a specific opening exists, you will find it here."}
              </p>
            </div>
            <a href={`mailto:${COMPANY.email}?subject=${subject}`} className="group flex min-h-28 flex-col justify-between rounded-3xl border border-cyan-300/25 bg-cyan-300/[0.08] p-5 transition-transform duration-300 hover:-translate-y-1">
              <Mail className="size-5 text-cyan-200" aria-hidden />
              <span className="mt-7 flex items-center justify-between gap-3 text-sm font-bold">
                {ro ? "Trimite o candidatură spontană" : "Send an open application"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">{ro ? "Zone de colaborare" : "Collaboration areas"}</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <h2 className="font-display text-3xl font-extrabold sm:text-5xl">{ro ? "Competențe conectate, aceeași rigoare." : "Connected skills, shared rigour."}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400 lg:justify-self-end">{ro ? "Rolurile diferă de la proiect la proiect. Contează mai mult cum gândești, explici și validezi decât o listă rigidă de tehnologii." : "Roles vary from one project to another. How you think, explain and validate matters more than a rigid technology checklist."}</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {disciplines.map((item) => (
              <article key={item.title} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 transition-colors hover:border-violet-300/30">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-300/10 text-violet-200"><item.icon className="size-5" aria-hidden /></span>
                <h3 className="mt-5 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.018] px-4 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-violet-200"><HeartHandshake className="size-5" aria-hidden />{ro ? "Cum colaborăm" : "How we collaborate"}</div>
            <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-5xl">{ro ? "Clar de la prima conversație." : "Clear from the first conversation."}</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-slate-400">{ro ? "Pentru o candidatură spontană, trimite-ne un mesaj scurt despre tine, aria în care lucrezi și două sau trei exemple relevante. Răspundem când experiența se potrivește unei nevoi reale." : "For an open application, send a short note about yourself, your area of work and two or three relevant examples. We reply when your experience matches a real need."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {principles.map((principle) => (
              <div key={principle} className="flex min-h-24 items-start gap-3 rounded-2xl border border-white/10 bg-[#070d1b] p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden />
                <span className="text-sm font-medium leading-relaxed text-slate-200">{principle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.24),transparent_45%),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.015))] p-6 sm:p-10">
          <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200"><Sparkles className="size-4" aria-hidden />{ro ? "Candidatură deschisă" : "Open application"}</div>
              <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold sm:text-4xl">{ro ? "Arată-ne ce ai construit și ce vrei să înveți în continuare." : "Show us what you have built and what you want to learn next."}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{ro ? "CV-ul ajută, dar portofoliul, deciziile explicate și atenția la detalii spun mai mult." : "A CV helps, but a portfolio, explained decisions and attention to detail tell us more."}</p>
            </div>
            <a href={`mailto:${COMPANY.email}?subject=${subject}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5">
              {ro ? "Scrie-ne" : "Email us"}<ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <ContactBar />
    </main>
  );
};

export default Careers;
