import { SERVICE_PAGES } from "../../../../src/shared/servicePagePolicy";
import { WEBSITE_SUBSCRIPTION_PATH } from "../../../../src/shared/websiteSubscriptions";
import type { KnowledgeMatch } from "./knowledgeRetrieval";
import { normalizeQuestion } from "./publicChatCommerce";

type Localized = { ro: string; en: string };
type Guide = { id: string; trigger: RegExp; title: Localized; text: Localized; path: Localized };
const locale = (language: string) => language === "en" ? "en" : "ro";

// Public editorial facts only. Tariffs, product availability and plan details stay
// in the live catalogue. No profiles, account data or internal routes are used here.
const guides: Guide[] = [
  {
    id: "contact", trigger: /^(?:contact|whatsapp|telefon|email)$|\b(date(?:le)? de contact|cum (?:va )?contactez|contactul (?:vostru|avyron)|vorbesc cu (?:un om|echipa)|telefon(?:ul)? (?:vostru|avyron)|email(?:ul)? (?:vostru|avyron)|reach you|talk to (?:a human|your team))\b/,
    title: { ro: "Contactează echipa AVYRON", en: "Contact the AVYRON team" },
    text: { ro: "Poți scrie echipei la contact@avyron.ro sau pe WhatsApp la +40 734 605 055. Pentru un proiect, ajunge să spui cu ce te ocupi și ce ai vrea să obții.", en: "Email contact@avyron.ro or reach the team on WhatsApp at +40 734 605 055. To discuss a project, start with what your business does and what you want to achieve." },
    path: { ro: "/#cta", en: "/en#cta" },
  },
  {
    id: "process", trigger: /\b(cum lucrati|cum decurge|cum incepem|pasii proiectului|etapele proiectului|cum primesc o oferta|configurator|how do you work|how to get started|your process)\b/,
    title: { ro: "Cum lucrăm la un proiect", en: "How we work on a project" },
    text: { ro: "Începem cu obiectivele, publicul și materialele disponibile. Pe baza lor pregătim o propunere cu livrabile și costuri. După ce agreăm condițiile, dezvoltăm, testăm și predăm proiectul; mentenanța se stabilește separat, după caz.", en: "We start with your goals, audience and available materials. We then prepare a proposal with deliverables and costs. Once agreed, we build, test and hand over the project; ongoing maintenance is agreed where needed." },
    path: { ro: "/configurator", en: "/en/configurator" },
  },
  {
    id: "portfolio", trigger: /\b(portofoliu(?:l)?|portfolio|proiecte realizate|exemple de (?:siteuri|site uri|site|proiecte)|work examples|case studies)\b/,
    title: { ro: "Portofoliu AVYRON", en: "AVYRON portfolio" },
    text: { ro: "În portofoliu găsești proiecte și exemple publice din wellness, marketing, servicii și domeniul juridic. Poți compara cum diferă designul și funcțiile în funcție de domeniu.", en: "The portfolio presents public work and examples across wellness, marketing, services and legal. You can compare how design and features change across industries." },
    path: { ro: "/portofoliu", en: "/en/portfolio" },
  },
  {
    id: "about", trigger: /\b(cine (?:sunteti|e avyron|este avyron)|ce (?:face avyron|oferiti|servicii aveti)|despre avyron|who (?:are you|is avyron)|what (?:does avyron do|do you offer)|your services)\b/,
    title: { ro: "Despre AVYRON", en: "About AVYRON" },
    text: { ro: "AVYRON proiectează site-uri de prezentare, magazine online și aplicații. Agenția lucrează și la automatizări și agenți AI, identitate vizuală, SEO, publicitate digitală, testare și mentenanță. Produsele digitale sunt o categorie separată de dezvoltarea la comandă.", en: "AVYRON designs business websites, online stores and apps. The agency also works on automation and AI agents, brand identity, SEO, digital advertising, testing and maintenance. Digital products are separate from bespoke development." },
    path: { ro: "/despre-noi", en: "/en/about" },
  },
  {
    id: "blog", trigger: /\b(blog(?:ul)? avyron|avyron insights|articole(?:le)? (?:avyron|voastre)|public articles|your blog)\b/,
    title: { ro: "AVYRON Insights", en: "AVYRON Insights" },
    text: { ro: "Blogul AVYRON publică ghiduri despre site-uri, design, SEO, comerț online, securitate și tehnologie.", en: "AVYRON Insights publishes guides on websites, design, SEO, ecommerce, security and technology." },
    path: { ro: "/blog", en: "/en/blog" },
  },
];

const services: Record<string, Localized> = {
  "premium-website": { ro: "Un site de prezentare adaptat afacerii, cu pagini pentru servicii și contact. Portofoliul, formularele sau programările se stabilesc în funcție de proiect.", en: "A business website tailored to your brand, with service and contact pages. Portfolio, form and booking features depend on the agreed scope." },
  "website-subscription": { ro: "Dezvoltarea site-ului personalizat este inclusă. Abonamentul lunar este plătit, iar clientul asigură domeniul principal. Hostingul, securitatea, actualizările și opțiunile de promovare depind de planul ales.", en: "Bespoke website development is included. The monthly subscription is paid, and the client provides the main domain. Hosting, security, updates and promotion options depend on the selected plan." },
  "online-store": { ro: "Un magazin online reunește catalogul, paginile de produs, coșul și checkoutul. Plata, livrarea și gestionarea stocului se configurează după nevoile magazinului.", en: "An online store brings together the catalogue, product pages, cart and checkout. Payment, delivery and inventory integrations depend on the store’s needs." },
  apps: { ro: "Aplicațiile web și mobile pornesc de la ce trebuie să poată face utilizatorii. Conturile, fluxurile, integrările și API-urile se aleg pentru fiecare proiect.", en: "Web and mobile apps are designed around what users need to do. Accounts, workflows, integrations and APIs are scoped per project." },
  "ai-agent": { ro: "Un agent AI poate răspunde la întrebări sau automatiza sarcini bine definite. Sursele de date, integrările și operațiunile care cer intervenție umană se stabilesc în proiect.", en: "An AI agent can answer questions or automate defined tasks. Data sources, integrations and actions requiring human review are agreed for each project." },
  "seo-ai": { ro: "Serviciul urmărește vizibilitatea în căutare și în răspunsurile AI prin audit, conținut și îmbunătățiri tehnice. Pozițiile și rezultatele nu sunt garantate.", en: "The service improves search and AI visibility through audits, content and technical work. Rankings and results are not guaranteed." },
  "marketing-ads": { ro: "Campaniile se construiesc în jurul obiectivelor, audienței, materialelor și măsurării rezultatelor. Bugetul de reclamă și onorariul se confirmă în propunere.", en: "Campaigns are planned around goals, audiences, creative and measurement. Media spend and agency fees are confirmed in the proposal." },
  "logo-3d": { ro: "Serviciul de identitate include direcții vizuale pentru brand și poate include un logo 3D sau animat. Formatele și drepturile de utilizare se confirmă în ofertă.", en: "Brand identity work can include 3D or animated logo assets. File formats and usage rights are confirmed in the proposal." },
  "blog-profesional": { ro: "Un blog profesional organizează articolele pe subiecte și creează un loc pentru conținut editorial. Structura, publicarea și integrarea în site se stabilesc în proiect.", en: "A professional blog organises articles by topic and provides a home for editorial content. Structure, publishing and site integration are agreed in scope." },
  "social-identity": { ro: "Identitatea pentru social media aliniază aspectul conturilor și al materialelor vizuale. Administrarea și frecvența postărilor se stabilesc separat, dacă sunt necesare.", en: "Social media identity aligns the look of profiles and visual assets. Account management and publishing frequency are agreed separately if needed." },
  "qa-testing": { ro: "Testarea urmărește parcursurile importante, erorile și comportamentul pe dispozitivele stabilite. Problemele sunt descrise cu pași de reproducere.", en: "QA checks key journeys, defects and behaviour on the agreed devices. Findings are documented with steps to reproduce them." },
  audit: { ro: "Auditul analizează produsul existent și prioritizează îmbunătățirile. Domeniile analizate, precum UX, performanța, accesibilitatea sau securitatea, depind de obiectivul evaluării.", en: "An audit reviews an existing product and prioritises improvements. The areas reviewed, such as UX, performance, accessibility or security, depend on the assessment scope." },
  maintenance: { ro: "Mentenanța poate acoperi hosting, actualizări, monitorizare și intervenții. Ce este inclus și cum se acordă suportul depind de pachet sau de acordul proiectului.", en: "Maintenance can cover hosting, updates, monitoring and support. Coverage and response arrangements depend on the plan or project agreement." },
};

export function publicServiceGuide(key: string, language: string) {
  const lang = locale(language);
  const path = key === "website-subscription" ? WEBSITE_SUBSCRIPTION_PATH[lang]
    : key === "maintenance" ? (lang === "en" ? "/en/maintenance-and-partnerships" : "/mentenanta-si-colaborari")
    : SERVICE_PAGES.find((entry) => entry.key === key)?.[lang];
  const description = services[key]?.[lang];
  return description && path ? { description, path } : undefined;
}

export function publicGuideMatches(question: string, language: string): KnowledgeMatch[] {
  const text = normalizeQuestion(question);
  const lang = locale(language);
  const exact = /^(?:cum (?:va )?contactez|cum vorbesc cu echipa|unde (?:e|este|gasesc) (?:blogul|portofoliul)(?: avyron)?|where is your (?:blog|portfolio)|(?:date de )?contact|portofoliu|portfolio|blog(?:ul)? avyron)$/.test(text);
  return guides.filter((guide) => guide.trigger.test(text)).map(({ id, title, text, path }) => ({
    exact,
    score: 0.9,
    entry: { id: `public-guide:${id}`, category: "ghid", language: lang, question: title[lang], answer: text[lang],
      keywords: "", priority: 12, source: "public-site-guide", agent_slug: null, path: path[lang] },
  }));
}
