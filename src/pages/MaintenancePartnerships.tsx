import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Activity, ArrowRight, BadgePercent, BarChart3, CalendarClock, Check, Clock, CreditCard, Cpu,
  Globe, HeartHandshake, LifeBuoy, ListChecks, MessageCircle, PenLine, Receipt, RefreshCw, Search,
  Server, Shield, ShoppingBag, Smartphone, Sparkles, Wallet,
} from "lucide-react";
import Nav from "@/components/site/Nav";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Reveal from "@/components/site/Reveal";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import PaymentMethods from "@/components/site/PaymentMethods";
import QuickNav, { type QuickNavItem } from "@/components/site/QuickNav";
import { useLang } from "@/i18n/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { useDualPrice } from "@/hooks/useDualPrice";
import { hasStoredCurrency } from "@/hooks/useCurrency";
import {
  SUBSCRIPTION_CATEGORIES, SUBSCRIPTION_PATH, lowestPlanPriceCents, planBySku,
  type SubscriptionCategory, type SubscriptionPlan,
} from "@/data/subscriptionPlans";
import SectionBackdrop from "@/components/site/subscriptions/SectionBackdrop";
import SectionBlend from "@/components/site/subscriptions/SectionBlend";
import ParticleLayer from "@/components/site/subscriptions/ParticleLayer";
import PlanCarousel from "@/components/site/subscriptions/PlanCarousel";
import PlanProgressBar from "@/components/site/subscriptions/PlanProgressBar";
import SpaceLoader from "@/components/site/subscriptions/SpaceLoader";

const Footer = lazy(() => import("@/components/site/Footer"));
const ContactBar = lazy(() => import("@/components/site/ContactBar"));
const PlanCheckout = lazy(() => import("@/components/site/subscriptions/PlanCheckout"));

const WHATSAPP = "https://wa.me/40734605055?text=";

const CATEGORY_ICONS = {
  globe: Globe,
  store: ShoppingBag,
  pen: PenLine,
  cpu: Cpu,
  smartphone: Smartphone,
} as const;

const sectionId = (key: string) => `abonamente-${key}`;

const MaintenancePartnerships = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { pathname, hash } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { primary, secondary, converted, setCurrency } = useDualPrice(ro ? "ro-RO" : "en-IE");
  const [selection, setSelection] = useState<{ plan: SubscriptionPlan; category: SubscriptionCategory } | null>(null);
  const [booted, setBooted] = useState(false);

  const path = ro ? SUBSCRIPTION_PATH.ro : SUBSCRIPTION_PATH.en;
  const cheapest = lowestPlanPriceCents();

  useEffect(() => setBooted(true), []);

  // Abonamentele se facturează în lei, deci vizitatorul care nu a ales încă o
  // monedă vede prețul real, nu o conversie.
  useEffect(() => {
    if (!hasStoredCurrency()) setCurrency("RON");
  }, [setCurrency]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Revenirea din autentificare (`?plan=sku`) redeschide direct abonamentul ales.
  useEffect(() => {
    const sku = searchParams.get("plan");
    if (!sku) return;
    const found = planBySku(sku);
    if (found) setSelection({ plan: found.plan, category: found.category });
    const next = new URLSearchParams(searchParams);
    next.delete("plan");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const tryScroll = (attempt = 0) => {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (attempt < 10) window.setTimeout(() => tryScroll(attempt + 1), 90);
    };
    tryScroll();
  }, [hash]);

  const faq = useMemo(() => (ro
    ? [
        { q: "Pot renunța oricând la abonament?", a: "Da. Toate abonamentele sunt lunare, fără contract pe termen lung. Ne anunți cu 15 zile înainte, oprim reînnoirea, iar tu păstrezi accesul complet la produs și la datele tale." },
        { q: "De ce prețurile sunt afișate în lei?", a: "Facturăm în lei, așa că prețul din abonament este cel real. Poți comuta afișarea în euro oricând — conversia folosește cursul de referință al Băncii Centrale Europene, actualizat zilnic de serverul nostru." },
        { q: "Pot schimba treapta mai târziu?", a: "Oricând, în ambele sensuri. Diferența se calculează proporțional cu zilele rămase din luna curentă, fără taxe de trecere." },
        { q: "Ce câștig dacă plătesc anual?", a: "Plata pentru 12 luni se face o singură dată, iar promoția anuală activă îți reduce factura. Vezi reducerea exactă în pasul de selectare, înainte să confirmi ceva." },
        { q: "Am mai multe produse. Se cumulează abonamentele?", a: "Da, iar din al doilea abonament activ aplicăm o reducere de fidelitate. Ne scrii ce produse ai și îți facem o singură ofertă, cu o singură factură." },
        { q: "Faceți mentenanță și pentru un produs făcut de altcineva?", a: "Da. Facem întâi o evaluare gratuită, îți spunem exact ce trebuie corectat la preluare și abia apoi pornim abonamentul. Nu preluăm proiecte fără să știm în ce stare sunt." },
        { q: "Ce se întâmplă dacă produsul cade noaptea?", a: "Monitorizarea ne alertează automat. La treptele Pro Activ intervenim și în afara programului, restaurăm din backup dacă e nevoie și îți trimitem un raport cu ce s-a întâmplat și ce am schimbat ca să nu se repete." },
        { q: "Ce înseamnă „modificări nelimitate”?", a: "Înseamnă că nu numărăm cererile obișnuite de conținut și de întreținere. Sunt excluse proiectele noi, refacerea completă a produsului sau funcționalitățile mari, care se estimează separat." },
      ]
    : [
        { q: "Can I cancel at any time?", a: "Yes. Every plan is monthly, with no long-term contract. Tell us 15 days in advance, we stop the renewal and you keep full access to your product and data." },
        { q: "Why are prices shown in lei?", a: "We invoice in RON, so the price on the plan is the real one. You can switch the display to euro at any time — the conversion uses the European Central Bank reference rate, refreshed daily by our server." },
        { q: "Can I change tier later?", a: "Any time, in both directions. The difference is prorated across the days left in the current month, with no switching fees." },
        { q: "What do I gain by paying annually?", a: "You pay for 12 months once, and the active annual promotion lowers the invoice. You see the exact discount in the selection step, before confirming anything." },
        { q: "I have several products. Do plans stack?", a: "They do, and from the second active plan we apply a loyalty discount. Tell us what you run and we build a single offer with a single invoice." },
        { q: "Do you maintain a product built by someone else?", a: "Yes. We first run a free evaluation, tell you exactly what needs fixing at handover and only then start the subscription. We never take over a project blind." },
        { q: "What happens if the product goes down at night?", a: "Monitoring alerts us automatically. On Pro Activ tiers we step in outside working hours too, restore from backup if needed and send you a report on what happened and what we changed so it doesn't repeat." },
        { q: "What does \"unlimited changes\" mean?", a: "It means we don't count ordinary content and upkeep requests. New projects, full rebuilds or large features are excluded and estimated separately." },
      ]), [ro]);

  useEffect(() => {
    // Pragul de preț vine din catalog, ca titlul să nu rămână în urmă la o
    // schimbare de tarif.
    const fromPrice = Math.round(cheapest / 100);
    const title = ro
      ? `Mentenanță și colaborări — abonamente de la ${fromPrice} lei/lună | Avyron`
      : `Maintenance and partnerships — plans from ${fromPrice} RON/month | Avyron`;
    const description = ro
      ? "Abonamente lunare de mentenanță pentru site de prezentare, magazin online, blog profesional, agent AI și aplicații web sau mobile. Actualizări, backup, monitorizare, SEO și suport prioritar, cu prețuri în lei și euro."
      : "Monthly maintenance plans for presentation websites, online stores, professional blogs, AI agents and web or mobile apps. Updates, backups, monitoring, SEO and priority support, priced in RON and EUR.";

    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, subscriptionCatalogLd, faqPageLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: SUBSCRIPTION_PATH.ro, en: SUBSCRIPTION_PATH.en },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd("ld-service", serviceLd({
          name: ro ? "Mentenanță și colaborări digitale" : "Digital maintenance and partnerships",
          description,
          path,
        }));
        setJsonLd("ld-subscriptions", subscriptionCatalogLd({
          name: ro ? "Abonamente de mentenanță Avyron" : "Avyron maintenance plans",
          path,
          currency: "RON",
          items: SUBSCRIPTION_CATEGORIES.flatMap((category) =>
            category.plans.map((plan) => ({
              name: `${category.copy[lang].title} — ${plan.name}`,
              description: plan.copy[lang].summary,
              price: plan.priceCents / 100,
              sku: plan.sku,
              category: category.copy[lang].title,
            })),
          ),
        }));
        setJsonLd("ld-faq", faqPageLd(faq));
        setJsonLd("ld-breadcrumb", breadcrumbLd([
          { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
          { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
          { name: ro ? "Mentenanță & Colaborări" : "Maintenance & Partnerships", path },
        ]));
      },
    );
  }, [ro, lang, path, faq, cheapest]);

  const steps = ro
    ? [
        { icon: Search, title: "Alegi produsul", desc: "Fiecare tip de produs are propriile trepte, pentru că un magazin online și un blog nu au aceleași nevoi." },
        { icon: CalendarClock, title: "Alegi treapta", desc: "Apeși abonamentul și se deschide un mini-dashboard cu specificațiile exacte: timp de răspuns, backup, ore incluse." },
        { icon: CreditCard, title: "Activezi din cont", desc: "Te autentifici, alegi ritmul de facturare și abonamentul apare în contul tău, la Produse & Servicii." },
        { icon: BarChart3, title: "Urmărești din platformă", desc: "Abonamentul se leagă de proiectul tău din platforma Avyron, unde vezi starea, intervențiile și raportul de la final de lună." },
      ]
    : [
        { icon: Search, title: "Pick your product", desc: "Each product type has its own tiers, because an online store and a blog don't have the same needs." },
        { icon: CalendarClock, title: "Pick your tier", desc: "Tap a plan and a mini dashboard opens with the exact specs: response time, backups, included hours." },
        { icon: CreditCard, title: "Activate from your account", desc: "Sign in, pick the billing rhythm and the plan shows up in your account under Products & Services." },
        { icon: BarChart3, title: "Follow it from the platform", desc: "The plan attaches to your project in the Avyron platform, where you see its state, the interventions and the end-of-month report." },
      ];

  const pillars = ro
    ? [
        { icon: Server, title: "Uptime și infrastructură", desc: "Monitorizăm produsul non-stop și intervenim înainte să observi tu că ceva nu merge." },
        { icon: Shield, title: "Securitate", desc: "Actualizări, certificate, headere de securitate și protecție anti-spam pe fiecare formular." },
        { icon: RefreshCw, title: "Backup și restaurare", desc: "Copii de siguranță periodice sau zilnice, cu restaurare rapidă în caz de incident." },
        { icon: Search, title: "Vizibilitate continuă", desc: "Ajustări tehnice și de conținut, ca produsul să rămână indexat corect și găsit de clienți." },
        { icon: Activity, title: "Rapoarte care se citesc", desc: "Trafic, surse, pagini populare și recomandări clare, fără grafice pe care nu le folosește nimeni." },
        { icon: LifeBuoy, title: "Suport prioritar", desc: "Un canal direct cu echipa, fără tichete pierdute și fără termene vagi." },
      ]
    : [
        { icon: Server, title: "Uptime and infrastructure", desc: "We watch your product around the clock and step in before you notice anything is wrong." },
        { icon: Shield, title: "Security", desc: "Updates, certificates, security headers and anti-spam protection on every form." },
        { icon: RefreshCw, title: "Backups and restore", desc: "Periodic or daily backups with fast restore in case of an incident." },
        { icon: Search, title: "Continuous visibility", desc: "Technical and content tuning so your product stays indexed and found by customers." },
        { icon: Activity, title: "Reports people actually read", desc: "Traffic, sources, top pages and clear recommendations — no charts nobody uses." },
        { icon: LifeBuoy, title: "Priority support", desc: "A direct channel to the team, with no lost tickets and no vague deadlines." },
      ];

  const billing = ro
    ? [
        { icon: RefreshCw, title: "Lunar, fără obligații", desc: "Factura pleacă la început de lună. Oprești reînnoirea cu 15 zile înainte, printr-un singur mesaj." },
        { icon: BadgePercent, title: "Anual, cu reducere", desc: "Alegi 12 luni la selectarea abonamentului și reducerea activă se aplică automat, înainte să confirmi." },
        { icon: Receipt, title: "Factură fiscală completă", desc: "Factură cu TVA pentru firme, trimisă automat pe email și disponibilă oricând în contul tău." },
        { icon: Wallet, title: "Prețuri în lei, afișate și în euro", desc: "Facturăm în lei. Conversia în euro folosește cursul BCE și este doar informativă." },
      ]
    : [
        { icon: RefreshCw, title: "Monthly, no strings", desc: "The invoice goes out at the start of the month. Stop the renewal 15 days ahead with a single message." },
        { icon: BadgePercent, title: "Annual, with a discount", desc: "Pick 12 months when selecting the plan and the active discount applies automatically, before you confirm." },
        { icon: Receipt, title: "Full fiscal invoice", desc: "VAT invoice for companies, emailed automatically and always available in your account." },
        { icon: Wallet, title: "Priced in RON, shown in EUR too", desc: "We invoice in RON. The euro conversion uses the ECB rate and is informative only." },
      ];

  const stats = ro
    ? [
        { value: "5", label: "tipuri de produse" },
        { value: "15", label: "trepte de colaborare" },
        { value: "1h", label: "cel mai scurt timp de răspuns" },
        { value: "0", label: "contracte pe termen lung" },
      ]
    : [
        { value: "5", label: "product types" },
        { value: "15", label: "collaboration tiers" },
        { value: "1h", label: "fastest response time" },
        { value: "0", label: "long-term contracts" },
      ];

  const quickNavItems: QuickNavItem[] = [
    { id: "prezentare", label: ro ? "Prezentare" : "Overview", icon: HeartHandshake },
    { id: "cum-functioneaza", label: ro ? "Cum funcționează" : "How it works", icon: ListChecks },
    ...SUBSCRIPTION_CATEGORIES.map((category) => ({
      id: sectionId(category.key),
      label: category.copy[lang].title,
      icon: CATEGORY_ICONS[category.icon],
    })),
    { id: "comparatie", label: ro ? "Comparație" : "Comparison", icon: BarChart3 },
    { id: "facturare", label: ro ? "Facturare" : "Billing", icon: CreditCard },
    { id: "faq", label: "FAQ", icon: MessageCircle },
    { id: "contact", label: "Contact", icon: ArrowRight },
  ];

  const progressSections = SUBSCRIPTION_CATEGORIES.map((category) => ({
    id: sectionId(category.key),
    hue: category.theme.hue,
  }));

  return (
    <>
      {booted && <SpaceLoader />}
      <PlanProgressBar sections={progressSections} />
      <Nav />
      <QuickNav items={quickNavItems} />

      <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        {/* Hero */}
        <section id="prezentare" className="relative scroll-mt-28 overflow-hidden pt-28 sm:pt-32">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-48 left-1/2 size-[46rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
            <div className="absolute right-[8%] top-24 size-72 rounded-full bg-brand-2/10 blur-3xl" />
            <div className="absolute left-[6%] top-56 size-64 rounded-full bg-brand-3/10 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                backgroundSize: "60px 60px",
                maskImage: "radial-gradient(ellipse at top, black 25%, transparent 72%)",
                WebkitMaskImage: "radial-gradient(ellipse at top, black 25%, transparent 72%)",
              }}
            />
          </div>
          <ParticleLayer hue="264 90% 62%" density={60} />

          <div className="relative mx-auto max-w-6xl px-4 pb-10">
            <Breadcrumbs
              items={[
                { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
                { name: ro ? "Costuri & Produse" : "Pricing & Products", path: ro ? "/costurisiproduse" : "/en/pricing" },
                { name: ro ? "Mentenanță & Colaborări" : "Maintenance & Partnerships", path },
              ]}
            />

            <Reveal className="mt-7 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-brand">
                <HeartHandshake className="size-3.5" aria-hidden />
                {ro ? "Abonamente lunare" : "Monthly plans"}
              </div>
              <h1 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl">
                {ro ? "Mentenanță și " : "Maintenance and "}
                <span className="bg-gradient-to-r from-brand via-brand-3 to-brand-2 bg-clip-text text-transparent">
                  {ro ? "colaborări lunare" : "monthly partnerships"}
                </span>
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.24em] text-foreground/50">
                {ro ? "Site · Magazin · Blog · Agent AI · Aplicații" : "Website · Store · Blog · AI agent · Apps"}
              </p>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 md:text-lg">
                {ro
                  ? "Un produs digital lăsat nesupravegheat nu se strică dintr-odată — se degradează încet, până când începe să te coste. Alegi tipul de produs, alegi treapta de colaborare și primești în fiecare lună aceleași lucruri: actualizări, backup, monitorizare, îmbunătățiri și un om din echipă care îți răspunde direct."
                  : "A digital product left unattended doesn't break all at once — it degrades slowly, until it starts costing you. Pick your product type, pick your collaboration tier and get the same things every month: updates, backups, monitoring, improvements and a real person from the team who answers you directly."}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`#${sectionId("site")}`}
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-6 py-3 text-sm font-bold text-white shadow-elev transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                >
                  {ro ? "Vezi abonamentele" : "See the plans"}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                </a>
                <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.04] px-4 py-2.5 text-sm backdrop-blur">
                  <span className="text-foreground/60">{ro ? "de la" : "from"}</span>
                  <strong className="font-display text-base tabular-nums">{primary(cheapest)}</strong>
                  <span className="text-foreground/45">
                    {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondary(cheapest)}
                  </span>
                </span>
                <CurrencySwitch />
              </div>

              {/* Sări direct la tipul tău de produs */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {SUBSCRIPTION_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.icon];
                  const min = Math.min(...category.plans.map((plan) => plan.priceCents));
                  return (
                    <a
                      key={category.key}
                      href={`#${sectionId(category.key)}`}
                      className={`group inline-flex items-center gap-2.5 rounded-2xl border ${category.theme.border} bg-foreground/[0.03] px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-foreground/[0.07]`}
                    >
                      <span className={`grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${category.theme.from} ${category.theme.to} text-white transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span className="text-xs font-semibold">{category.copy[lang].title}</span>
                        <span className="font-mono text-[10px] tabular-nums text-foreground/45">
                          {ro ? "de la" : "from"} {primary(min)}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>

              <dl className="mx-auto mt-9 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-3 py-4 backdrop-blur transition-colors hover:border-foreground/20">
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="font-display text-2xl font-extrabold">{stat.value}</span>
                      <span className="mt-1 block text-[11px] leading-tight text-foreground/55">{stat.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>

        {/* Cum funcționează */}
        <section id="cum-functioneaza" className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-14">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-extrabold md:text-3xl">
              {ro ? "Cum funcționează" : "How it works"}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-foreground/70 md:text-base">
              {ro
                ? "Patru pași, fără telefoane de vânzare și fără oferte care ajung peste o săptămână."
                : "Four steps, with no sales calls and no quotes that arrive a week later."}
            </p>
          </Reveal>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 60} as="li" className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand/30">
                  <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-brand/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-0" />
                  <div className="relative flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <step.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="relative mt-4 font-display font-bold">{step.title}</h3>
                  <p className="relative mt-2 text-sm leading-relaxed text-foreground/70">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Abonamente pe tip de produs */}
        {SUBSCRIPTION_CATEGORIES.map((category, index) => {
          const Icon = CATEGORY_ICONS[category.icon];
          const copy = category.copy[lang];
          const next = SUBSCRIPTION_CATEGORIES[index + 1];
          const min = Math.min(...category.plans.map((plan) => plan.priceCents));
          const max = Math.max(...category.plans.map((plan) => plan.priceCents));
          const topPlan = category.plans[category.plans.length - 1];
          const highlights = topPlan.specs.slice(0, 3);
          return (
            <div key={category.key}>
              <section id={sectionId(category.key)} className="relative scroll-mt-24 overflow-hidden py-14 sm:py-16">
                <SectionBackdrop theme={category.theme} />
                <div className="relative mx-auto max-w-6xl px-4">
                  <Reveal className="text-center">
                    <span className={`inline-flex items-center gap-2 rounded-full border ${category.theme.border} bg-foreground/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${category.theme.text}`}>
                      <Icon className="size-3.5" aria-hidden />
                      {copy.kicker}
                    </span>
                    <h2 className="mt-4 font-display text-2xl font-extrabold md:text-3xl">{copy.title}</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-foreground/75 md:text-base">{copy.lead}</p>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px]">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border ${category.theme.border} bg-foreground/[0.05] px-3 py-1.5 font-semibold tabular-nums ${category.theme.text}`}>
                        {primary(min)} – {primary(max)} / {ro ? "lună" : "mo"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/12 bg-foreground/[0.03] px-3 py-1.5 tabular-nums text-foreground/60">
                        {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondary(min)} – {secondary(max)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-foreground/55">
                      {highlights.map((spec) => (
                        <span key={spec.key} className="inline-flex items-center gap-1.5">
                          <span aria-hidden className={`size-1 rounded-full bg-gradient-to-br ${category.theme.from} ${category.theme.to}`} />
                          {ro ? spec.ro : spec.en}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3" aria-hidden />
                        {ro ? "3 trepte" : "3 tiers"}
                      </span>
                    </div>
                  </Reveal>

                  <div className="mt-9">
                    <PlanCarousel
                      category={category}
                      onSelect={(plan, planCategory) => {
                        trackEvent("subscription_select", { sku: plan.sku, category: planCategory.key, tier: plan.tier });
                        setSelection({ plan, category: planCategory });
                      }}
                    />
                  </div>

                  <Reveal delay={80}>
                    <p className="mx-auto mt-6 flex max-w-2xl items-start justify-center gap-2 text-center text-xs leading-relaxed text-foreground/55">
                      <Check className={`mt-0.5 size-3.5 shrink-0 ${category.theme.text}`} aria-hidden />
                      <span>{copy.note}</span>
                    </p>
                  </Reveal>
                </div>
              </section>
              {next && <SectionBlend from={category.theme.hue} to={next.theme.hue} />}
            </div>
          );
        })}

        {/* Comparație rapidă */}
        <section id="comparatie" className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-14">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-extrabold md:text-3xl">
              {ro ? "Toate abonamentele, dintr-o privire" : "Every plan, at a glance"}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-foreground/70 md:text-base">
              {ro
                ? "Prețuri lunare în lei, cu echivalentul în euro. Aceleași valori se aplică în cont și pe factură."
                : "Monthly prices in RON, with the euro equivalent. The same values apply in your account and on the invoice."}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 overflow-x-auto rounded-3xl border border-foreground/10 bg-foreground/[0.02] backdrop-blur">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <caption className="sr-only">
                  {ro ? "Prețuri lunare pe tip de produs și treaptă de colaborare" : "Monthly prices by product type and collaboration tier"}
                </caption>
                <thead>
                  <tr className="border-b border-foreground/10 text-left">
                    <th scope="col" className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
                      {ro ? "Produs" : "Product"}
                    </th>
                    {["Plus", "Pro", "Pro Activ"].map((tier) => (
                      <th key={tier} scope="col" className="px-4 py-3 font-display text-xs font-bold">
                        {tier}
                        {tier === "Pro" && (
                          <span className="ml-1.5 rounded-full bg-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand">
                            {ro ? "popular" : "popular"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SUBSCRIPTION_CATEGORIES.map((category) => {
                    const Icon = CATEGORY_ICONS[category.icon];
                    return (
                      <tr key={category.key} className="border-b border-foreground/[0.07] transition-colors last:border-0 hover:bg-foreground/[0.03]">
                        <th scope="row" className="px-4 py-3 text-left font-semibold">
                          <a href={`#${sectionId(category.key)}`} className="inline-flex items-center gap-2 hover:underline">
                            <span className={`grid size-7 place-items-center rounded-lg bg-gradient-to-br ${category.theme.from} ${category.theme.to} text-white`}>
                              <Icon className="size-3.5" aria-hidden />
                            </span>
                            {category.copy[lang].title}
                          </a>
                        </th>
                        {category.plans.map((plan) => (
                          <td key={plan.key} className="px-4 py-3">
                            <span className="block font-display font-bold tabular-nums">{primary(plan.priceCents)}</span>
                            <span className="block text-[10px] text-foreground/45">
                              {converted ? `${ro ? "facturat" : "billed"} ` : "≈ "}{secondary(plan.priceCents)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* Ce facem lună de lună */}
        <section className="relative mx-auto max-w-6xl px-4 pb-14">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-extrabold md:text-3xl">
              {ro ? "Ce facem lună de lună" : "What we do every month"}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-foreground/70 md:text-base">
              {ro
                ? "Indiferent de produs și de treaptă, acestea sunt lucrurile care se întâmplă în fiecare lună, fără să le ceri."
                : "Whatever the product and tier, these are the things that happen every month without you asking."}
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((pillar, index) => (
              <Reveal key={pillar.title} delay={index * 50} as="article" className="h-full">
                <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:bg-foreground/[0.06]">
                  <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <pillar.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display font-bold">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/70">{pillar.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Facturare și plată */}
        <section id="facturare" className="relative scroll-mt-28 overflow-hidden py-14">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-0 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-6xl px-4">
            <Reveal>
              <h2 className="text-center font-display text-2xl font-extrabold md:text-3xl">
                {ro ? "Facturare simplă și transparentă" : "Simple, transparent billing"}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-foreground/70 md:text-base">
                {ro
                  ? "Pe factură nu apare niciodată ceva ce nu ai văzut aici. Alegi ritmul, noi ne ocupăm de rest."
                  : "Nothing appears on the invoice that you haven't seen here. You pick the rhythm, we handle the rest."}
              </p>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {billing.map((item, index) => (
                <Reveal key={item.title} delay={index * 50} as="article" className="h-full">
                  <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:bg-foreground/[0.06]">
                    <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-2 to-brand text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="size-5" aria-hidden />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/70">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <div className="mt-6">
                <PaymentMethods compact />
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative mx-auto max-w-3xl scroll-mt-28 px-4 py-12">
          <Reveal>
            <h2 className="text-center font-display text-2xl font-extrabold md:text-3xl">
              {ro ? "Întrebări frecvente" : "Frequently asked questions"}
            </h2>
          </Reveal>
          <div className="mt-7 space-y-3">
            {faq.map((item, index) => (
              <Reveal key={item.q} delay={index * 40}>
                <details className="group rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-4 backdrop-blur transition-colors hover:border-foreground/20 open:border-brand/25">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                    <span>{item.q}</span>
                    <span
                      aria-hidden
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-foreground/15 text-brand transition-transform duration-300 group-open:rotate-90"
                    >
                      <ArrowRight className="size-3.5" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/70">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <Reveal as="section" className="mx-auto max-w-4xl scroll-mt-28 px-4 pb-16">
          <div id="contact" className="relative scroll-mt-28 overflow-hidden rounded-3xl border border-brand/25 bg-gradient-to-br from-foreground/[0.07] to-transparent p-8 text-center backdrop-blur md:p-10">
            <div aria-hidden className="absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
            <ParticleLayer hue="264 90% 62%" density={26} />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-brand">
                <Sparkles className="size-3.5" aria-hidden />
                {ro ? "Evaluare gratuită" : "Free evaluation"}
              </span>
              <h2 className="mt-4 font-display text-2xl font-extrabold md:text-3xl">
                {ro ? "Nu ești sigur ce treaptă ți se potrivește?" : "Not sure which tier fits you?"}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/70 md:text-base">
                {ro
                  ? "Îți evaluăm gratuit produsul actual și îți recomandăm treapta potrivită. Dacă nu ai nevoie de abonament, îți spunem și asta."
                  : "We evaluate your current product for free and recommend the right tier. If you don't need a plan at all, we'll tell you that too."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`${WHATSAPP}${encodeURIComponent(
                    ro ? "Bună! Aș dori o recomandare de abonament de mentenanță." : "Hi! I'd like a maintenance plan recommendation.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "subscriptions_cta" })}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1ebe5a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
                <a
                  href="mailto:contact@avyron.ro"
                  onClick={() => trackEvent("contact_click", { method: "email", location: "subscriptions_cta" })}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition-all hover:-translate-y-0.5 hover:bg-foreground/90"
                >
                  contact@avyron.ro
                </a>
                <Link
                  to={ro ? "/costurisiproduse" : "/en/pricing"}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:bg-foreground/[0.1]"
                >
                  {ro ? "Vezi produsele" : "See the products"}
                </Link>
              </div>
              <p className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-foreground/50">
                <Clock className="size-3" aria-hidden />
                {ro ? "Răspundem în maximum 24 de ore" : "We reply within 24 hours"}
                <span aria-hidden>·</span>
                {ro ? `Abonamente de la ${primary(cheapest)} pe lună` : `Plans from ${primary(cheapest)} per month`}
              </p>
            </div>
          </div>
        </Reveal>

        <Suspense fallback={<div className="h-40" />}>
          <Footer />
          <ContactBar />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {selection && (
          <PlanCheckout selection={selection} pagePath={pathname} onClose={() => setSelection(null)} />
        )}
      </Suspense>
    </>
  );
};

export default MaintenancePartnerships;
