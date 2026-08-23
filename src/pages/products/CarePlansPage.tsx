import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  Crown,
  HeartHandshake,
  LifeBuoy,
  MessageCircle,
  RefreshCw,
  Search,
  Server,
  Shield,
  Zap,
} from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import Reveal from "@/components/site/Reveal";
import logo from "@/assets/avyron-logo.jpg";

const WHATSAPP = "https://wa.me/40734605055?text=";

const CarePlansPage = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const [currency, setCurrency] = useState<"EUR" | "RON">("EUR");
  const [rate, setRate] = useState(5);

  useEffect(() => {
    let cancelled = false;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.functions
        .invoke("get-exchange-rate")
        .then(({ data, error }) => {
          if (cancelled || error) return;
          const r = (data as { rate?: number } | null)?.rate;
          if (typeof r === "number" && r > 0) setRate(Number(r.toFixed(4)));
        })
        .catch(() => {
          /* keep fallback */
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const path = ro ? "/pachete-mentenanta" : "/en/care-plans";

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Pachete de mentenanță website — de la 100€/lună | Avyron"
      : "Website Care Plans — from €100/month | Avyron";
    const description = ro
      ? "Mentenanță website lunară: actualizări, backup, monitorizare uptime, securitate, SEO continuu și suport prioritar. Pachete Plus, Pro și Pro Activ de la 100€/lună."
      : "Monthly website maintenance: updates, backups, uptime monitoring, security, ongoing SEO and priority support. Plus, Pro and Pro Active plans from €100/month.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd, serviceLd, faqPageLd }]) => {
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
            priceEur: 100,
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

  const fmt = (eur: number) => (currency === "EUR" ? `${eur}€` : `${Math.round(eur * rate)} RON`);

  const plans = [
    {
      key: "plus",
      name: "Plus",
      eur: 100,
      icon: Shield,
      tagline: ro ? "Esențial pentru liniște" : "Essential peace of mind",
      accent: "from-pink-400 to-rose-600",
      text: "text-pink-400",
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
    },
    {
      key: "pro",
      name: "Pro",
      eur: 150,
      icon: Zap,
      highlight: true,
      tagline: ro ? "Cel mai ales de clienți" : "Most chosen by clients",
      accent: "from-emerald-400 to-teal-600",
      text: "text-emerald-400",
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
    },
    {
      key: "proactiv",
      name: "Pro Activ",
      eur: 300,
      icon: Crown,
      tagline: ro ? "Creștere continuă" : "Continuous growth",
      accent: "from-cyan-400 to-blue-600",
      text: "text-cyan-400",
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
    },
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
          <Link
            to={ro ? "/costurisiproduse" : "/en/pricing"}
            title={ro ? "Înapoi la produse" : "Back to products"}
            className="group inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-foreground/[0.04] backdrop-blur pl-2 pr-3.5 py-1.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:border-foreground/30 transition-all duration-300"
          >
            <span className="grid place-items-center size-5 rounded-full bg-foreground text-background transition-transform duration-300 group-hover:-translate-x-0.5">
              <ArrowLeft className="size-3" aria-hidden />
            </span>
            <span className="font-mono uppercase tracking-[0.18em] text-[10px]">
              {ro ? "Produse" : "Products"}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
              <LangSwitch />
              <span aria-hidden className="w-px h-3 bg-foreground/15" />
              <ThemeToggle />
            </div>
            <Link
              to={ro ? "/" : "/en"}
              aria-label={ro ? "Acasă" : "Home"}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-foreground/5 transition-colors"
            >
              <img src={logo} alt="Avyron" width={32} height={32} className="size-7 sm:size-8 rounded-md ring-1 ring-foreground/15" />
              <span className="font-display tracking-[0.2em] text-xs sm:text-sm">AVYRON</span>
            </Link>
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
            {ro ? "Abonament lunar" : "Monthly subscription"}
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
              ? "Un site lăsat nesupravegheat se degradează: module învechite, backup-uri lipsă, viteză în scădere și poziții pierdute în Google. Noi ținem produsul tău actualizat, sigur și rapid, lună de lună."
              : "An unattended site degrades: outdated modules, missing backups, dropping speed and lost Google rankings. We keep your product updated, secure and fast, month after month."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={`${WHATSAPP}${encodeURIComponent(
                ro ? "Bună! Aș dori un pachet de mentenanță pentru site-ul meu." : "Hi! I'd like a care plan for my website.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              {ro ? "Vreau un pachet de mentenanță" : "I want a care plan"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </a>
            <div className="inline-flex rounded-full border border-foreground/15 bg-foreground/[0.04] p-1 backdrop-blur">
              {(["EUR", "RON"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  aria-pressed={currency === c}
                  className={`px-4 py-1.5 text-xs font-semibold tracking-widest rounded-full transition-all ${
                    currency === c ? "bg-emerald-400 text-background" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-foreground/40 inline-flex items-center gap-2">
            <RefreshCw className="size-3" aria-hidden />
            {ro ? `Curs orientativ 1€ ≈ ${rate.toFixed(2)} RON` : `Indicative rate 1€ ≈ ${rate.toFixed(2)} RON`}
          </p>
        </Reveal>

        {/* Plans */}
        <section className="mt-14">
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
                  <h3 className="mt-5 font-display text-2xl font-extrabold">{p.name}</h3>
                  {!p.highlight && <p className="text-xs text-foreground/50 mt-1">{p.tagline}</p>}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold">{fmt(p.eur)}</span>
                    <span className="text-xs text-foreground/50">/{ro ? "lună" : "mo"}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/85">
                        <Check className={`size-4 mt-0.5 shrink-0 ${p.text}`} aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`${WHATSAPP}${encodeURIComponent(
                      ro ? `Bună! Aș dori pachetul de mentenanță ${p.name}.` : `Hi! I'd like the ${p.name} care plan.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
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
        </section>

        {/* Pillars */}
        <section className="mt-16">
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

        {/* FAQ */}
        <section className="mt-16">
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
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  WhatsApp
                </a>
                <a
                  href="mailto:contact@avyron.ro"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
                >
                  contact@avyron.ro
                </a>
                <Link
                  to={ro ? "/costurisiproduse" : "/en/pricing"}
                  className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-6 py-3 text-sm font-semibold hover:bg-foreground/[0.1] transition-colors"
                >
                  <ArrowLeft className="size-4" aria-hidden />
                  {ro ? "Înapoi la produse" : "Back to products"}
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-foreground/50 inline-flex items-center gap-1.5">
                <Clock className="size-3" aria-hidden />
                {ro ? "Răspundem în maxim 24 de ore" : "We reply within 24 hours"}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
};

export default CarePlansPage;
