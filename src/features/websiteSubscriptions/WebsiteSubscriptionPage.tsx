import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Code2,
  Globe2,
  HeartHandshake,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ServiceContentProvider from "@/components/services/ServiceContentProvider";
import Footer from "@/components/site/Footer";
import PortfolioCarousel from "@/components/site/PortfolioCarousel";
import Turnstile from "@/components/site/Turnstile";
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
import SubscriptionJourney from "./SubscriptionJourney";
import SubscriptionPlans from "./SubscriptionPlans";
import WebsiteOfferHero from "./WebsiteOfferHero";
import WebsiteOfferNav from "./WebsiteOfferNav";
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
    "Da. Dezvoltarea website-ului costă 0 lei. Plătești lunar pentru hosting, securitate și mentenanță. Dacă vrei să folosești propriul domeniu, îl furnizezi tu. Primești prețul și condițiile în ofertă.",
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
];
const faqEn = [
  [
    "Is development really included?",
    "Yes. Development costs RON 0. You pay monthly for hosting, security and maintenance. If you want to use your own domain, you provide it. You receive the price and terms in your quote.",
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
    [reset, setReset] = useState(0);
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
        ? "Site de prezentare cu 0 lei pentru dezvoltare | AVYRON"
        : "Custom business website, no development fee | AVYRON",
      description: ro
        ? "Site de prezentare cu design personalizat și 0 lei pentru dezvoltare. Hosting, securitate și mentenanță de la 199 lei/lună. Cere o ofertă AVYRON."
        : "Get a custom business website with no development fee. Hosting, security and maintenance from RON 199 per month. Request an AVYRON quote.",
      path,
      alternates: WEBSITE_SUBSCRIPTION_PATH,
    });
    setJsonLd("website-subscription", {
      "@type": "Service",
      "@id": "https://avyron.ro" + path + "#service",
      name: ro ? "Site de prezentare cu 0 lei pentru dezvoltare" : "Custom business website with no development fee",
      serviceType: ro ? "Dezvoltare și mentenanță site de prezentare" : "Business website development and maintenance",
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
    setDraft((d) => ({ ...d, planId: id }));
    setStep(0);
    const brief = document.getElementById("website-brief");
    brief?.focus({ preventScroll: true });
    brief?.scrollIntoView({
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
  const benefits = [
    { icon: Code2, title: ro ? "Dezvoltare inclusă" : "Development included", text: ro ? "Construim site-ul și paginile prevăzute în oferta ta." : "We build your site and the pages listed in your quote." },
    { icon: Sparkles, title: ro ? "Design personalizat" : "Custom design", text: ro ? "Aspectul și conținutul reflectă identitatea afacerii tale." : "The look and content reflect your business identity." },
    { icon: Check, title: ro ? "Lansare după aprobare" : "Launch after approval", text: ro ? "Verifici site-ul înainte să îl publicăm." : "Review the site before we publish it." },
    { icon: MonitorSmartphone, title: ro ? "Adaptat pentru telefon" : "Designed for mobile", text: ro ? "Text ușor de citit și butoane la îndemână pe ecrane mici." : "Readable text and easy-to-reach controls on small screens." },
    { icon: ShieldCheck, title: ro ? "Găzduire și securitate" : "Hosting and security", text: ro ? "Site-ul este găzduit și accesibil printr-o conexiune HTTPS." : "Your site is hosted and served over HTTPS." },
    { icon: RefreshCw, title: ro ? "Modificări lunare" : "Monthly changes", text: ro ? "Poți solicita actualizări de conținut în limita planului." : "Request content updates within your plan allowance." },
    { icon: Globe2, title: ro ? "Profiluri și contact" : "Social profiles and contact", text: ro ? "Legăm site-ul de profilurile sociale și de canalele alese de tine." : "We link your site to your social profiles and chosen contact channels." },
    { icon: HeartHandshake, title: ro ? "Proiectul într-un singur cont" : "One account for your project", text: ro ? "Urmărești proiectul și trimiți cereri de modificare din cont." : "Track your project and request changes from your account." },
  ];
  return (
    <div className="ws-page">
      <WebsiteOfferNav ro={ro} />
      <main>
        <WebsiteOfferHero ro={ro} />

        <section className="ws-wrap ws-section ws-value" id="website-benefits" aria-labelledby="ws-benefits-title">
          <div className="ws-section-head">
            <h2 id="ws-benefits-title">{ro ? "Simplu de la început" : "Simple from the start"}</h2>
            <p>{ro ? "De la aprobarea designului până la actualizări, știi ce poți verifica și ce poți cere echipei." : "From approving the design to requesting updates, you know what you can review and what the team can handle for you."}</p>
          </div>
          <div className="ws-benefits">
            {benefits.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <span className="ws-icon"><Icon size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ws-wrap ws-section" id="website-personalisation" aria-labelledby="ws-personal-title">
          <div className="ws-personal">
            <div className="ws-section-head">
              <h2 id="ws-personal-title">{ro ? "Personal, nu generic" : "Built around your business"}</h2>
              <p>{ro
                ? "Fiecare site pornește de la activitatea ta, de la produsele sau serviciile pe care le oferi și de la felul în care clienții aleg. Construim structura, designul și funcțiile în jurul acestor particularități."
                : "Each site starts with what your business does, the products or services you offer and how your customers choose. We shape its structure, design and features around those details."}</p>
            </div>
            <dl className="ws-personal-details">
              {(ro ? [
                ["Ce oferi", "Organizăm paginile în jurul serviciilor, produselor și informațiilor care contează pentru clienți."],
                ["Cum te prezinți", "Culorile, imaginile și tonul pornesc de la identitatea afacerii tale."],
                ["Cum te contactează", "Alegem un traseu potrivit activității tale, de la o programare până la o cerere de ofertă."],
              ] : [
                ["What you offer", "We organise pages around the services, products and information your customers need."],
                ["How you present yourself", "Colours, imagery and tone reflect your business identity."],
                ["How customers reach you", "We design a next step that suits your business, from booking to requesting a quote."],
              ]).map(([title, detail]) => <div key={title}><dt>{title}</dt><dd>{detail}</dd></div>)}
            </dl>
          </div>
        </section>

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
          <div className="ws-section-head">
            <h2 id="ws-brief-title">{ro ? "Cere o ofertă pentru site-ul tău" : "Request a quote for your website"}</h2>
            <p>{ro
              ? "Spune-ne ce faci și ce ai vrea să poată face clienții pe site. Revenim cu o propunere, costul lunar și pașii de lansare."
              : "Tell us what you do and what customers should be able to do on your site. We’ll follow up with a proposal, monthly cost and launch steps."}</p>
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
                  ? "Echipa verifică brief-ul și revine cu o propunere. Trimiterea cererii nu activează servicii și nu inițiază nicio plată."
                  : "The team will review your brief and follow up with a proposal. Sending a request does not activate any services or initiate a payment."}
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
                      ? "Poți trimite cererea fără cont. Decizi dacă accepți condițiile după ce primești oferta."
                      : "You can send the request without an account. You decide whether to accept the terms once you receive the quote."}
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
