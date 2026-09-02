import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  CreditCard,
  Crown,
  HeartHandshake,
  LifeBuoy,
  MessageCircle,
  RefreshCw,
  Landmark,
  Receipt,
  Search,
  Server,
  Sparkle,
  TrendingUp,
  Users,
  Wallet,
  Shield,
  Zap,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import QuickNav from "@/components/site/QuickNav";
import Reveal from "@/components/site/Reveal";
import Footer from "@/components/site/Footer";
import logo from "@/assets/avyron-logo.jpg";
import { trackEvent } from "@/lib/analytics";
import CurrencySwitch from "@/components/site/CurrencySwitch";
import { useCurrency } from "@/hooks/useCurrency";

const WHATSAPP = "https://wa.me/40734605055?text=";

const CarePlansPage = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const { formatEur: fmt } = useCurrency(ro ? "ro-RO" : "en-IE");

  const faq = ro
    ? [
        { q: "Pot renunța oricând la pachet?", a: "Da. Abonamentul este lunar, fără contract pe termen lung. Ne anunți cu 15 zile înainte și oprim reînnoirea, iar tu păstrezi accesul complet la site și la datele tale." },
        { q: "Mentenanța include și hostingul?", a: "Da, hostingul este inclus în toate pachetele, împreună cu certificatul SSL. La pachetul Plus și peste, domeniul este gratuit în primul an." },
        { q: "Ce se întâmplă dacă site-ul cade?", a: "Monitorizarea uptime ne alertează automat. Intervenim imediat, restaurăm din backup dacă e nevoie și îți trimitem un scurt raport cu cauza și măsura luată." },
        { q: "Pot schimba pachetul mai târziu?", a: "Oricând, în ambele sensuri. Diferența se calculează proporțional din luna curentă, fără taxe suplimentare." },
        { q: "Mentenanța se aplică și pentru un site făcut de altcineva?", a: "Da. Facem întâi o evaluare gratuită a produsului actual, îți spunem ce trebuie corectat la preluare și abia apoi pornim abonamentul." },
        { q: "Cum funcționează reducerea anuală?", a: "Selectezi plata pe 12 luni și folosești codul ANUALAVY20. Reducerea de 20% se calculează numai pentru abonamentul anual ales, nu pentru alte produse sau servicii aflate în aceeași comandă." },
      ]
    : [
        { q: "Can I cancel at any time?", a: "Yes. The subscription is monthly, with no long-term contract. Let us know 15 days in advance and we stop the renewal — you keep full access to your site and data." },
        { q: "Does maintenance include hosting?", a: "Yes, hosting is included in every plan together with the SSL certificate. From the Plus plan up, the domain is free for the first year." },
        { q: "What happens if the site goes down?", a: "Uptime monitoring alerts us automatically. We intervene immediately, restore from backup if needed and send you a short report with the cause and the fix." },
        { q: "Can I change plans later?", a: "Any time, in both directions. The difference is prorated for the current month, with no extra fees." },
        { q: "Do you maintain a site built by someone else?", a: "Yes. We first run a free evaluation of your current product, tell you what needs fixing at handover and only then start the subscription." },
        { q: "How does the yearly discount work?", a: "Choose 12-month billing and use ANUALAVY20. The 20% discount applies only to the selected yearly subscription, never to other products or services in the same order." },
      ];

  const path = ro ? "/pachete-mentenanta" : "/en/care-plans";

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Pachete de mentenanță website — de la 50€/lună | Avyron"
      : "Website Care Plans — from €50/month | Avyron";
    const description = ro
      ? "Mentenanță website de la 50€/lună pentru site-uri de prezentare, bloguri, magazine online, instituții și platforme. Plată lunară sau anuală cu reducere 20%."
      : "Website care from €50/month for presentation sites, blogs, online stores, public institutions and platforms. Monthly or yearly billing with a 20% discount.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, offerCatalogLd, faqPageLd }]) => {
        setPageMeta({
          title,
          description,
          path,
          alternates: { ro: "/pachete-mentenanta", en: "/en/care-plans" },
        });
        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-service",
          serviceLd({
            name: ro ? "Pachete de mentenanță website" : "Website care plans",
            description,
            path,
            priceEur: 50,
          }),
        );
        setJsonLd(
          "ld-offercatalog",
          offerCatalogLd({
            name: ro ? "Pachete de mentenanță website" : "Website care plans",
            path,
            items: [
              {
                name: "Plus",
                description: ro
                  ? "Mentenanță esențială: actualizări, backup, monitorizare uptime, hosting inclus și suport prioritar."
                  : "Essential maintenance: updates, backups, uptime monitoring, hosting included and priority support.",
                priceEur: 50,
              },
              {
                name: "Pro",
                description: ro
                  ? "Colaborare lunară extinsă: backup zilnic, 10 modificări de conținut, rapoarte de trafic, optimizări SEO și social media."
                  : "Extended monthly collaboration: daily backups, 10 content changes, traffic reports, SEO tuning and social media.",
                priceEur: 150,
              },
              {
                name: "Pro Activ",
                description: ro
                  ? "Parteneriat complet: modificări nelimitate, SEO continuu, analiză de trafic, prioritate maximă și consultanță lunară."
                  : "Full partnership: unlimited changes, continuous SEO, traffic analysis, top priority and monthly consulting.",
                priceEur: 300,
              },
            ],
          }),
        );
        setJsonLd("ld-faq", faqPageLd(faq));
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
            { name: ro ? "Pachete de mentenanță" : "Care plans", path },
          ]),
        );
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ro]);

  const plans = [
    {
      key: "plus",
      name: "Plus",
      eur: 50,
      icon: Shield,
      level: ro ? "Nivel 1 · Colaborare de bază" : "Level 1 · Basic collaboration",
      bestFor: ro ? "Site-uri de prezentare, cataloage de produse și bloguri" : "Presentation websites, product catalogues and blogs",
      response: ro ? "Răspuns în 24h" : "24h response",
      value: ro ? "3 modificări / lună" : "3 changes / month",
      tagline: ro ? "Esențial pentru liniște" : "Essential peace of mind",
      accent: "from-pink-400 to-rose-600",
      text: "text-pink-500 dark:text-pink-400",
      features: ro
        ? [
            "Actualizări tehnice și de securitate",
            "Backup periodic + restaurare la cerere",
            "Monitorizare uptime 24/7",
            "3 modificări de text pe lună",
            "Hosting inclus și domeniu gratuit",
            "Suport prioritar pe email și WhatsApp",
          ]
        : [
            "Technical and security updates",
            "Periodic backups + restore on request",
            "24/7 uptime monitoring",
            "3 text changes per month",
            "Hosting included and free domain",
            "Priority support on email and WhatsApp",
          ],
      extras: ro
        ? ["Colaborare lunară, fără contract pe termen lung"]
        : ["Monthly collaboration, no long-term contract"],
    },
    {
      key: "pro",
      name: "Pro",
      eur: 150,
      icon: Zap,
      highlight: true,
      level: ro ? "Nivel 2 · Colaborare extinsă" : "Level 2 · Extended collaboration",
      bestFor: ro ? "Magazine online, primării și organizații cu actualizări frecvente" : "Online stores, municipalities and organisations with frequent updates",
      response: ro ? "Răspuns în 8h" : "8h response",
      value: ro ? "10 modificări / lună" : "10 changes / month",
      tagline: ro ? "Cel mai ales de clienți" : "Most chosen by clients",
      accent: "from-emerald-400 to-teal-600",
      text: "text-emerald-600 dark:text-emerald-400",
      features: ro
        ? [
            "Tot din pachetul Plus",
            "10 modificări de conținut (texte, imagini)",
            "Backup zilnic automat",
            "Raport lunar de trafic și statistici",
            "Optimizări de performanță și ajustări SEO",
            "Administrare rețele sociale (FB / IG / TikTok)",
          ]
        : [
            "Everything in Plus",
            "10 content changes (text, images)",
            "Automatic daily backups",
            "Monthly traffic and statistics report",
            "Performance optimizations and SEO tuning",
            "Social media management (FB / IG / TikTok)",
          ],
      extras: ro
        ? [
            "+7 modificări în plus față de Plus",
            "Backup zilnic (față de periodic)",
            "Raport lunar cu recomandări concrete",
            "Colaborare cu un om dedicat din echipă",
          ]
        : [
            "+7 more changes than Plus",
            "Daily backups (vs. periodic)",
            "Monthly report with concrete recommendations",
            "Collaboration with a dedicated team member",
          ],
    },
    {
      key: "proactiv",
      name: "Pro Activ",
      eur: 300,
      icon: Crown,
      level: ro ? "Nivel 3 · Parteneriat complet" : "Level 3 · Full partnership",
      bestFor: ro ? "Instituții publice, platforme și servicii digitale cu cerințe complexe" : "Public institutions, platforms and digital services with complex requirements",
      response: ro ? "Răspuns în 2h" : "2h response",
      value: ro ? "Modificări nelimitate" : "Unlimited changes",
      tagline: ro ? "Creștere continuă" : "Continuous growth",
      accent: "from-cyan-400 to-blue-600",
      text: "text-cyan-600 dark:text-cyan-400",
      features: ro
        ? [
            "Tot din pachetul Pro",
            "Modificări, actualizări și postări nelimitate",
            "Optimizare SEO continuă",
            "Monitorizare și analiză de trafic",
            "Intervenții rapide, prioritate maximă",
            "Consultanță digitală lunară",
          ]
        : [
            "Everything in Pro",
            "Unlimited changes, updates and posts",
            "Continuous SEO optimization",
            "Traffic monitoring and analytics",
            "Rapid interventions, top priority",
            "Monthly digital consulting",
          ],
      extras: ro
        ? [
            "Fără limită de modificări sau postări",
            "Prioritate maximă în coada de intervenții",
            "Ședință lunară de strategie (colaborare 1-la-1)",
            "Plan de creștere trimestrial, actualizat cu tine",
          ]
        : [
            "No cap on changes or posts",
            "Top priority in the intervention queue",
            "Monthly strategy session (1-on-1 collaboration)",
            "Quarterly growth plan, updated together with you",
          ],
    },
  ];

  const payments = ro
    ? [
        { icon: Landmark, title: "Transfer bancar (IBAN)", desc: "Îți emitem factura la început de lună, cu IBAN în RON sau EUR. Termen de plată 7 zile, fără comisioane din partea noastră." },
        { icon: CreditCard, title: "Plată cu cardul", desc: "Link securizat de plată, Visa / Mastercard, 3D Secure. Poți plăti de pe telefon, în câteva secunde." },
        { icon: RefreshCw, title: "Abonament recurent", desc: "Dacă vrei să nu te mai gândești la asta, activăm debitarea automată lunară. O oprești oricând, dintr-un singur mesaj." },
        { icon: Wallet, title: "Anual · −20%", desc: "Selectezi 12 luni și aplici ANUALAVY20. Reducerea se calculează exclusiv din abonamentul ales, nu din alte produse din coș." },
        { icon: Receipt, title: "Factură fiscală completă", desc: "Factură cu TVA pentru firme (PFA, SRL), livrată automat pe email și disponibilă în platforma internă Avyron." },
        { icon: Users, title: "Colaborare flexibilă", desc: "Schimbi pachetul, îl pui pe pauză sau îl reiei oricând. Colaborarea se adaptează la ritmul afacerii tale, nu invers." },
      ]
    : [
        { icon: Landmark, title: "Bank transfer (IBAN)", desc: "We issue the invoice at the start of the month, with a RON or EUR IBAN. 7-day payment term, no fees on our side." },
        { icon: CreditCard, title: "Card payment", desc: "Secure payment link, Visa / Mastercard, 3D Secure. Pay from your phone in seconds." },
        { icon: RefreshCw, title: "Recurring subscription", desc: "If you'd rather not think about it, we enable automatic monthly billing. Stop it any time with a single message." },
        { icon: Wallet, title: "Yearly · 20% off", desc: "Choose 12 months and apply ANUALAVY20. The discount is calculated only from the selected subscription, not from other cart products." },
        { icon: Receipt, title: "Full fiscal invoice", desc: "VAT invoice for companies, delivered automatically by email and available in the Avyron internal platform." },
        { icon: Users, title: "Flexible collaboration", desc: "Change, pause or resume your plan any time. The collaboration adapts to your business rhythm, not the other way around." },
      ];

  const pillars = ro
    ? [
        { icon: Server, title: "Uptime și hosting", desc: "Monitorizăm site-ul non-stop și intervenim înainte să observi tu că ceva nu merge." },
        { icon: Shield, title: "Securitate", desc: "Actualizări, certificat SSL, headere de securitate și protecție anti-spam pe formulare." },
        { icon: RefreshCw, title: "Backup și restaurare", desc: "Copii de siguranță periodice sau zilnice, cu restaurare rapidă în caz de incident." },
        { icon: Search, title: "SEO continuu", desc: "Ajustări tehnice și de conținut ca site-ul să rămână indexat corect și vizibil în Google." },
        { icon: BarChart3, title: "Rapoarte lunare", desc: "Trafic, surse, pagini populare și recomandări clare pentru luna următoare." },
        { icon: LifeBuoy, title: "Suport prioritar", desc: "Un canal direct cu echipa, fără tichete pierdute și fără termene vagi." },
      ]
    : [
        { icon: Server, title: "Uptime and hosting", desc: "We monitor your site around the clock and step in before you notice anything is wrong." },
        { icon: Shield, title: "Security", desc: "Updates, SSL certificate, security headers and anti-spam protection on forms." },
        { icon: RefreshCw, title: "Backups and restore", desc: "Periodic or daily backups with fast restore in case of an incident." },
        { icon: Search, title: "Ongoing SEO", desc: "Technical and content tuning so your site stays properly indexed and visible in Google." },
        { icon: BarChart3, title: "Monthly reports", desc: "Traffic, sources, top pages and clear recommendations for the month ahead." },
        { icon: LifeBuoy, title: "Priority support", desc: "A direct channel to the team — no lost tickets, no vague deadlines." },
      ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <QuickNav
        items={[
          { id: "pachete", label: ro ? "Pachete" : "Plans", icon: HeartHandshake },
          { id: "cum-functioneaza", label: ro ? "Cum funcționează" : "How it works", icon: RefreshCw },
          { id: "intrebari", label: ro ? "Întrebări" : "Questions", icon: MessageCircle },
          { id: "contact", label: ro ? "Contact" : "Contact", icon: ArrowRight },
        ]}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[42rem] rounded-full blur-3xl opacity-40 bg-emerald-400/15" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-6 sm:pt-8 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <PageBackLink
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            label={ro ? "Înapoi" : "Back"}
            title={ro ? "Înapoi la produse" : "Back to products"}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-foreground/15" />
              <ThemeToggle />
            </div>
            <a
              href={ro ? "/#hero" : "/en#hero"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-foreground/5 transition-colors"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 sm:size-8 rounded-md ring-1 ring-foreground/15" />
              <span className="font-display tracking-[0.2em] text-xs sm:text-sm">AVYRON</span>
            </a>
          </div>
        </div>

        <Breadcrumbs
          className="mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Costuri & Produse" : "Pricing & Products",
              path: ro ? "/costurisiproduse" : "/en/pricing",
            },
            { name: ro ? "Pachete de mentenanță" : "Care plans", path },
          ]}
        />

        {/* Hero */}
        <Reveal as="section" className="mt-8 sm:mt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-200">
            <HeartHandshake className="size-3.5" aria-hidden />
            {ro ? "Abonament lunar sau anual" : "Monthly or yearly subscription"}
          </div>
          <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
              {ro ? "Pachete de mentenanță" : "Website care plans"}
            </span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">
            {ro ? "Actualizări · Backup · Securitate · SEO · Suport" : "Updates · Backups · Security · SEO · Support"}
          </p>
          <p className="mt-5 max-w-2xl text-base md:text-lg text-foreground/75 leading-relaxed">
            {ro
              ? "Un site lăsat nesupravegheat se degradează: module învechite, backup-uri lipsă, viteză în scădere și poziții pierdute în Google. Printr-o colaborare lunară simplă, ținem produsul tău actualizat, sigur și rapid — cu un om dedicat din echipă care îți răspunde direct."
              : "An unattended site degrades: outdated modules, missing backups, dropping speed and lost Google rankings. Through a simple monthly collaboration we keep your product updated, secure and fast — with a dedicated person from the team who answers you directly."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={`${WHATSAPP}${encodeURIComponent(
                ro ? "Bună! Aș dori un pachet de mentenanță pentru site-ul meu." : "Hi! I'd like a care plan for my website.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ro ? "Cere un pachet de mentenanță pe WhatsApp" : "Request a care plan on WhatsApp"}
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "care_plans_hero" })}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              {ro ? "Vreau un pachet de mentenanță" : "I want a care plan"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <CurrencySwitch compact accent="emerald" />
          </div>
        </Reveal>

        {/* Plans */}
        <section id="pachete" className="mt-14 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Alege ritmul potrivit" : "Pick the right pace"}
            </h2>
          </Reveal>
          <div className="mt-7 grid md:grid-cols-3 gap-5 [perspective:1200px]">
            {plans.map((p, i) => (
              <Reveal key={p.key} delay={i * 70} as="article">
                <div
                  className={`group relative h-full rounded-2xl border p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:[transform:translateY(-6px)_rotateX(3deg)] ${
                    p.highlight
                      ? "border-emerald-300/40 bg-gradient-to-b from-emerald-500/10 to-foreground/[0.02] shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)]"
                      : "border-foreground/10 bg-foreground/[0.03] hover:border-foreground/25"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 text-background text-[10px] font-bold uppercase tracking-widest px-3 py-1 whitespace-nowrap">
                      {p.tagline}
                    </div>
                  )}
                  <div
                    className={`size-11 rounded-xl bg-gradient-to-br ${p.accent} grid place-items-center text-white transition-transform duration-300 group-hover:scale-110`}
                  >
                    <p.icon className="size-5" aria-hidden />
                  </div>
                  <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/50">{p.level}</p>
                  <h3 className="mt-1.5 font-display text-2xl font-extrabold">{p.name}</h3>
                  {!p.highlight && <p className="text-xs text-foreground/60 mt-1">{p.tagline}</p>}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold">{fmt(p.eur)}</span>
                    <span className="text-xs text-foreground/50">/{ro ? "lună" : "mo"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                    {ro ? `${fmt(p.eur * 12 * 0.8)}/an cu ANUALAVY20` : `${fmt(p.eur * 12 * 0.8)}/year with ANUALAVY20`}
                  </p>
                  <p className="mt-3 text-sm text-foreground/70 leading-relaxed">
                    <span className="font-semibold text-foreground/85">{ro ? "Potrivit pentru: " : "Best for: "}</span>
                    {p.bestFor}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.05] px-2.5 py-1 ${p.text}`}>
                      <TrendingUp className="size-3" aria-hidden />
                      {p.value}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.05] px-2.5 py-1 text-foreground/70">
                      <Clock className="size-3" aria-hidden />
                      {p.response}
                    </span>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className={`size-4 mt-0.5 shrink-0 ${p.text}`} aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className={`mt-5 rounded-xl border border-dashed p-3.5 ${p.highlight ? "border-emerald-300/40 bg-emerald-400/5" : "border-foreground/15 bg-foreground/[0.02]"}`}>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-foreground/55">
                      {ro ? "În plus față de nivelul anterior" : "On top of the previous level"}
                    </p>
                    <ul className="mt-2.5 space-y-2">
                      {p.extras.map((e) => (
                        <li key={e} className="flex items-start gap-2 text-xs text-foreground/80">
                          <Sparkle className={`size-3.5 mt-0.5 shrink-0 ${p.text}`} aria-hidden />
                          <span>{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`${WHATSAPP}${encodeURIComponent(
                      ro ? `Bună! Aș dori pachetul de mentenanță ${p.name}.` : `Hi! I'd like the ${p.name} care plan.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={ro ? `Alege pachetul ${p.name} pe WhatsApp` : `Choose the ${p.name} plan on WhatsApp`}
                    onClick={() => trackEvent("care_plan_select", { plan: p.key, price_eur: p.eur })}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                      p.highlight
                        ? "bg-emerald-400 text-background hover:bg-emerald-300"
                        : "border border-foreground/15 bg-foreground/[0.06] hover:bg-foreground/[0.12]"
                    }`}
                  >
                    {ro ? `Alege ${p.name}` : `Choose ${p.name}`}
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={220}>
            <div className="mt-6 rounded-2xl border border-emerald-300/30 bg-emerald-400/[0.07] p-4 text-sm text-foreground/75">
              <strong className="font-mono text-emerald-700 dark:text-emerald-300">ANUALAVY20</strong>{" "}
              {ro
                ? "reduce cu 20% numai abonamentul selectat pentru 12 luni. Orice alt produs sau serviciu din aceeași comandă își păstrează prețul integral."
                : "takes 20% off only the subscription selected for 12 months. Every other product or service in the same order keeps its full price."}
            </div>
          </Reveal>
        </section>

        {/* Pillars */}
        <section id="cum-functioneaza" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Ce facem lună de lună" : "What we do every month"}
            </h2>
          </Reveal>
          <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 50} as="article">
                <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-foreground/[0.06]">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-600 grid place-items-center text-white transition-transform duration-300 group-hover:scale-110">
                    <p.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display font-bold">{p.title}</h3>
                  <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Payments */}
        <section id="intrebari" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Plata, simplă și transparentă" : "Payment, simple and transparent"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm md:text-base text-foreground/70 leading-relaxed">
              {ro
                ? "Nicio surpriză pe factură și nicio bătaie de cap la plată. Alegi metoda care ți se potrivește, iar restul colaborării rămâne despre site-ul tău, nu despre birocrație."
                : "No surprises on the invoice and no payment hassle. You pick the method that suits you, and the rest of our collaboration stays about your site, not paperwork."}
            </p>
          </Reveal>
          <div className="mt-7 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map((m, i) => (
              <Reveal key={m.title} delay={i * 50} as="article">
                <div className="group h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:bg-foreground/[0.06]">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 grid place-items-center text-white transition-transform duration-300 group-hover:scale-110">
                    <m.icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display font-bold">{m.title}</h3>
                  <p className="mt-2 text-sm text-foreground/70 leading-relaxed">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <p className="mt-5 text-xs text-foreground/60 inline-flex items-start gap-2">
              <Shield className="size-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {ro
                ? "Plățile cu cardul sunt procesate securizat de partenerul nostru de plăți — Avyron nu stochează datele cardului tău."
                : "Card payments are processed securely by our payment partner — Avyron never stores your card details."}
            </p>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="contact" className="mt-16 scroll-mt-28">
          <Reveal>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold">
              {ro ? "Întrebări frecvente" : "Frequently asked questions"}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-3">
            {faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 50}>
                <details className="group rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-5 py-4 backdrop-blur transition-colors hover:border-foreground/20 open:border-foreground/25">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold list-none">
                    <span>{f.q}</span>
                    <span
                      aria-hidden
                      className="shrink-0 grid place-items-center size-6 rounded-full border border-foreground/15 text-emerald-400 transition-transform duration-300 group-open:rotate-90"
                    >
                      <ArrowRight className="size-3.5" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-foreground/70 leading-relaxed">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal as="section" className="mt-16">
          <div className="rounded-3xl border border-emerald-300/25 bg-gradient-to-br from-foreground/[0.06] to-transparent p-8 md:p-10 text-center backdrop-blur relative overflow-hidden">
            <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full blur-3xl bg-emerald-400/15" />
            <div className="relative">
              <h2 className="font-display text-2xl md:text-3xl font-extrabold">
                {ro ? "Nu ești sigur ce pachet ți se potrivește?" : "Not sure which plan fits?"}
              </h2>
              <p className="mt-3 text-sm md:text-base text-foreground/70 max-w-xl mx-auto">
                {ro
                  ? "Îți evaluăm gratuit site-ul actual și îți recomandăm pachetul potrivit — fără obligații."
                  : "We evaluate your current site for free and recommend the right plan — no obligations."}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  href={`${WHATSAPP}${encodeURIComponent(
                    ro ? "Bună! Aș dori o recomandare de pachet de mentenanță." : "Hi! I'd like a care plan recommendation.",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ro ? "Scrie-ne pe WhatsApp" : "Message us on WhatsApp"}
                  onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "care_plans_cta" })}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
                <a
                  href="mailto:contact@avyron.ro"
                  aria-label={ro ? "Trimite email la contact@avyron.ro" : "Email contact@avyron.ro"}
                  onClick={() => trackEvent("contact_click", { method: "email", location: "care_plans_cta" })}
                  className="inline-flex items-center gap-2 rounded-full bg-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
                >
                  contact@avyron.ro
                </a>
              </div>
              <p className="mt-5 text-[11px] text-foreground/50 inline-flex items-center gap-1.5">
                <Clock className="size-3" aria-hidden />
                {ro ? "Răspundem în maxim 24 de ore" : "We reply within 24 hours"}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
      <Footer />
    </main>
  );
};

export default CarePlansPage;
