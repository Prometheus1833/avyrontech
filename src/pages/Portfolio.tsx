import {
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Layers3,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Nav from "@/components/site/Nav";
import PageBackLink from "@/components/site/PageBackLink";
import Footer from "@/components/site/Footer";
import PortfolioIntro from "@/components/portfolio/PortfolioIntro";
import PortfolioScene from "@/components/portfolio/PortfolioScene";
import { useLang } from "@/i18n/LanguageContext";
import {
  PORTFOLIO_PROJECTS,
  PORTFOLIO_SECTORS,
  PORTFOLIO_WORKFLOW,
  type PortfolioProject,
} from "@/data/portfolioShowcase";
import { SHOWCASE_IMAGES } from "@/data/portfolioShowcaseImages";
import portfolioStyles from "@/components/portfolio/portfolio.css?inline";

function ProjectCard({
  project,
  lang,
  wide,
}: {
  project: PortfolioProject;
  lang: "ro" | "en";
  wide: boolean;
}) {
  const image = SHOWCASE_IMAGES[project.id];
  const ro = lang === "ro";
  return (
    <article
      className={`pf-case ${wide ? "pf-case-wide" : ""}`}
      id={`proiect-${project.id}`}
    >
      <a
        className="pf-case-image"
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${new URL(project.url).hostname.replace(/^www\./, "")} ${ro ? "Deschide website-ul" : "Open website"} ${project.name} (${ro ? "tab nou" : "new tab"})`}
      >
        <div className="pf-browser-bar" aria-hidden="true">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>{new URL(project.url).hostname.replace(/^www\./, "")}</span>
          <ArrowUpRight size={13} />
        </div>
        <img
          src={image.large}
          srcSet={`${image.small} 640w, ${image.large} 1280w`}
          sizes={
            wide
              ? "(min-width: 900px) 540px, (min-width: 640px) 80vw, 92vw"
              : "(min-width: 900px) 540px, 92vw"
          }
          width="1280"
          height="800"
          loading="lazy"
          decoding="async"
          alt={
            ro
              ? `Captură a paginii ${project.name}, proiect din portofoliul Avyron`
              : `${project.name} website capture, an Avyron portfolio project`
          }
        />
        <span className="pf-image-action" aria-hidden="true">
          {ro ? "Deschide website-ul" : "Open website"}
          <ArrowUpRight size={15} />
        </span>
      </a>
      <div className="pf-case-body">
        <div className="pf-case-label">{project.type[lang]}</div>
        <h3>{project.name}</h3>
        <p className="pf-case-description">{project.description[lang]}</p>
        <h4>{ro ? "Ce am construit" : "What we built"}</h4>
        <ul className="pf-delivered">
          {project.delivered.map((item) => (
            <li key={item.ro}>
              <Check size={14} aria-hidden="true" />
              <span>{item[lang]}</span>
            </li>
          ))}
        </ul>
        {project.note && (
          <p className="pf-project-note">
            <span>{ro ? "Stadiul proiectului" : "Project stage"}</span>
            {project.note[lang]}
          </p>
        )}
        <div className="pf-case-actions">
          <a href={project.url} target="_blank" rel="noopener noreferrer">
            {ro ? "Vezi proiectul" : "View project"}
            <ArrowUpRight size={16} />
          </a>
          <a
            href={`https://wa.me/40734605055?text=${encodeURIComponent(ro ? `Bună! Am văzut ${project.name} în portofoliul Avyron și aș dori să discutăm un proiect pentru afacerea mea.` : `Hello! I saw ${project.name} in the Avyron portfolio and would like to discuss a project for my business.`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {ro
              ? "Vreau ceva pentru afacerea mea"
              : "Something for my business"}
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function Portfolio() {
  // Capture route-critical CSS in prerendered HTML as well as SPA navigation.
  // CSS stays scoped to this page and is removed when leaving the route.
  useLayoutEffect(() => {
    const id = "avyron-portfolio-styles";
    const style =
      document.getElementById(id) || document.createElement("style");
    style.id = id;
    style.textContent = portfolioStyles;
    if (!style.isConnected) document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);
  // React replaces the prerendered tree after its lazy route loads. Restore
  // a direct fragment only after the styled content has mounted.
  useLayoutEffect(() => {
    if (/jsdom/i.test(navigator.userAgent) || !location.hash) return;
    let id: string;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target?.closest(".pf-page")) return;
    const frame = requestAnimationFrame(() =>
      target.scrollIntoView({ block: "start", behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const { lang } = useLang();
  const ro = lang === "ro";
  const [activeSector, setActiveSector] = useState("");
  const path = ro ? "/portofoliu" : "/en/portfolio";
  const servicePath = ro
    ? "/servicii/website-prezentare-profesional"
    : "/en/services/professional-presentation-website";
  useEffect(() => {
    let alive = true;
    void Promise.all([
      import("@/lib/seo"),
      import("@/lib/structuredData"),
    ]).then(
      ([{ setPageMeta, setJsonLd }, { breadcrumbLd, organizationLd }]) => {
        if (!alive) return;
        const title = ro
          ? "Portofoliu Avyron — website-uri, branduri și platforme digitale"
          : "Avyron Portfolio — Websites, Brands & Digital Platforms";
        const description = ro
          ? "Explorează proiectele Avyron: Flawless Studio, Ruller, Cutiuța Magică, CLAR, Retuvo și Detectiv ICM. Design și funcționalități adaptate fiecărui domeniu."
          : "Explore Avyron projects: Flawless Studio, Ruller, Cutiuța Magică, CLAR, Retuvo and Detectiv ICM. Design and functionality tailored to each industry.";
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/portofoliu", en: "/en/portfolio" },
          image: "/og/portfolio-2026.jpg",
          imageAlt: ro
            ? "Proiecte web din portofoliul Avyron, prezentate în perspectivă"
            : "Web projects from the Avyron portfolio presented in perspective",
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            { name: ro ? "Portofoliu" : "Portfolio", path },
          ]),
        );
        setJsonLd("ld-portfolio", {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: `https://avyron.ro${path}`,
          inLanguage: ro ? "ro-RO" : "en",
          publisher: { "@id": "https://avyron.ro/#organization" },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: PORTFOLIO_PROJECTS.length,
            itemListElement: PORTFOLIO_PROJECTS.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "CreativeWork",
                name: p.name,
                url: p.url,
                description: p.description[lang],
              },
            })),
          },
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [lang, path, ro]);
  useEffect(() => {
    if (/jsdom/i.test(navigator.userAgent)) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSector(entry.target.id);
        }),
      { rootMargin: "-15% 0px -60% 0px" },
    );
    PORTFOLIO_SECTORS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div className="pf-page dark">
      <a href="#portfolio-content" className="pf-skip">
        {ro ? "Sari la conținut" : "Skip to content"}
      </a>
      <Nav
        links={[
          { label: ro ? "Proiecte" : "Projects", href: "#proiecte" },
          { label: "Workflow", href: "#workflow" },
          {
            label: ro ? "Servicii" : "Services",
            to: ro ? "/servicii" : "/en/services",
            isRoute: true,
          },
          {
            label: ro ? "Despre noi" : "About us",
            to: ro ? "/despre-noi" : "/en/about",
            isRoute: true,
          },
        ]}
        cta={{
          label: ro ? "Hai să construim" : "Let's build",
          sub: ro ? "Proiectul tău începe aici" : "Your project starts here",
          href: "#discutie",
        }}
      />
      <PortfolioIntro ro={ro} />
      <main id="portfolio-content" tabIndex={-1}>
        <section
          className="pf-hero pf-container"
          aria-labelledby="portfolio-title"
        >
          <div className="pf-hero-copy">
            <PageBackLink to={servicePath} label={ro ? "Înapoi" : "Back"} title={ro ? "Înapoi la serviciul website" : "Back to the website service"} inverse className="mb-5" />
            <p className="pf-eyebrow">
              <span />
              AVYRON / {ro ? "PORTOFOLIU SELECTAT" : "SELECTED PORTFOLIO"}
            </p>
            <h1 id="portfolio-title">
              {ro ? "Proiecte digitale." : "Digital projects."}
              <br />
              <em>
                {ro
                  ? "Identitate în fiecare detaliu."
                  : "Identity in every detail."}
              </em>
            </h1>
            <p className="pf-hero-description">
              {ro
                ? "Website-uri de prezentare, branduri și platforme. Construite în jurul oamenilor care le folosesc și al afacerilor pe care le reprezintă."
                : "Business websites, brands and platforms. Built around the people who use them and the businesses they represent."}
            </p>
            <div className="pf-hero-actions">
              <a href="#proiecte" className="pf-button">
                {ro ? "Descoperă proiectele" : "Explore the projects"}
                <ArrowDown size={17} />
              </a>
              <a href="#workflow" className="pf-text-link">
                {ro ? "Cum lucrăm" : "How we work"}
                <ArrowUpRight size={16} />
              </a>
            </div>
            <div className="pf-hero-index">
              <span>
                <b>{String(PORTFOLIO_PROJECTS.length).padStart(2, "0")}</b>
                {ro ? "proiecte selectate" : "selected projects"}
              </span>
              <span>
                <b>04</b>
                {ro
                  ? "domenii, abordări distincte"
                  : "industries, distinct approaches"}
              </span>
            </div>
          </div>
          <PortfolioScene ro={ro} />
        </section>
        <section
          id="workflow"
          className="pf-workflow pf-container"
          aria-labelledby="workflow-title"
        >
          <div className="pf-section-top">
            <p className="pf-eyebrow">01 / WORKFLOW</p>
            <h2 id="workflow-title">
              {ro
                ? "De la context la experiență."
                : "From context to experience."}
            </h2>
            <p>
              {ro
                ? "Un proces clar. Decizii împreună. Fiecare etapă pregătește următoarea."
                : "A clear process. Shared decisions. Each stage prepares the next."}
            </p>
          </div>
          <ol className="pf-steps">
            {PORTFOLIO_WORKFLOW.map((step, i) => (
              <li key={step.title.ro}>
                <span className="pf-step-number">0{i + 1}</span>
                <h3>{step.title[lang]}</h3>
                <p>{step.text[lang]}</p>
              </li>
            ))}
          </ol>
        </section>
        <div id="proiecte" className="pf-projects-start pf-container">
          <p className="pf-eyebrow">
            02 / {ro ? "PROIECTE & DOMENII" : "PROJECTS & INDUSTRIES"}
          </p>
          <p>
            {ro
              ? "Aceeași rigoare. O expresie diferită pentru fiecare afacere."
              : "The same care. A different expression for every business."}
          </p>
        </div>
        <nav
          className="pf-sector-nav"
          aria-label={ro ? "Domenii din portofoliu" : "Portfolio industries"}
        >
          <div className="pf-container">
            {PORTFOLIO_SECTORS.map((sector, i) => (
              <a
                key={sector.id}
                href={`#${sector.id}`}
                aria-current={
                  activeSector === sector.id ? "location" : undefined
                }
              >
                <span>0{i + 1}</span>
                {sector.label[lang]}
              </a>
            ))}
          </div>
        </nav>
        {PORTFOLIO_SECTORS.map((sector, i) => {
          const projects = PORTFOLIO_PROJECTS.filter(
            (p) => p.sector === sector.id,
          );
          return (
            <section
              className="pf-sector pf-container"
              key={sector.id}
              id={sector.id}
              aria-labelledby={`${sector.id}-title`}
              style={{ "--sector-accent": sector.accent } as CSSProperties}
            >
              <div className="pf-sector-heading">
                <span className="pf-sector-number">0{i + 1}</span>
                <div>
                  <p className="pf-eyebrow">{sector.label[lang]}</p>
                  <h2 id={`${sector.id}-title`}>{sector.headline[lang]}</h2>
                  <p>{sector.description[lang]}</p>
                </div>
              </div>
              <div className="pf-sector-guidance">
                <div>
                  <h3>
                    <Sparkles size={16} aria-hidden="true" />
                    {ro
                      ? "Direcție vizuală recomandată"
                      : "Recommended visual direction"}
                  </h3>
                  <p>{sector.visual[lang]}</p>
                </div>
                <div>
                  <h3>
                    <Layers3 size={16} aria-hidden="true" />
                    {ro
                      ? "Funcții potrivite domeniului"
                      : "Features suited to the industry"}
                  </h3>
                  <ul>
                    {sector.functions.map((f) => (
                      <li key={f.ro}>{f[lang]}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="pf-cases">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    lang={lang}
                    wide={projects.length === 1}
                  />
                ))}
              </div>
              {sector.id === "juridic" && (
                <div className="pf-legal-directions">
                  <p className="pf-eyebrow">
                    {ro
                      ? "ACELEAȘI PRINCIPII, ALTE SPECIALIZĂRI"
                      : "SHARED PRINCIPLES, OTHER SPECIALISMS"}
                  </p>
                  <div>
                    <article>
                      <h3>{ro ? "Cabinete de avocatură" : "Law firms"}</h3>
                      <p>
                        {ro
                          ? "Arii de practică, echipă, articole explicative și solicitări de consultanță. O prezentare adaptată identității cabinetului."
                          : "Practice areas, team, explanatory articles and consultation enquiries. A presentation tailored to the firm's identity."}
                      </p>
                    </article>
                    <article>
                      <h3>{ro ? "Birouri notariale" : "Notary offices"}</h3>
                      <p>
                        {ro
                          ? "Servicii, acte necesare, program și orientare înainte de vizită. Informația utilă, la îndemână pe telefon."
                          : "Services, required documents, opening hours and guidance before a visit. Useful information within reach on a phone."}
                      </p>
                    </article>
                  </div>
                  <p className="pf-directions-note">
                    {ro
                      ? "Direcții de proiectare pentru proiecte viitoare, distincte de exemplul prezentat mai sus."
                      : "Design directions for future projects, separate from the project shown above."}
                  </p>
                </div>
              )}
            </section>
          );
        })}
        <section
          className="pf-beyond pf-container"
          aria-labelledby="beyond-title"
        >
          <div>
            <p className="pf-eyebrow">
              03 / {ro ? "DINCOLO DE PREZENTARE" : "BEYOND THE HOMEPAGE"}
            </p>
            <h2 id="beyond-title">
              {ro
                ? "Website-ul este începutul."
                : "The website is the beginning."}
            </h2>
            <p>
              {ro
                ? "Aceeași identitate poate continua într-un magazin, o aplicație, un sistem de lucru sau o automatizare. Alegem împreună ce este util afacerii tale."
                : "The same identity can extend into a store, an app, an operational system or an automation. Together, we choose what helps your business."}
            </p>
          </div>
          <div className="pf-service-links">
            {[
              {
                to: servicePath,
                name: ro ? "Website-uri de prezentare" : "Business websites",
                icon: Layers3,
              },
              {
                to: ro
                  ? "/servicii/aplicatii-si-platforme"
                  : "/en/services/apps-and-platforms",
                name: ro ? "Aplicații & platforme" : "Apps & platforms",
                icon: ShieldCheck,
              },
              {
                to: ro
                  ? "/servicii/automatizari-si-ai"
                  : "/en/services/automation-and-ai",
                name: ro ? "Automatizări & AI" : "Automation & AI",
                icon: Sparkles,
              },
            ].map((s) => (
              <Link key={s.to} to={s.to}>
                <s.icon size={18} aria-hidden="true" />
                <span>{s.name}</span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
        <section
          id="discutie"
          className="pf-contact pf-container"
          aria-labelledby="contact-title"
        >
          <p className="pf-eyebrow">
            {ro
              ? "URMĂTORUL PROIECT POATE FI AL TĂU"
              : "YOUR PROJECT COULD BE NEXT"}
          </p>
          <h2 id="contact-title">
            {ro ? "Ce construim pentru tine?" : "What shall we build for you?"}
          </h2>
          <p>
            {ro
              ? "Spune-ne ce faci, cui te adresezi și unde vrei să ajungi. Pornim de la afacerea ta, nu de la un șablon."
              : "Tell us what you do, who you serve and where you want to go. We start with your business, not a template."}
          </p>
          <div>
            <a
              className="pf-button"
              href={`https://wa.me/40734605055?text=${encodeURIComponent(ro ? "Bună! Am explorat portofoliul Avyron și aș dori să discutăm despre un proiect pentru afacerea mea." : "Hello! I explored the Avyron portfolio and would like to discuss a project for my business.")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={18} />
              {ro ? "Hai să discutăm" : "Let's talk"}
              <ArrowUpRight size={17} />
            </a>
            <Link
              className="pf-text-link"
              to={ro ? "/configurator" : "/en/configurator"}
            >
              {ro ? "Configurează un website" : "Configure a website"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
