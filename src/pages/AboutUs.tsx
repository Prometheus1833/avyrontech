import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  Bug,
  CalendarClock,
  CheckCircle2,
  Code2,
  Cpu,
  Layers3,
  MessageSquareText,
  Palette,
  ShieldCheck,
  Sparkles,
  Timer,
  UsersRound,
  Video,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import QuickNav from "@/components/site/QuickNav";
import logo from "@/assets/avyron-logo.webp";
import aboutHero1536Avif from "@/assets/about-hero-1536.avif";
import aboutHero1536Webp from "@/assets/about-hero-1536.webp";
import aboutHero768Avif from "@/assets/about-hero-768.avif";
import aboutHero768Webp from "@/assets/about-hero-768.webp";
import aboutTeam960Avif from "@/assets/about-team-960.avif";
import aboutTeam960Webp from "@/assets/about-team-960.webp";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Footer from "@/components/site/Footer";
import ContactBar from "@/components/site/ContactBar";
import PageBackLink from "@/components/site/PageBackLink";

const AboutUs = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 28]);
  const homeHref = ro ? "/#hero" : "/en#hero";
  const portfolioPath = ro ? "/portofoliu" : "/en/portfolio";
  const productsPath = ro ? "/costurisiproduse" : "/en/pricing";

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Despre Avyron — echipă web development și cybersecurity Iași"
      : "About Avyron — Web Development & Cybersecurity Team in Iași";
    const description = ro
      ? "Cunoaște echipa Avyron din Iași: specialiști în web design, web development, cybersecurity, QA testing și dezvoltare asistată de AI."
      : "Meet the Avyron team in Iași: specialists in web design, web development, cybersecurity, QA testing and AI-assisted engineering.";
    const path = ro ? "/despre-noi" : "/en/about";

    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/despre-noi", en: "/en/about" },
          image: "/og/about-us-2026.jpg",
          imageAlt: ro
            ? "Arhitectură digitală Avyron pentru web development, securitate și QA"
            : "Avyron digital architecture for web development, security and QA",
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Despre noi" : "About us", path },
          ]),
        );
        setJsonLd("ld-about-page", {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: title,
          description,
          url: `https://avyron.ro${path}`,
          inLanguage: ro ? "ro-RO" : "en",
          mainEntity: { "@id": "https://avyron.ro/#organization" },
        });
      },
    );
  }, [ro]);

  const specialties = [
    { icon: Palette, title: "Web Design", text: ro ? "Interfețe clare, identități coerente și experiențe construite pentru utilizare reală." : "Clear interfaces, coherent identities and experiences built for real use." },
    { icon: Code2, title: "Web Development", text: ro ? "Implementări custom, aplicații web și integrări gândite pentru performanță și extindere." : "Custom builds, web apps and integrations designed for performance and growth." },
    { icon: ShieldCheck, title: "Cybersecurity", text: ro ? "Arhitectură defensivă, acces controlat, validare și monitorizare încă din faza de proiectare." : "Defensive architecture, controlled access, validation and monitoring from the design stage." },
    { icon: Bug, title: "QA Testing", text: ro ? "Testare funcțională, responsive, accesibilitate și verificări înainte de fiecare lansare importantă." : "Functional, responsive and accessibility testing before every important release." },
    { icon: Cpu, title: ro ? "Dezvoltare asistată de AI" : "AI-assisted engineering", text: ro ? "Instrumente AI folosite controlat pentru cercetare, prototipare și automatizarea etapelor repetitive." : "AI tools used responsibly for research, prototyping and repetitive workflow automation." },
    { icon: Layers3, title: "Vibe Development", text: ro ? "Explorare rapidă de concepte, urmată de structurare, revizie tehnică și cod pregătit pentru producție." : "Fast concept exploration followed by structure, technical review and production-ready code." },
  ];

  const values = [
    { icon: CheckCircle2, title: ro ? "Seriozitate" : "Reliability", text: ro ? "Clarificăm obiectivele, limitele și responsabilitățile înainte de implementare." : "We clarify objectives, constraints and responsibilities before implementation." },
    { icon: Sparkles, title: ro ? "Profesionalism" : "Professionalism", text: ro ? "Fiecare decizie de design și cod trebuie să aibă un motiv verificabil." : "Every design and engineering decision must have a verifiable reason." },
    { icon: Timer, title: ro ? "Ritm eficient" : "Efficient pace", text: ro ? "Lucrăm rapid, fără să comprimăm etapele esențiale de securitate și QA." : "We move quickly without compressing essential security and QA work." },
    { icon: MessageSquareText, title: ro ? "Comunicare clară" : "Clear communication", text: ro ? "Primești context, progres și următorii pași într-un limbaj direct, fără ambiguități." : "You receive context, progress and next steps in direct, unambiguous language." },
  ];

  const collaboration = [
    { icon: MessageSquareText, step: "01", title: ro ? "Înțelegem contextul" : "We understand the context", text: ro ? "Discutăm activitatea, utilizatorii și rezultatul urmărit, nu doar lista de funcții." : "We discuss the business, its users and desired outcome, not only a feature list." },
    { icon: CalendarClock, step: "02", title: ro ? "Planificăm împreună" : "We plan together", text: ro ? "Stabilim întâlniri remote, în intervale convenabile clientului și confirmate în avans." : "We schedule remote meetings in client-friendly time slots agreed in advance." },
    { icon: Blocks, step: "03", title: ro ? "Construim și validăm" : "We build and validate", text: ro ? "Livrăm incremental, explicăm deciziile și verificăm fiecare etapă pe dispozitive reale." : "We deliver incrementally, explain decisions and validate each stage on real devices." },
    { icon: Video, step: "04", title: ro ? "Lansăm fără rupturi" : "We launch smoothly", text: ro ? "Pregătim publicarea, măsurarea, securitatea și transferul clar al proiectului." : "We prepare publishing, measurement, security and a clear project handover." },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050914] text-white selection:bg-cyan-300 selection:text-slate-950">
      <QuickNav
        items={[
          { id: "expertiza", label: ro ? "Expertiză" : "Expertise", icon: Code2 },
          { id: "proces", label: ro ? "Proces" : "Process", icon: Layers3 },
          { id: "contact", label: ro ? "Contact" : "Contact", icon: MessageSquareText },
        ]}
      />

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050914]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} inverse />
            <a href={homeHref} className="group hidden items-center gap-2.5 sm:inline-flex" aria-label={ro ? "Avyron — mergi la începutul paginii principale" : "Avyron — go to homepage hero"}>
              <img src={logo} alt="" width={30} height={30} className="size-7 rounded-md object-cover ring-1 ring-white/20" />
              <span className="font-display text-sm font-extrabold tracking-[0.2em] text-white">AVYRON</span>
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link to={portfolioPath} className="hidden rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-cyan-300/40 hover:text-white sm:inline-flex">
              {ro ? "Portofoliu" : "Portfolio"}
            </Link>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-2 py-1">
              <LangSwitch />
              <span className="h-3 w-px bg-white/15" aria-hidden />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <section ref={heroRef} id="about-hero" className="relative flex min-h-[760px] items-center overflow-hidden border-b border-white/10 pt-24 sm:min-h-[720px]">
        <motion.div aria-hidden className="absolute -inset-x-8 -inset-y-24" style={{ y: reduceMotion ? 0 : imageY }}>
          <picture>
            <source media="(max-width: 767px)" type="image/avif" srcSet={aboutHero768Avif} />
            <source media="(max-width: 767px)" type="image/webp" srcSet={aboutHero768Webp} />
            <source type="image/avif" srcSet={aboutHero1536Avif} />
            <img src={aboutHero1536Webp} alt="" width={1536} height={864} fetchPriority="high" className="size-full object-cover object-center opacity-80" />
          </picture>
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050914_0%,rgba(5,9,20,.92)_38%,rgba(5,9,20,.46)_72%,rgba(5,9,20,.72)_100%)]" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-transparent to-[#050914]/35" aria-hidden />

        <motion.div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-16" style={{ y: reduceMotion ? 0 : copyY }}>
          <nav aria-label={ro ? "Navigare contextuală" : "Breadcrumb"} className="mb-8 flex items-center gap-2 text-xs text-white/45">
            <a href={homeHref} className="transition-colors hover:text-white">{ro ? "Acasă" : "Home"}</a>
            <span aria-hidden>/</span>
            <span className="text-cyan-200">{ro ? "Despre noi" : "About us"}</span>
          </nav>
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
              <UsersRound className="size-3.5" aria-hidden />
              {ro ? "Echipă IT · Iași, România" : "IT team · Iași, Romania"}
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-5xl md:text-7xl">
              {ro ? "Construim produse digitale cu " : "We build digital products with "}
              <span className="bg-gradient-to-r from-cyan-200 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                {ro ? "rigoare și imaginație." : "rigour and imagination."}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {ro
                ? "Avyron este o echipă pasionată de Web Development și Web Design din Iași. Reunim specialiști în dezvoltare, cybersecurity, QA și experiență digitală pentru a transforma o idee într-un produs coerent, sigur și ușor de folosit."
                : "Avyron is a Iași-based team passionate about web development and web design. We bring together specialists in engineering, cybersecurity, QA and digital experience to turn an idea into a coherent, secure and easy-to-use product."}
            </p>
            <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-2.5">
              <a href="#expertiza" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-4 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5">
                {ro ? "Cunoaște echipa" : "Meet the team"}
              </a>
              <Link to={portfolioPath} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/[0.11]">
                {ro ? "Vezi portofoliul" : "View portfolio"}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-[11px] text-white/55">
              {[ro ? "Comunicare directă" : "Direct communication", ro ? "Întâlniri remote planificate" : "Scheduled remote meetings", ro ? "Livrare verificată" : "Validated delivery"].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">{item}</span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section id="expertiza" className="relative py-20 sm:py-24">
        <div className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_100px_-40px_rgba(59,130,246,.55)]">
            <picture>
              <source type="image/avif" srcSet={aboutTeam960Avif} />
              <img src={aboutTeam960Webp} alt={ro ? "Cinci discipline digitale conectate într-un singur proces Avyron" : "Five digital disciplines connected in one Avyron workflow"} width={960} height={640} loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050914]/80 via-transparent to-transparent" aria-hidden />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
              {["Design", "Development", "Security", "QA", "AI"].map((label) => <span key={label} className="rounded-full border border-white/15 bg-[#050914]/75 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur">{label}</span>)}
            </div>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">{ro ? "Expertiză conectată" : "Connected expertise"}</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
              {ro ? "O echipă mică, discipline complementare." : "A focused team, complementary disciplines."}
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-slate-400">
              {ro
                ? "Folosim tehnologii consacrate acolo unde stabilitatea contează și instrumente moderne, inclusiv AI, acolo unde accelerează cercetarea și execuția. Deciziile finale rămân documentate, revizuite și asumate de oameni."
                : "We use established technologies where stability matters and modern tools, including AI, where they improve research and execution. Final decisions remain documented, reviewed and owned by people."}
            </p>
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              {specialties.map((item) => (
                <article key={item.title} className="group rounded-2xl border border-white/10 bg-white/[0.025] p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/[0.05]">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-cyan-200"><item.icon className="size-4" aria-hidden /></span>
                    <div><h3 className="text-sm font-bold text-white">{item.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="proces" className="scroll-mt-28 border-y border-white/10 bg-white/[0.018] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-300">{ro ? "Cum lucrăm" : "How we work"}</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-5xl">{ro ? "Calitate vizibilă și în proces." : "Quality you can see in the process."}</h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 [perspective:1200px]">
            {values.map((item) => (
              <motion.article key={item.title} whileHover={reduceMotion ? undefined : { y: -5, rotateX: 1.5, rotateY: -1.5 }} className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.02] p-5 shadow-[0_20px_60px_-38px_rgba(125,211,252,.5)]">
                <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-violet-200"><item.icon className="size-5" aria-hidden /></span>
                <h3 className="mt-5 font-display text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
              </motion.article>
            ))}
          </div>

          <div className="mt-16 grid gap-3 lg:grid-cols-4">
            {collaboration.map((item) => (
              <article key={item.step} className="relative rounded-2xl border border-white/10 bg-[#070d1b] p-4">
                <div className="flex items-center justify-between"><span className="font-mono text-[10px] tracking-[0.22em] text-cyan-300">{item.step}</span><item.icon className="size-4 text-white/45" aria-hidden /></div>
                <h3 className="mt-5 font-display text-base font-bold">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-28 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,.2),transparent_42%),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.015))] p-6 sm:p-10">
            <div className="grid items-end gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-300">{ro ? "Un partener digital atent" : "A thoughtful digital partner"}</p>
                <h2 className="mt-3 max-w-2xl font-display text-3xl font-extrabold sm:text-4xl">{ro ? "Ideea ta merită o discuție clară și un plan realist." : "Your idea deserves a clear conversation and a realistic plan."}</h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">{ro ? "Putem începe remote, cu o întâlnire planificată în intervalul potrivit pentru tine. Pleci din discuție cu opțiuni, priorități și următorul pas." : "We can start remotely with a meeting scheduled for a time that works for you. You leave with options, priorities and a clear next step."}</p>
              </div>
              <div className="grid min-w-56 grid-cols-2 gap-2 md:grid-cols-1">
                <Link to={productsPath} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-slate-950">{ro ? "Vezi produsele" : "View products"}<ArrowRight className="size-3.5" aria-hidden /></Link>
                <Link to={ro ? "/#cta" : "/en#cta"} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/[0.07]">{ro ? "Discută cu noi" : "Talk to us"}</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <ContactBar />
    </main>
  );
};

export default AboutUs;
