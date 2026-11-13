import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, ListChecks, MessageSquareText } from "lucide-react";
import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import Footer from "@/components/site/Footer";
import ContactBar from "@/components/site/ContactBar";
import PortfolioCarousel from "@/components/site/PortfolioCarousel";
import Turnstile from "@/components/site/Turnstile";
import { useLang } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiUrl } from "@/lib/apiBase";
import { normalizeExternalLink } from "@/shared/externalUrl";
import { setJsonLd, setPageMeta } from "@/lib/seo";
import { trackEvent } from "@/lib/analytics";
import {
  defaultWebsitePlans,
  formatWebsitePrice,
  WEBSITE_FIRST_PAYMENT_DAYS,
  WEBSITE_SUBSCRIPTION_PATH,
  type WebsitePlan,
  type WebsitePlanId,
} from "@/shared/websiteSubscriptions";
import SubscriptionJourney from "./SubscriptionJourney";
import SubscriptionPlans from "./SubscriptionPlans";
import WebsiteOfferDetails from "./WebsiteOfferDetails";
import WebsiteOfferHero from "./WebsiteOfferHero";
import WebsiteOfferNav from "./WebsiteOfferNav";
import WebsiteOfferSocial from "./WebsiteOfferSocial";
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
const planDetails = {
  start: { ro: "Servicii, date de contact și o prezență online clară.", en: "Services, contact details and a clear online presence." },
  business: { ro: "Mai multe servicii, studii de caz și formulare dedicate.", en: "More services, case studies and tailored forms." },
  premium: { ro: "Structură amplă, portofoliu și integrări mai complexe.", en: "A larger site, portfolio and more complex integrations." },
};
const objectives = {
  ro: ["Prezentare profesională", "Cereri de ofertă", "Programări online", "Apeluri sau WhatsApp", "Portofoliu de lucrări", "Vizibilitate în Google"],
  en: ["Professional business presentation", "Quote requests", "Online bookings", "Calls or WhatsApp", "A portfolio of work", "Visibility on Google"],
};
const hasObjective = (text: string, value: string) => text.split("\n").some(line => line.trim() === value);
const faq = [
  [
    "Dezvoltarea este într-adevăr inclusă?",
    "Da. Dezvoltarea website-ului costă 0 lei. Plătești lunar pentru hosting, securitate și mentenanță. Dacă vrei să folosești propriul domeniu, îl furnizezi tu. Primești prețul și condițiile în ofertă.",
  ],
  [
    "Când plătesc prima lună?",
    `Vezi și aprobi site-ul final. Prima plată pentru hosting, securitate și mentenanță devine disponibilă la ${WEBSITE_FIRST_PAYMENT_DAYS} de zile de la aprobare, în contul tău AVYRON.`,
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
    "Urmărim perioadele lunare achitate. După 12 luni poți solicita trecerea la mentenanță standard. Nu schimbăm automat pachetul și nu introducem taxe de dezvoltare sau penalități implicite.",
  ],
  [
    "Pot renunța la serviciile lunare?",
    "Condițiile de anulare și continuare sunt configurate și afișate înainte de acceptarea electronică. Ciclul de 12 luni nu reprezintă, prin el însuși, o perioadă minimă obligatorie.",
  ],
  [
    "Sunt incluse căsuțe de e-mail găzduite?",
    "Numărul de adrese este prevăzut în plan. Activarea depinde de domeniul tău și de furnizorul de e-mail disponibil. Eventualele costuri și tipul serviciului sunt confirmate înainte de activare.",
  ],
  [
    "Pot conecta programările, harta sau WhatsApp?",
    "Da, putem propune aceste integrări în funcție de cum lucrezi. Spune-ne ce canale sau furnizori folosești deja. Compatibilitatea, ce include pachetul și eventualele costuri ale furnizorilor se clarifică în ofertă.",
  ],
];
const faqEn = [
  [
    "Is development really included?",
    "Yes. Development costs RON 0. You pay monthly for hosting, security and maintenance. If you want to use your own domain, you provide it. You receive the price and terms in your quote.",
  ],
  [
    "When do I pay for the first month?",
    `You review and approve the finished website. Your first payment for hosting, security and maintenance becomes available in your AVYRON account ${WEBSITE_FIRST_PAYMENT_DAYS} days after approval.`,
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
  [
    "Can I add booking, a map or WhatsApp?",
    "Yes, we can propose these integrations based on how you work. Tell us which channels or providers you already use. We confirm compatibility, what the plan includes and any provider fees in the quote.",
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
          Math.min(2, Math.trunc(Number(sessionStorage.getItem(draftKey + ":step"))) || 0),
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
    [reset, setReset] = useState(0);
  const key = useRef("");
  const pageRoot = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const websiteInput = useRef<HTMLInputElement>(null);
  const focusStep = useRef(false);
  useEffect(() => {
    const root = pageRoot.current;
    const hero = root?.querySelector(".ws-hero");
    const footer = root?.querySelector("footer");
    if (!root || !hero || !footer) return;
    const update = () => {
      const visible = hero.getBoundingClientRect().bottom <= 0
        && footer.getBoundingClientRect().top >= window.innerHeight;
      document.documentElement.toggleAttribute("data-website-contact-visible", visible);
    };
    const observer = new IntersectionObserver(update);
    observer.observe(hero);
    observer.observe(footer);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.documentElement.removeAttribute("data-website-contact-visible");
    };
  }, []);
  const selectedPlan = plans.find(plan => plan.id === draft.planId) ?? plans[0];
  const steps = ro ? ["Pachet", "Proiect", "Contact"] : ["Plan", "Project", "Contact"];
  const moveStep = (next: number) => {
    focusStep.current = true;
    setError("");
    setStep(next);
  };
  useEffect(() => {
    if (!focusStep.current) return;
    focusStep.current = false;
    const heading = stepHeading.current;
    heading?.focus({ preventScroll: true });
    const top = heading?.getBoundingClientRect().top;
    if (top !== undefined && (top < 90 || top > window.innerHeight - 100))
      heading?.scrollIntoView({ block: "start" });
  }, [step]);
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
        ? "Creare site de prezentare | 0 lei dezvoltare · AVYRON"
        : "Custom business website | No development fee · AVYRON",
      description: ro
        ? "Site de prezentare pentru afaceri, cu design personalizat și 0 lei pentru dezvoltare. Hosting, securitate și mentenanță de la 199 lei/lună."
        : "Get a custom business website with no development fee. Hosting, security and maintenance from RON 199 per month. Request an AVYRON quote.",
      path,
      alternates: WEBSITE_SUBSCRIPTION_PATH,
    });
    setJsonLd("website-subscription", {
      "@type": "Service",
      "@id": "https://avyron.ro" + path + "#service",
      name: ro ? "Creare site de prezentare cu 0 lei pentru dezvoltare" : "Custom business website with no development fee",
      serviceType: ro ? "Design, dezvoltare și mentenanță pentru site-uri de prezentare" : "Design, development and maintenance for business websites",
      url: "https://avyron.ro" + path,
      provider: { "@id": "https://avyron.ro/#organization" },
      description: ro
        ? "Dezvoltarea site-ului costă 0 lei. Hostingul, securitatea și mentenanța costă de la 199 lei pe lună. Domeniul propriu este furnizat de client."
        : "Website development costs RON 0. Hosting, security and maintenance start at RON 199 per month. The client provides any custom domain.",
    });
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
    if (busy) return;
    setDraft((d) => ({ ...d, planId: id }));
    setStep(0);
    setError("");
    const brief = document.getElementById("website-brief");
    brief?.focus({ preventScroll: true });
    brief?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };
  const change = <K extends keyof typeof empty,>(field: K, value: (typeof empty)[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));
  const toggleObjective = (value: string) => setDraft(current => {
    const text = current.objectives;
    if (hasObjective(text, value)) {
      return { ...current, objectives: text.split("\n").filter(line => line.trim() !== value).join("\n") };
    }
    const next = text + (text && !text.endsWith("\n") ? "\n" : "") + value;
    return next.length <= 1500 ? { ...current, objectives: next } : current;
  });
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    const address = draft.website.trim();
    const website = address && !/^[a-z][a-z\d+.-]*:/i.test(address) ? "https://" + address : address;
    if (step === 1 && website && (!normalizeExternalLink(website) || (!address.includes("://") && !address.split("/")[0].includes(".")))) {
      setError(ro ? "Introdu un domeniu valid, de exemplu afacere.ro, sau lasă câmpul gol." : "Enter a valid domain, such as business.com, or leave this field blank.");
      websiteInput.current?.focus();
      return;
    }
    if (step === 1 && (draft.company.trim().length < 2 || draft.industry.trim().length < 2 || draft.objectives.trim().length < 3)) {
      setError(ro ? "Adaugă numele afacerii, domeniul și câteva cuvinte despre obiectivul tău." : "Add your business name, industry and a few words about your goal.");
      return;
    }
    if (step < 2) {
      moveStep(step + 1);
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
    const trap = new FormData(e.currentTarget).get("company_website_confirmation") || "";
    const retryMessage = ro
      ? "Nu am putut confirma trimiterea. Detaliile tale rămân în formular și poți reîncerca."
      : "We couldn’t confirm your request. Your details are still in the form and you can retry.";
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
          planId: selectedPlan.id,
          website,
          consent: true,
          lang,
          token,
          trap,
        }),
      });
      const data = (await r.json()) as {
        error?: { code?: string };
        reference?: string;
      };
      if (data.error?.code === "invalid_website") {
        moveStep(1);
        setError(ro ? "Verifică adresa site-ului din pasul Proiect." : "Check the website address in the Project step.");
        return;
      }
      if (!r.ok || !data.reference) {
        setError(data.error?.code === "captcha_failed"
          ? (ro ? "Completează verificarea anti-spam și încearcă din nou." : "Complete the anti-spam check and retry.")
          : retryMessage);
        setReset(value => value + 1);
        return;
      }
      setReference(data.reference);
      try {
        sessionStorage.removeItem(draftKey);
        sessionStorage.removeItem(draftKey + ":key");
        sessionStorage.removeItem(draftKey + ":step");
      } catch {
        /* A confirmed request must not appear failed if storage is blocked. */
      }
      trackEvent("website_subscription_request", { plan: draft.planId });
    } catch {
      setError(retryMessage);
      setReset((v) => v + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ws-page" ref={pageRoot}>
      <WebsiteOfferNav ro={ro} />
      <main>
        <WebsiteOfferHero ro={ro} plans={plans} />

        <WebsiteOfferDetails ro={ro} />
        <SubscriptionJourney ro={ro} />
        <SubscriptionPlans lang={lang} plans={plans} onChoose={choose} />
        <PortfolioCarousel
          lang={lang}
          carouselKey="premium-website"
          heading={{
            eyebrow: ro ? "LUCRĂRI AVYRON" : "AVYRON WORK",
            title: ro ? "Site-uri create de noi" : "Websites we created",
            description: ro
              ? "Explorează proiecte realizate pentru afaceri din domenii diferite."
              : "Explore projects built for businesses in different industries.",
          }}
        />
        <section
          className="ws-wrap ws-section ws-brief-section"
          id="website-brief"
          aria-labelledby="ws-brief-title"
          tabIndex={-1}
        >
          <div className="ws-brief-intro">
            <div className="ws-section-head">
              <h2 id="ws-brief-title">{ro ? "Hai să conturăm site-ul afacerii tale" : "Let’s plan a website for your business"}</h2>
              <p>{ro
                ? "Câteva detalii despre ce faci și ce ai vrea să obții ne ajută să-ți propunem paginile, funcțiile și pachetul potrivit."
                : "A few details about what you do and what you want to achieve help us suggest the right pages, features and plan."}</p>
            </div>
            <div className="ws-brief-delivery">
              <h3>{ro ? "Ce primești după ce ne scrii" : "What you’ll get after you contact us"}</h3>
              <ul role="list">
                <li><ListChecks size={18} aria-hidden="true" />{ro ? "O propunere de pagini și funcții, pe baza obiectivelor tale." : "A proposal for pages and features based on your goals."}</li>
                <li><ClipboardCheck size={18} aria-hidden="true" />{ro ? "Costul lunar și ce acoperă pentru site-ul tău." : "The monthly cost and what it covers for your website."}</li>
                <li><MessageSquareText size={18} aria-hidden="true" />{ro ? "Pașii de la aprobarea propunerii până la lansare." : "The steps from approving the proposal to launching."}</li>
              </ul>
            </div>
          </div>
          {reference ? (
            <div className="ws-confirm" role="status">
              <Check aria-hidden="true" />
              <h3>{ro ? "Cererea ta este înregistrată." : "Your request is recorded."}</h3>
              <p>{ro ? "Îți mulțumim. Citim detaliile și revenim la adresa de e-mail pe care ai lăsat-o." : "Thank you. We’ll review the details and reply to the email address you provided."}</p>
              <small>{ro ? "Referință" : "Reference"}: {reference}</small>
            </div>
          ) : (
            <form onSubmit={submit} className="ws-form" aria-labelledby="ws-quote-step">
              <ol className="ws-form-progress" aria-label={ro ? "Pașii cererii" : "Request steps"} role="list">
                {steps.map((label, index) => (
                  <li key={label} aria-current={step === index ? "step" : undefined} data-complete={index < step || undefined}>
                    <span aria-hidden="true">{index < step ? <Check size={13} /> : index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              <h3 ref={stepHeading} id="ws-quote-step" tabIndex={-1}>
                {(ro ? ["Alege pachetul de pornire", "Ce vrei să facă site-ul?", "Unde îți trimitem propunerea?"]
                  : ["Choose a starting plan", "What should the site do?", "Where should we send your proposal?"])[step]}
              </h3>
              {step === 0 && (
                <>
                  <p className="ws-form-hint">{ro ? "Alegerea de aici ne ajută să pregătim propunerea. Confirmăm pachetul împreună." : "Your choice helps us prepare the proposal. We’ll confirm the plan together."}</p>
                  <div className="ws-form-plans" role="group" aria-label={ro ? "Pachete pentru site" : "Website plans"}>
                    {plans.map(plan => (
                      <button type="button" aria-pressed={selectedPlan.id === plan.id} key={plan.id} onClick={() => change("planId", plan.id)}>
                        <span className="ws-plan-choice-name">{plan.name}<small>{plan.pages} {ro ? "pagini" : "pages"}</small></span>
                        <span className="ws-plan-choice-description">{planDetails[plan.id]?.[lang] ?? plan.tagline[lang]}</span>
                        <span className="ws-plan-choice-rate">{plan.priceMinor !== null && <>{formatWebsitePrice(plan.priceMinor, plan.currency, ro)}<small> / {ro ? "lună" : "month"}</small></>}</span>
                        <span className="ws-plan-choice-mark" aria-hidden="true">{selectedPlan.id === plan.id && <Check size={15} />}</span>
                      </button>
                    ))}
                  </div>
                  <p className="ws-form-payment">
                    <ClipboardCheck size={19} aria-hidden="true" />
                    <span>
                      <strong>{ro ? "Vezi site-ul final înainte să plătești." : "See your finished website before you pay."}</strong>{" "}
                      {ro ? `Prima plată lunară devine disponibilă după ${WEBSITE_FIRST_PAYMENT_DAYS} de zile de la aprobarea ta.` : `Your first monthly payment becomes available ${WEBSITE_FIRST_PAYMENT_DAYS} days after you approve the website.`}
                    </span>
                  </p>
                </>
              )}
              {step === 1 && (
                <>
                  <div className="ws-form-fields">
                    <label>
                      {ro ? "Denumirea afacerii" : "Business name"}
                      <input value={draft.company} onChange={e => change("company", e.target.value)} required minLength={2} maxLength={180} autoComplete="organization" />
                    </label>
                    <label>
                      {ro ? "Domeniu de activitate" : "Industry"}
                      <input value={draft.industry} onChange={e => change("industry", e.target.value)} required minLength={2} maxLength={120} placeholder={ro ? "Ex. cabinet, construcții" : "e.g. practice, construction"} />
                    </label>
                  </div>
                  <label>
                    {ro ? "Site actual" : "Current website"} <small>{ro ? "opțional" : "optional"}</small>
                    <input ref={websiteInput} value={draft.website} onChange={e => change("website", e.target.value)} maxLength={2048} inputMode="url" autoComplete="url" placeholder={ro ? "afacere.ro" : "business.com"} />
                  </label>
                  <div className="ws-objectives">
                    <label htmlFor="ws-objectives">{ro ? "Ce vrei să obții cu site-ul?" : "What would you like the site to achieve?"}</label>
                    <div className="ws-chips" role="group" aria-label={ro ? "Obiective sugerate" : "Suggested goals"}>
                      {objectives[lang].map(value => {
                        const selected = hasObjective(draft.objectives, value);
                        const separator = draft.objectives && !draft.objectives.endsWith("\n") ? 1 : 0;
                        return (
                          <button key={value} type="button" aria-pressed={selected} disabled={!selected && draft.objectives.length + value.length + separator > 1500} onClick={() => toggleObjective(value)}>
                            {selected ? <Check size={14} aria-hidden="true" /> : <span aria-hidden="true">+</span>}{value}
                          </button>
                        );
                      })}
                    </div>
                    <textarea id="ws-objectives" value={draft.objectives} onChange={e => change("objectives", e.target.value)} required minLength={3} maxLength={1500} rows={4}
                      placeholder={ro ? "De exemplu: vreau ca oamenii să vadă lucrări recente și să îmi poată trimite detaliile unui proiect." : "For example: I want people to see recent work and send me the details of their project."} />
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div className="ws-summary">
                    <div><strong>{draft.company}</strong><span>{selectedPlan.name} · {draft.industry}</span></div>
                    <button className="ws-summary-edit" type="button" disabled={busy} onClick={() => moveStep(1)}>{ro ? "Editează proiectul" : "Edit project"}</button>
                  </div>
                  <div className="ws-form-fields">
                    <label>
                      {ro ? "Nume" : "Name"}
                      <input value={draft.name} onChange={e => change("name", e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
                    </label>
                    <label>
                      E-mail
                      <input type="email" value={draft.email} onChange={e => change("email", e.target.value)} required maxLength={254} autoComplete="email" />
                    </label>
                  </div>
                  <label>
                    {ro ? "Telefon" : "Phone"} <small>{ro ? "opțional" : "optional"}</small>
                    <input type="tel" value={draft.phone} onChange={e => change("phone", e.target.value)} maxLength={40} autoComplete="tel" />
                  </label>
                  <label className="ws-checkbox">
                    <input type="checkbox" checked={consent} required onChange={e => setConsent(e.target.checked)} />
                    <span>{ro ? "Sunt de acord să fiu contactat pentru această solicitare. Am citit" : "I agree to be contacted about this request. I have read the"}{" "}
                      <Link to={ro ? "/gdpr" : "/en/privacy"}>{ro ? "politica de confidențialitate" : "privacy policy"}</Link>.
                    </span>
                  </label>
                  <Turnstile action="website-subscription" onToken={setToken} resetKey={reset} />
                  <p className="ws-note">{ro ? "Poți trimite cererea fără cont și fără plată." : "You can send this request without an account or a payment."}</p>
                </>
              )}
              <div className="ws-form-trap" hidden aria-hidden="true">
                <input name="company_website_confirmation" tabIndex={-1} autoComplete="off" />
              </div>
              {error && <p className="ws-error" role="alert">{error}</p>}
              <div className="ws-actions ws-form-actions">
                {step > 0 && (
                  <button className="ws-button ws-button-ghost" type="button" disabled={busy} onClick={() => moveStep(step - 1)}>
                    <ArrowLeft size={16} aria-hidden="true" />{ro ? "Înapoi" : "Back"}
                  </button>
                )}
                <button className="ws-button" disabled={busy} type="submit">
                  {busy ? (ro ? "Se trimite…" : "Sending…") : (ro
                    ? ["Continuă cu proiectul", "Continuă cu datele de contact", "Trimite cererea"][step]
                    : ["Continue to project", "Continue to contact details", "Send request"][step])}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          )}
        </section>
        <WebsiteOfferSocial ro={ro} />
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
      <ContactBar surface="website" lang={lang} />
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
