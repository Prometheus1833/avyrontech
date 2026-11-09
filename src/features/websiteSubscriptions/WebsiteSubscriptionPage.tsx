import Breadcrumbs from "@/components/site/Breadcrumbs";
import { breadcrumbLd } from "@/lib/structuredData";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Code2,
  Globe2,
  HeartHandshake,
  Layers3,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import Footer from "@/components/site/Footer";
import PortfolioCarousel from "@/components/site/PortfolioCarousel";
import Turnstile from "@/components/site/Turnstile";
import PageBackLink from "@/components/site/PageBackLink";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/apiBase";
import { setJsonLd, setPageMeta } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import {
  defaultWebsitePlans,
  WEBSITE_SUBSCRIPTION_PATH,
  type WebsitePlan,
  type WebsitePlanId,
} from "@/shared/websiteSubscriptions";
import SubscriptionShowcase from "./SubscriptionShowcase";
import "./website-subscriptions.css";
import subscriptionStyles from "./website-subscriptions.css?inline";
import { useCriticalStyles } from "@/lib/useCriticalStyles";
const draftKey = "avyron-website-subscription-draft-v1";
const empty = {
  planId: "start" as WebsitePlanId,
  company: "",
  industry: "",
  website: "",
  objectives: "",
  name: "",
  email: "",
  phone: "",
};
const faq = [
  [
    "Dezvoltarea este într-adevăr inclusă?",
    "Da. Nu achiți separat dezvoltarea website-ului. Abonamentul lunar este contra cost, iar domeniul principal este furnizat de tine. Prețul și condițiile se confirmă înainte de abonare.",
  ],
  [
    "Trebuie să am un domeniu?",
    "Fiecare plan include un subdomeniu AVYRON. Domeniul principal aparține clientului și este furnizat de acesta; te ghidăm pentru conectare. Nu promitem un domeniu gratuit.",
  ],
  [
    "Ce înseamnă o modificare?",
    "O intervenție de conținut cu scop clar, evaluată de echipă înainte de execuție. Vezi unitățile aprobate și consumate în cont. Remedierea defectelor și solicitările de securitate sunt urmărite separat.",
  ],
  [
    "Cum funcționează ciclul de 12 luni?",
    "Urmărim perioadele lunare achitate. După 12 luni poți solicita trecerea la mentenanță standard. Nu schimbăm automat abonamentul și nu introducem taxe de dezvoltare sau penalități implicite.",
  ],
  [
    "Pot renunța la abonament?",
    "Condițiile de anulare și continuare sunt configurate și afișate înainte de acceptarea electronică. Ciclul de 12 luni nu reprezintă, prin el însuși, o perioadă minimă obligatorie.",
  ],
  [
    "Sunt incluse căsuțe de e-mail găzduite?",
    "Numărul de adrese este prevăzut în plan. Activarea depinde de domeniul tău și de furnizorul de e-mail disponibil. Eventualele costuri și tipul serviciului sunt confirmate înainte de activare.",
  ],
];
const faqEn = [
  [
    "Is development really included?",
    "Yes. There is no separate website development fee. The monthly subscription is paid and you provide the primary domain. Pricing and terms are confirmed before subscribing.",
  ],
  [
    "Do I need a domain?",
    "Every plan includes an AVYRON subdomain. You own and provide the main domain; we guide its connection. A free domain is not promised.",
  ],
  [
    "What counts as a change?",
    "A clearly scoped content intervention, reviewed by the team before delivery. Your account shows reviewed units and usage. Defect fixes and security requests are tracked separately.",
  ],
  [
    "How does the twelve-month cycle work?",
    "We track paid monthly periods. After twelve months, you may request standard maintenance. There is no automatic switch, development charge or implied cancellation penalty.",
  ],
  [
    "Can I cancel?",
    "Cancellation and continuation terms are configured and shown before electronic acceptance. The twelve-month cycle does not, by itself, create a mandatory minimum term.",
  ],
  [
    "Are hosted email inboxes included?",
    "The plan specifies a number of addresses. Activation depends on your domain and available email provider. Any costs and the actual service are confirmed before activation.",
  ],
];
function WebsiteSubscriptionContent() {
  useCriticalStyles("avyron-website-subscription-critical", subscriptionStyles);
  const { lang } = useLang(),
    ro = lang === "ro",
    { user } = useAuth();
  const [plans, setPlans] = useState<WebsitePlan[]>(defaultWebsitePlans),
    [step, setStep] = useState(() => {
      try {
        return Math.max(
          0,
          Math.min(2, Number(sessionStorage.getItem(draftKey + ":step")) || 0),
        );
      } catch {
        return 0;
      }
    }),
    [draft, setDraft] = useState(() => {
      try {
        return {
          ...empty,
          ...JSON.parse(sessionStorage.getItem(draftKey) || "{}"),
        };
      } catch {
        return empty;
      }
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState(""),
    [token, setToken] = useState(""),
    [consent, setConsent] = useState(false),
    [reset, setReset] = useState(0),
    [niche, setNiche] = useState(0);
  const key = useRef(""),
    form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    try {
      key.current =
        sessionStorage.getItem(draftKey + ":key") || crypto.randomUUID();
      sessionStorage.setItem(draftKey + ":key", key.current);
    } catch {
      key.current = crypto.randomUUID();
    }
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
      sessionStorage.setItem(draftKey + ":step", String(step));
    } catch {
      /* Storage can be disabled; the live form remains usable. */
    }
  }, [draft, step]);
  useEffect(() => {
    if (user)
      setDraft((d) => ({
        ...d,
        name: d.name || user.display_name || "",
        email: d.email || user.email || "",
      }));
  }, [user]);
  useEffect(() => {
    const abort = new AbortController();
    fetch(apiUrl("/api/website-subscriptions/plans"), { signal: abort.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json() as Promise<{ data?: WebsitePlan[] }>;
      })
      .then((v) => {
        if (Array.isArray(v.data) && v.data.length === 3) setPlans(v.data);
      })
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    const path = WEBSITE_SUBSCRIPTION_PATH[lang];
    setPageMeta({
      title: ro
        ? "Website la 0 lei, dezvoltare inclusă | AVYRON"
        : "Website subscription, development included | AVYRON",
      description: ro
        ? "Un website creat de la zero pentru afacerea ta, fără taxă separată de dezvoltare. Abonament lunar cu hosting, mentenanță și actualizări."
        : "A bespoke website without a separate development fee. A paid monthly subscription with hosting, maintenance and updates.",
      path,
      alternates: WEBSITE_SUBSCRIPTION_PATH,
    });
    setJsonLd("website-subscription", {
      "@type": "Service",
      "@id": "https://avyron.ro" + path + "#service",
      name: ro ? "Website la 0 lei" : "Website subscription",
      serviceType: "Bespoke website development and maintenance",
      url: "https://avyron.ro" + path,
      provider: { "@id": "https://avyron.ro/#organization" },
      description: ro
        ? "Dezvoltare inclusă, abonament lunar contra cost. Domeniul principal este furnizat de client."
        : "Development included; paid monthly subscription. The client provides the primary domain.",
    });
    setJsonLd(
      "website-subscription-breadcrumbs",
      breadcrumbLd([
        { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
        {
          name: ro ? "Servicii" : "Services",
          path: ro ? "/servicii" : "/en/services",
        },
        { name: ro ? "Website la 0 lei" : "Website subscription", path },
      ]),
    );
    setJsonLd("website-subscription-faq", {
      "@type": "FAQPage",
      mainEntity: (ro ? faq : faqEn).map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    });
  }, [lang, ro]);
  const choose = (id: WebsitePlanId) => {
    setDraft((d) => ({ ...d, planId: id }));
    setStep(0);
    document.getElementById("website-brief")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };
  const change = (field: keyof typeof empty, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (step < 2) {
      setStep((v) => v + 1);
      return;
    }
    if (!consent) {
      setError(
        ro
          ? "Confirmă acordul pentru contact."
          : "Confirm the contact consent.",
      );
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(apiUrl("/api/website-subscriptions/requests"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": key.current,
        },
        body: JSON.stringify({
          ...draft,
          consent: true,
          lang,
          token,
          trap: new FormData(form.current!).get("company_fax") || "",
        }),
      });
      const data = (await r.json()) as {
        error?: { code?: string };
        reference?: string;
      };
      if (!r.ok)
        throw Error(
          data.error?.code === "captcha_failed"
            ? ro
              ? "Verifică protecția anti-spam și încearcă din nou."
              : "Complete the anti-spam check and retry."
            : ro
              ? "Cererea nu a fost înregistrată. Datele rămân salvate în această sesiune; poți reîncerca."
              : "The request was not recorded. Your draft remains in this session; please retry.",
        );
      if (!data.reference) throw Error("Răspuns invalid. Reîncearcă.");
      setReference(data.reference);
      try {
        sessionStorage.removeItem(draftKey);
        sessionStorage.removeItem(draftKey + ":key");
        sessionStorage.removeItem(draftKey + ":step");
      } catch {
        /* A confirmed request must not appear failed if storage is blocked. */
      }
      trackEvent("website_subscription_request", { plan: draft.planId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Încearcă din nou.");
      setReset((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };
  const niches = ro
    ? [
        "Servicii",
        "Cabinete",
        "Consultanță",
        "Construcții",
        "HoReCa",
        "Afaceri locale",
      ]
    : [
        "Services",
        "Practices",
        "Consulting",
        "Construction",
        "Hospitality",
        "Local businesses",
      ];
  const benefits = ro
    ? [
        "Dezvoltare inclusă",
        "Design personalizat",
        "Lansare eficientă",
        "Optimizare pentru telefon",
        "Găzduire și securitate",
        "Actualizări lunare",
        "Integrări sociale",
        "Administrare simplă",
      ]
    : [
        "Development included",
        "Custom design",
        "Efficient launch",
        "Mobile optimisation",
        "Hosting and security",
        "Monthly updates",
        "Social connections",
        "Simple management",
      ];
  return (
    <div className="ws-page">
      <div className="ws-top">
        <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />
        <Link to={ro ? "/" : "/en"} className="ws-wordmark">
          AVYRON<span> / WEB</span>
        </Link>
        <div className="flex gap-2">
          <LangSwitch />
          <ThemeToggle />
        </div>
      </div>
      <main>
        <div className="ws-wrap ws-breadcrumbs">
          <Breadcrumbs
            items={[
              { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
              {
                name: ro ? "Servicii" : "Services",
                path: ro ? "/servicii" : "/en/services",
              },
              {
                name: ro ? "Website la 0 lei" : "Website subscription",
                path: WEBSITE_SUBSCRIPTION_PATH[lang],
              },
            ]}
          />
        </div>
        <section className="ws-hero ws-wrap" aria-labelledby="ws-hero-title">
          <div className="ws-hero-copy">
            <span className="ws-eyebrow">
              {ro
                ? "O NOUĂ MODALITATE DE A FI ONLINE"
                : "A NEW WAY TO BE ONLINE"}
            </span>
            <h1 id="ws-hero-title">
              {ro
                ? "Afacerea ta merită un website extraordinar."
                : "Your business deserves an extraordinary website."}
              <em>
                {ro
                  ? "Fără costuri de dezvoltare."
                  : "Without development costs."}
              </em>
            </h1>
            <p className="ws-lead">
              {ro
                ? "Un website profesional, creat de la zero pentru afacerea ta, cu design personalizat, funcționalități inteligente și tot ce ai nevoie pentru o prezență online de impact."
                : "A professional website built from scratch for your business, with custom design, intelligent features and everything you need for a compelling online presence."}
            </p>
            <p className="ws-muted">
              {ro
                ? "Noi îl construim. Îl optimizăm. Îl menținem online. Tu te concentrezi pe afacerea ta."
                : "We build it. Optimise it. Keep it online. You focus on your business."}
            </p>
            <div className="ws-actions">
              <a className="ws-button" href="#website-brief">
                {ro ? "Vreau website-ul meu" : "I want my website"}
                <ArrowRight size={17} />
              </a>
              <a className="ws-button ws-button-ghost" href="#website-plans">
                {ro ? "Descoperă abonamentele" : "Explore subscriptions"}
                <ArrowDown size={16} />
              </a>
            </div>
            <p className="ws-advantage">
              {ro
                ? "0 lei dezvoltare • Abonament lunar • Creat special pentru tine"
                : "0 RON development • Paid monthly subscription • Built for you"}
            </p>
          </div>
          <SubscriptionShowcase ro={ro} />
        </section>
        <section className="ws-wrap ws-section ws-value" id="website-benefits">
          <div className="ws-section-head">
            <span className="ws-eyebrow">
              01 / {ro ? "SIMPLU, DE LA ÎNCEPUT" : "SIMPLE FROM THE START"}
            </span>
            <h2>
              {ro
                ? "Website-ul tău. Fără investiția inițială."
                : "Your website. Without the initial development investment."}
            </h2>
            <p>
              {ro
                ? "De ce să amâni dezvoltarea prezenței tale online? Cu AVYRON, primești un website construit special pentru afacerea ta, fără să achiți separat realizarea lui. Totul este simplu, predictibil și adaptat nevoilor tale."
                : "Why postpone your online presence? AVYRON builds a website for your business without a separate development charge. Simple, predictable and tailored to your needs."}
            </p>
          </div>
          <div className="ws-benefits">
            {benefits.map((v, i) => {
              const Icon = [
                Code2,
                Sparkles,
                ArrowRight,
                MonitorSmartphone,
                ShieldCheck,
                RefreshCw,
                Globe2,
                HeartHandshake,
              ][i];
              return (
                <article key={v}>
                  <Icon size={21} />
                  <h3>{v}</h3>
                </article>
              );
            })}
          </div>
          <p className="ws-note">
            {ro
              ? "Abonamentul lunar este contra cost. Domeniul principal este furnizat de client."
              : "The monthly subscription is paid. The client provides the primary domain."}
          </p>
        </section>
        <section className="ws-wrap ws-section" id="website-personalisation">
          <div className="ws-split">
            <div className="ws-section-head">
              <span className="ws-eyebrow">
                02 / {ro ? "PERSONAL, NU GENERIC" : "PERSONAL, NOT GENERIC"}
              </span>
              <h2>
                {ro
                  ? "Nu primești doar un site. Primești o experiență digitală construită pentru afacerea ta."
                  : "More than a website. A digital experience built for your business."}
              </h2>
              <p>
                {ro
                  ? "Mesajele, paginile, formularele și butoanele de contact urmează felul în care lucrezi și ceea ce caută clienții tăi. Alege un domeniu și imaginează-ți direcția."
                  : "Your messages, pages, forms and contact buttons follow how you work and what your customers need. Choose a sector to imagine the direction."}
              </p>
              <div className="ws-chips">
                {niches.map((v, i) => (
                  <button
                    key={v}
                    aria-pressed={niche === i}
                    onClick={() => setNiche(i)}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="ws-niche-card">
              <small>AVYRON / {niches[niche].toUpperCase()}</small>
              <h3>
                {
                  [
                    ro
                      ? "Expertiza ta, în prim-plan."
                      : "Your expertise, up front.",
                    ro
                      ? "Încredere de la prima vizită."
                      : "Trust from the first visit.",
                    ro
                      ? "Idei clare. Decizii mai bune."
                      : "Clear ideas. Better decisions.",
                    ro
                      ? "Proiecte care vorbesc pentru tine."
                      : "Projects that speak for you.",
                    ro
                      ? "O experiență care începe online."
                      : "An experience that starts online.",
                    ro
                      ? "Aproape de clienții tăi."
                      : "Closer to your customers.",
                  ][niche]
                }
              </h3>
              <dl className="ws-sector-details">
                {(ro ? [
                  ["Mesaj", "Serviciile explicate clar, în limbajul clienților tăi."],
                  ["Experiență", "Structură, identitate și funcții potrivite domeniului."],
                  ["Contact", "Un traseu firesc de la prima vizită la conversație."],
                ] : [
                  ["Message", "Services explained clearly, in your customers' language."],
                  ["Experience", "Structure, identity and features suited to your sector."],
                  ["Contact", "A natural path from the first visit to a conversation."],
                ]).map(([title,text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}
              </dl>
              <a className="ws-text-link" href="#website-brief" onClick={() => change("industry", niches[niche])}>{ro ? "Pornim de la afacerea ta" : "Start with your business"} <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
        <section className="ws-wrap ws-section" id="website-process">
          <div className="ws-section-head">
            <span className="ws-eyebrow">
              03 / {ro ? "DIN IDEE ÎN REALITATE" : "FROM IDEA TO REALITY"}
            </span>
            <h2>
              {ro
                ? "De la idee la online. Surprinzător de simplu."
                : "From idea to online. Surprisingly simple."}
            </h2>
          </div>
          <div className="ws-process">
            {(ro
              ? [
                  [
                    "Ne spui câteva lucruri despre afacerea ta",
                    "Un formular scurt, fără cont obligatoriu.",
                  ],
                  [
                    "Îți construim experiența digitală",
                    "Structură, design, conținut și funcționalități.",
                  ],
                  [
                    "Website-ul tău prinde viață",
                    "Verificare, optimizare și publicare după aprobarea ta.",
                  ],
                  [
                    "Noi avem grijă de tot",
                    "Mentenanță, modificări, verificări și suport.",
                  ],
                ]
              : [
                  [
                    "Tell us about your business",
                    "A short brief, without a mandatory account.",
                  ],
                  [
                    "We build your digital experience",
                    "Structure, design, content and functionality.",
                  ],
                  [
                    "Your website comes to life",
                    "Checks, optimisation and publishing after your approval.",
                  ],
                  [
                    "We take care of the technology",
                    "Maintenance, changes, checks and support.",
                  ],
                ]
            ).map(([title, text], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="ws-wrap ws-section ws-connections" id="website-connections" aria-labelledby="ws-connections-title">
          <div className="ws-section-head">
            <span className="ws-eyebrow">04 / {ro ? "DE LA VIZITĂ LA CONVERSAȚIE" : "FROM A VISIT TO A CONVERSATION"}</span>
            <h2 id="ws-connections-title">{ro ? "Conectat cu lumea. Pregătit pentru clienți." : "Connected to the world. Ready for customers."}</h2>
            <p>{ro ? "Un serviciu descoperit pe Instagram. Un website care explică exact ce oferi. O întrebare pe WhatsApp. Fiecare punct de contact lucrează pentru aceeași afacere: a ta." : "A service discovered on Instagram. A website that explains what you offer. A question on WhatsApp. Every point of contact works for the same business: yours."}</p>
          </div>
          <div className="ws-contact-journey">
            <div><small>01</small><Globe2 aria-hidden="true" /><h3>{ro ? "Te descoperă" : "They discover you"}</h3><p>Instagram · Facebook · TikTok · LinkedIn</p></div>
            <ArrowRight className="ws-journey-arrow" aria-hidden="true" />
            <div><small>02</small><MonitorSmartphone aria-hidden="true" /><h3>{ro ? "Te cunosc" : "They get to know you"}</h3><p>{ro ? "Servicii, proiecte, răspunsuri. În identitatea ta." : "Services, projects, answers. In your own identity."}</p></div>
            <ArrowRight className="ws-journey-arrow" aria-hidden="true" />
            <div><small>03</small><HeartHandshake aria-hidden="true" /><h3>{ro ? "Îți scriu" : "They get in touch"}</h3><p>WhatsApp · {ro ? "Formular" : "Form"} · E-mail</p></div>
          </div>
          <p className="ws-note">{ro ? "Linkurile și butoanele sociale sunt incluse conform planului. Publicarea automată și integrările API se configurează separat, numai cu autorizare." : "Social links and contact buttons follow your plan. Automated publishing and API integrations are configured separately, with authorisation."}</p>
        </section>
        <section className="ws-wrap ws-section" id="website-plans">
          <div className="ws-section-head">
            <span className="ws-eyebrow">
              05 / {ro ? "SPAȚIU SĂ CREȘTI" : "ROOM TO GROW"}
            </span>
            <h2>
              {ro
                ? "Alegi cât de mult poate face website-ul tău."
                : "Choose how much your website can do."}
            </h2>
            <p>
              {ro
                ? "Dezvoltare inclusă – 0 lei. Trei niveluri de personalizare și grijă continuă."
                : "Development included — 0 RON. Three levels of customisation and ongoing care."}
            </p>
          </div>
          <div className="ws-plans">
            {plans.map((p, i) => (
              <article
                className={"ws-plan " + (i === 1 ? "ws-plan-featured" : "")}
                key={p.id}
              >
                <span className="ws-plan-number">0{i + 1} / AVYRON{ i === 1 && <span className="ws-plan-badge">{ro ? "Mai mult spațiu să crești" : "More room to grow"}</span>}</span>
                <h3>{p.name}</h3>
                <p>{p.tagline[lang]}</p>
                <div className="ws-price">
                  {p.available && p.priceMinor !== null ? (
                    <>
                      <strong>
                        {(p.priceMinor / 100).toLocaleString(
                          ro ? "ro-RO" : "en-GB",
                        )}{" "}
                        {p.currency}
                      </strong>
                      <span> / {ro ? "lună" : "month"}</span>
                    </>
                  ) : (
                    <strong>
                      {ro
                        ? "Solicită oferta lunară"
                        : "Request your monthly quote"}
                    </strong>
                  )}
                </div>
                <small>
                  {ro
                    ? "Abonament lunar contra cost. Prețul și regimul fiscal se confirmă înainte de plată."
                    : "Paid monthly subscription. Pricing and tax treatment are confirmed before payment."}
                </small>
                <button className="ws-button" onClick={() => choose(p.id)}>
                  {ro ? "Aleg" : "Choose"} {p.name}
                  <ArrowRight size={15} />
                </button>
                <dl className="ws-plan-metrics">
                  <div><dt>{ro ? "Pagini" : "Pages"}</dt><dd>{p.pages}</dd></div>
                  <div><dt>{ro ? "Modificări / lună" : "Changes / month"}</dt><dd>{p.changes}</dd></div>
                  <div><dt>{ro ? "Butoane rapide" : "Quick contact buttons"}</dt><dd>{p.buttons}</dd></div>
                  <div><dt>{ro ? "Adrese e-mail*" : "Email addresses*"}</dt><dd>{p.emails}</dd></div>
                </dl>
                <details className="ws-plan-features"><summary>{ro ? "Ce include" : "What's included"} {p.name}</summary><ul>{p.features[lang].map(v => <li key={v}><Check aria-hidden="true" />{v}</li>)}</ul></details>
                <details>
                  <summary>
                    {ro
                      ? "Integrări sociale și condiții"
                      : "Social connections and conditions"}
                  </summary>
                  <p>
                    {ro
                      ? "Profiluri Facebook, Instagram, TikTok și LinkedIn, plus contact prin WhatsApp și e-mail. Automatizările și API-urile se activează separat, cu autorizare."
                      : "Facebook, Instagram, TikTok and LinkedIn profiles, plus WhatsApp and email contact. Automations and APIs require separate authorisation."}
                  </p>
                  <p>{p.emailPolicy}</p>
                  {p.available && (
                    <>
                      <p>{p.cancellation}</p>
                      <p className="whitespace-pre-wrap">{p.terms}</p>
                    </>
                  )}
                </details>
              </article>
            ))}
          </div>
          <p className="ws-note">
            {ro
              ? "Toate planurile includ subdomeniu AVYRON, hosting și mentenanță. Domeniul principal este furnizat de tine. *E-mailul depinde de furnizor și de domeniu; orice cost suplimentar se confirmă înainte de activare."
              : "All plans include an AVYRON subdomain, hosting and maintenance. You provide the primary domain. *Email depends on the provider and domain; any additional cost is confirmed before activation."}
          </p>
        </section>
        <section className="ws-wrap ws-section" id="website-account">
          <div className="ws-split">
            <div className="ws-account-preview">
              <div>
                <span>AVYRON / {ro ? "CONTUL TĂU" : "YOUR ACCOUNT"}</span>
                <span>●</span>
              </div>
              <h3>
                {ro
                  ? "Proiectul tău, la îndemână."
                  : "Your project, within reach."}
              </h3>
              {(ro
                ? [
                    "Progres și etape",
                    "Documente și comunicare",
                    "Solicitări de modificare",
                    "Abonament, perioade și facturi",
                  ]
                : [
                    "Progress and milestones",
                    "Documents and communication",
                    "Change requests",
                    "Subscription, periods and invoices",
                  ]
              ).map((v, i) => (
                <p key={v}>
                  <span>0{i + 1}</span>
                  {v}
                  <ArrowRight size={14} />
                </p>
              ))}
              <small>
                {ro
                  ? "Vizualizare conceptuală a contului clientului"
                  : "Concept visual of the client account"}
              </small>
            </div>
            <div className="ws-section-head">
              <span className="ws-eyebrow">
                06 /{" "}
                {ro
                  ? "CONECTAT. ORGANIZAT. AL TĂU."
                  : "CONNECTED. ORGANISED. YOURS."}
              </span>
              <h2>
                {ro
                  ? "Site-ul tău, la îndemâna ta."
                  : "Your website, in your hands."}
              </h2>
              <p>
                {ro
                  ? "Urmărești progresul, consulți documentele, comunici cu echipa și soliciți modificări din același cont. Proiectele, abonamentul și informațiile tale rămân centralizate, cu acces doar la ceea ce îți este alocat."
                  : "Follow progress, read documents, talk to the team and request changes from one account. Projects, subscriptions and information stay together, with access limited to your authorised resources."}
              </p>
            </div>
          </div>
        </section>
        <section className="ws-wrap ws-section" id="website-care">
          <div className="ws-section-head">
            <span className="ws-eyebrow">
              07 / {ro ? "CONTINUITATE" : "CONTINUITY"}
            </span>
            <h2>
              {ro
                ? "Tu îți dezvolți afacerea. Noi ne ocupăm de tehnologie."
                : "Grow your business. We take care of the technology."}
            </h2>
            <p>
              {ro
                ? "Actualizări, backupuri, verificări, optimizare și intervenții în limitele planului și ale infrastructurii configurate. Vezi în cont ce este activ, ce a fost verificat și ce necesită atenție."
                : "Updates, backups, checks, optimisation and interventions within your plan and configured infrastructure. Your account shows what is active, verified and needs attention."}
            </p>
          </div>
          <div className="ws-care">
            {[ShieldCheck, RefreshCw, Layers3, HeartHandshake].map(
              (Icon, i) => (
                <div key={i}>
                  <Icon />
                  <span>
                    {
                      (ro
                        ? [
                            "Securitate și verificări",
                            "Actualizări și optimizare",
                            "Backup și restaurare",
                            "Suport și continuitate",
                          ]
                        : [
                            "Security and checks",
                            "Updates and optimisation",
                            "Backup and recovery",
                            "Support and continuity",
                          ])[i]
                    }
                  </span>
                </div>
              ),
            )}
          </div>
        </section>
        <PortfolioCarousel
          lang={lang}
          carouselKey="premium-website"
          heading={{
            eyebrow: ro ? "LUCRĂRI AVYRON" : "AVYRON WORK",
            title: ro ? "Site-uri create de noi" : "Websites we created",
            description: ro
              ? "Aceleași proiecte și exemple din portofoliul AVYRON."
              : "The same projects and examples from the AVYRON portfolio.",
          }}
        />
        <section
          className="ws-wrap ws-section ws-brief-section"
          id="website-brief"
        >
          <div className="ws-section-head">
            <span className="ws-eyebrow">
              08 / {ro ? "ÎNCEPE CU O IDEE" : "START WITH AN IDEA"}
            </span>
            <h2>
              {ro
                ? "Următorul pas al afacerii tale începe aici."
                : "Your business’s next step starts here."}
            </h2>
            <p>
              {ro
                ? "Spune-ne ce îți dorești. Noi transformăm ideea într-o prezență online profesională, fără costuri de dezvoltare."
                : "Tell us what you need. We turn the idea into a professional online presence without a separate development charge."}
            </p>
          </div>
          {reference ? (
            <div className="ws-confirm" role="status">
              <Check />
              <h3>
                {ro
                  ? "Cererea ta este înregistrată."
                  : "Your request is recorded."}
              </h3>
              <p>
                {ro
                  ? "Echipa verifică brief-ul și revine cu pașii potriviți. Niciun abonament nu a fost activat și nicio plată nu a fost efectuată."
                  : "The team will review your brief and follow up. No subscription has been activated and no payment has been made."}
              </p>
              <small>
                {ro ? "Referință" : "Reference"}: {reference}
              </small>
            </div>
          ) : (
            <form ref={form} onSubmit={submit} className="ws-form">
              <div
                className="ws-form-progress"
                aria-label={ro ? "Progres formular" : "Form progress"}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    aria-current={step === i ? "step" : undefined}
                    className={i <= step ? "active" : ""}
                  >
                    {i + 1}
                    <small>
                      {
                        (ro
                          ? ["Website", "Afacere", "Contact"]
                          : ["Website", "Business", "Contact"])[i]
                      }
                    </small>
                  </span>
                ))}
              </div>
              <h3>
                {
                  (ro
                    ? [
                        "Ce fel de website îți imaginezi?",
                        "Spune-ne puțin despre afacerea ta",
                        "Cum te contactăm?",
                      ]
                    : [
                        "What website do you imagine?",
                        "Tell us a little about your business",
                        "How can we reach you?",
                      ])[step]
                }
              </h3>
              {step === 0 && (
                <>
                  <div className="ws-form-plans">
                    {plans.map((p) => (
                      <button
                        type="button"
                        aria-pressed={draft.planId === p.id}
                        key={p.id}
                        onClick={() => change("planId", p.id)}
                      >
                        {p.name}
                        <small>
                          {p.pages} {ro ? "pagini" : "pages"}
                        </small>
                      </button>
                    ))}
                  </div>
                  <p className="ws-muted">
                    {ro
                      ? "Un început clar, o structură extinsă sau o experiență premium? Poți schimba planul înainte de trimitere."
                      : "A focused start, extended structure or a premium experience? You can change the plan before submitting."}
                  </p>
                  <div className="ws-chips">
                    {(ro
                      ? [
                          "Afacere locală",
                          "Mai multe servicii",
                          "Experiență premium",
                        ]
                      : [
                          "Local business",
                          "Multiple services",
                          "Premium experience",
                        ]
                    ).map((v, i) => (
                      <button
                        type="button"
                        key={v}
                        onClick={() =>
                          change(
                            "planId",
                            (["start", "business", "premium"] as const)[i],
                          )
                        }
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <label>
                    {ro ? "Denumirea afacerii" : "Business name"}
                    <input
                      value={draft.company}
                      onChange={(e) => change("company", e.target.value)}
                      required
                      minLength={2}
                      maxLength={180}
                      autoComplete="organization"
                    />
                  </label>
                  <label>
                    {ro ? "Domeniu de activitate" : "Industry"}
                    <input
                      value={draft.industry}
                      onChange={(e) => change("industry", e.target.value)}
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder={
                        ro
                          ? "Ex. consultanță, HoReCa, construcții"
                          : "e.g. consulting, hospitality, construction"
                      }
                    />
                  </label>
                  <label>
                    {ro
                      ? "Website existent (opțional)"
                      : "Existing website (optional)"}
                    <input
                      value={draft.website}
                      onChange={(e) => change("website", e.target.value)}
                      maxLength={2048}
                      inputMode="url"
                      placeholder="https://"
                    />
                  </label>
                  <label>
                    {ro
                      ? "Ce vrei să obții?"
                      : "What would you like to achieve?"}
                    <textarea
                      value={draft.objectives}
                      onChange={(e) => change("objectives", e.target.value)}
                      required
                      minLength={3}
                      maxLength={1500}
                      rows={3}
                    />
                  </label>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="ws-summary">
                    {plans.find((p) => p.id === draft.planId)?.name} /{" "}
                    {draft.company}
                    <p>{draft.objectives}</p>
                  </div>
                  <label>
                    {ro ? "Nume" : "Name"}
                    <input
                      value={draft.name}
                      onChange={(e) => change("name", e.target.value)}
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    E-mail
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => change("email", e.target.value)}
                      required
                      maxLength={254}
                      autoComplete="email"
                    />
                  </label>
                  <label>
                    {ro ? "Telefon (opțional)" : "Phone (optional)"}
                    <input
                      type="tel"
                      value={draft.phone}
                      onChange={(e) => change("phone", e.target.value)}
                      maxLength={40}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="ws-checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      required
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      {ro
                        ? "Sunt de acord să fiu contactat pentru această solicitare. Am citit"
                        : "I agree to be contacted about this request. I have read the"}{" "}
                      <Link to={ro ? "/gdpr" : "/en/privacy"}>
                        {ro
                          ? "politica de confidențialitate"
                          : "privacy policy"}
                      </Link>
                      .
                    </span>
                  </label>
                  <Turnstile
                    action="website-subscription"
                    onToken={setToken}
                    resetKey={reset}
                  />
                  <p className="ws-note">
                    {ro
                      ? "Nu este necesar un cont. Abonarea și acceptarea termenilor sunt pași separați, după evaluarea cererii."
                      : "No account is required. Subscribing and accepting terms are separate steps after review."}
                  </p>
                </>
              )}
              <label className="hidden" aria-hidden="true">
                Fax
                <input name="company_fax" tabIndex={-1} autoComplete="off" />
              </label>
              {error && (
                <p className="ws-error" role="alert">
                  {error}
                </p>
              )}
              <div className="ws-actions">
                {step > 0 && (
                  <button
                    className="ws-button ws-button-ghost"
                    type="button"
                    onClick={() => setStep((v) => v - 1)}
                    disabled={busy}
                  >
                    {ro ? "Înapoi" : "Back"}
                  </button>
                )}
                <button className="ws-button" disabled={busy} type="submit">
                  {busy
                    ? ro
                      ? "Se înregistrează…"
                      : "Recording…"
                    : step < 2
                      ? ro
                        ? "Continuă"
                        : "Continue"
                      : ro
                        ? "Construiește-mi website-ul"
                        : "Build my website"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}
        </section>
        <section className="ws-wrap ws-section ws-faq">
          <div className="ws-section-head">
            <h2>
              {ro
                ? "Răspunsuri clare, înainte să începi."
                : "Clear answers before you begin."}
            </h2>
          </div>
          {(ro ? faq : faqEn).map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <Link
            to={
              ro
                ? "/servicii/website-prezentare-profesional"
                : "/en/services/professional-presentation-website"
            }
            className="ws-text-link"
          >
            {ro
              ? "Preferi dezvoltare cu plată unică? Descoperă Site Prezentare Profesional."
              : "Prefer a one-time development fee? Explore Business Websites."}{" "}
            →
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function WebsiteSubscriptionPage() {
  return (
    <ServiceContentProvider>
      <WebsiteSubscriptionContent />
    </ServiceContentProvider>
  );
}
