import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CreditCard, Building2, Link2, FileText, Sparkles, Zap, Crown, Shield, RefreshCw } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";

/**
 * PlayStation-inspired pricing page.
 * - Deep navy/black background with neon-blue accents
 * - PS shape glyphs (▲ ◯ ✕ ◻) as decorative tags for each tier
 * - Glass cards, sharp grid, monospaced labels
 */

const PS_SHAPES = {
  triangle: "△",
  circle: "○",
  cross: "✕",
  square: "□",
};

type Tier = {
  key: "plus" | "pro" | "proactiv";
  shape: keyof typeof PS_SHAPES;
  name: string;
  price: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  icon: React.ReactNode;
  accent: string; // tailwind classes for shape color
};

const Pricing = () => {
  const { lang } = useLang();
  const ro = lang === "ro";
  const [currency, setCurrency] = useState<"EUR" | "RON">("EUR");
  const rate = 4.97; // indicative BNR-style rate for display only

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = ro ? "Costuri & Mentenanță — Avyron" : "Pricing & Care — Avyron";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      ro
        ? "Pachete transparente pentru site-uri profesionale: produs principal 300€–1000€, mentenanță Plus / Pro / Pro activ și modalități de plată sigure."
        : "Transparent packages for professional websites: main product €300–€1000, Plus / Pro / Pro Active care plans and secure payment methods.",
    );
  }, [ro]);

  const fmt = (eur: number) => {
    if (currency === "EUR") return `${eur}€`;
    return `${Math.round(eur * rate)} RON`;
  };

  const main = {
    title: ro ? "Produs principal" : "Main product",
    range: ro ? "300€ – 1000€" : "€300 – €1000",
    desc: ro
      ? "Site complet, livrat la cheie — gata să producă rezultate din prima zi. Clientul nu mai are nimic de plătit pentru o perioadă de minim 1 lună până la 1 an (în funcție de cerințele și configurația inițială), iar produsul beneficiază de suport tehnic gratuit pe toată durata de viață: asistență la administrare, recomandări de securitate, răspuns prompt la întrebări și ghidare strategică pentru evoluția site-ului."
      : "A turnkey website — ready to deliver results from day one. The client owes nothing for a period ranging from 1 month up to 1 year (depending on the initial scope and configuration), and the product comes with free lifetime technical support: admin assistance, security guidance, prompt answers and strategic advice for ongoing growth.",
    includes: ro
      ? [
          "Cod, structură și design custom, dezvoltate de la zero pe identitatea ta",
          "SEO tehnic și on-page, optimizări complete pentru toate device-urile",
          "Mobile-ready, securizat (HTTPS, headers, anti-spam) și performant (scor Lighthouse înalt)",
          "Hosting profesional inclus + rezervare și cumpărare domeniu",
          "Integrare completă cu rețele sociale și pixeluri analytics",
          "Conturi demonstrative, mediu de testare și revizii nelimitate până la validare",
          "Asistență gratuită la transferul datelor, conturilor și e-mailurilor existente",
          "Ghid de administrare + sesiune live de prezentare a panoului",
          "Backup inițial, certificat SSL și configurări de e-mail profesionale",
          "Suport gratuit lifetime — recomandări de securitate, performanță și administrare",
        ]
      : [
          "Custom code, structure and design built from scratch around your identity",
          "Technical and on-page SEO, full optimizations across every device",
          "Mobile-ready, secure (HTTPS, headers, anti-spam) and performant (high Lighthouse score)",
          "Professional hosting included + domain registration and purchase",
          "Full integration with social networks and analytics pixels",
          "Demo accounts, staging environment and unlimited revisions until approval",
          "Free assistance with migration of data, accounts and existing emails",
          "Admin guide + live walkthrough session of the dashboard",
          "Initial backup, SSL certificate and professional email setup",
          "Free lifetime support — security, performance and admin guidance",
        ],
  };

  const tiers: Tier[] = [
    {
      key: "plus",
      shape: "square",
      name: "Plus",
      price: fmt(50),
      tagline: ro ? "Esențial pentru liniște" : "Essential peace of mind",
      icon: <Shield className="size-5" />,
      accent: "text-pink-400",
      features: ro
        ? ["Actualizări tehnice", "Backup periodic", "Monitorizare uptime", "Modificări text (3/lună)", "Hosting", "Domeniu gratuit", "Suport prioritar"]
        : ["Technical updates", "Periodic backups", "Uptime monitoring", "Text changes (3/month)", "Hosting", "Free domain", "Priority support"],
    },
    {
      key: "pro",
      shape: "triangle",
      name: "Pro",
      price: fmt(100),
      tagline: ro ? "Cel mai ales de clienți" : "Most chosen by clients",
      highlight: true,
      icon: <Zap className="size-5" />,
      accent: "text-emerald-400",
      features: ro
        ? [
            "Tot din Plus",
            "10 modificări de conținut (texte, imagini)",
            "Backup lunar",
            "Optimizări de performanță",
            "Ajustări SEO de bază",
            "Administrare rețele sociale (Facebook / Instagram / TikTok)",
          ]
        : [
            "Everything in Plus",
            "10 content changes (text, images)",
            "Monthly backups",
            "Performance optimizations",
            "Basic SEO adjustments",
            "Social media management (Facebook / Instagram / TikTok)",
          ],
    },
    {
      key: "proactiv",
      shape: "circle",
      name: "Pro activ",
      price: fmt(150),
      tagline: ro ? "Creștere continuă" : "Continuous growth",
      icon: <Crown className="size-5" />,
      accent: "text-cyan-300",
      features: ro
        ? [
            "Tot din Pro",
            "Modificări / actualizări / postări nelimitate",
            "Optimizare SEO continuă",
            "Monitorizare și analiză trafic",
            "Intervenții rapide",
            "Consultanță digitală lunară",
          ]
        : [
            "Everything in Pro",
            "Unlimited changes / updates / posts",
            "Continuous SEO optimization",
            "Traffic monitoring and analytics",
            "Rapid interventions",
            "Monthly digital consulting",
          ],
    },
  ];

  const payments = [
    {
      icon: <CreditCard className="size-5" />,
      title: ro ? "Card bancar" : "Bank card",
      desc: ro ? "Plăți rapide și securizate prin procesator autorizat." : "Fast, secure payments via certified processor.",
    },
    {
      icon: <Building2 className="size-5" />,
      title: ro ? "Transfer bancar" : "Bank transfer",
      desc: ro ? "Plată direct în contul firmei pe baza facturii emise." : "Direct payment into the company account against an issued invoice.",
    },
    {
      icon: <Link2 className="size-5" />,
      title: ro ? "Link de plată" : "Payment link",
      desc: ro ? "Pentru servicii rapide sau abonamente lunare." : "For quick services or monthly subscriptions.",
    },
    {
      icon: <FileText className="size-5" />,
      title: ro ? "Factură & ordin de plată" : "Invoice & payment order",
      desc: ro ? "Disponibil pentru clienți business." : "Available for business clients.",
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#05060f] text-white">
      {/* PS-style background: starfield + grid + glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,112,243,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(168,85,247,0.18),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-6 sm:pt-8 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 sm:px-4 py-2 text-xs sm:text-sm text-white/80 hover:bg-white/[0.1] hover:text-white transition-all backdrop-blur"
          >
            <ArrowLeft className="size-4" />
            {ro ? "Înapoi" : "Back"}
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Avyron" className="size-7 sm:size-8 rounded-md ring-1 ring-white/20" />
            <span className="font-display tracking-[0.2em] sm:tracking-[0.25em] text-xs sm:text-sm">AVYRON</span>
          </div>
        </div>

        {/* Hero */}
        <section className="mt-12 text-center">
          <h1 className="mt-6 font-display text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight px-2">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              {ro ? "Transparent. Complet. Fără surprize." : "Transparent. Complete. No surprises."}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-white/70 text-base md:text-lg">
            {ro
              ? "Aducem site-uri și produse digitale la cheie, le ținem sigure și rapide, iar tu plătești doar ce alegi. Costurile sunt orientative și pot varia în funcție de cerințe."
              : "We deliver turnkey digital products, keep them fast and secure, and you only pay for what you choose. Prices are indicative and may vary by scope."}
          </p>

          {/* Currency switch */}
          <div className="mt-7 inline-flex rounded-full border border-white/15 bg-white/[0.04] p-1 backdrop-blur">
            {(["EUR", "RON"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-4 py-1.5 text-xs font-semibold tracking-widest rounded-full transition-all ${
                  currency === c ? "bg-cyan-400 text-[#05060f]" : "text-white/70 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] uppercase tracking-widest text-white/40 inline-flex items-center gap-2">
            <RefreshCw className="size-3" />
            {ro ? "Curs orientativ — facturare în RON la cursul BNR" : "Indicative rate — invoicing in RON at BNR rate"}
          </p>
        </section>

        {/* Bring-your-own banner */}
        <section className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-5 md:p-6 backdrop-blur">
          <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
            <div className="size-12 shrink-0 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 grid place-items-center">
              <Sparkles className="size-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-lg md:text-xl font-bold">
                {ro ? "Ai deja un site sau un produs?" : "Already have a site or product?"}
              </h3>
              <p className="text-sm text-white/70 mt-1">
                {ro
                  ? "Poți aduce site-ul sau produsul pe care îl ai deja pentru actualizare, modificare sau doar pentru mentenanță. Îl evaluăm gratuit și îți spunem exact ce se poate îmbunătăți, ca să iei decizia potrivită fără presiune."
                  : "You can bring your existing site or product for updates, changes or just maintenance. We'll evaluate it for free and tell you exactly what can be improved, so you can make the right decision without any pressure."}
              </p>
            </div>
            <a
              href="#cta"
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-white text-[#05060f] px-5 py-2.5 text-sm font-semibold hover:bg-cyan-200 transition-colors w-full md:w-auto justify-center"
            >
              {ro ? "Cere evaluare" : "Request evaluation"}
            </a>
          </div>
        </section>

        {/* Main product */}
        <section className="mt-12 grid md:grid-cols-5 gap-5">
            <div className="md:col-span-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0a0f24] to-[#05060f] p-5 sm:p-6 relative overflow-hidden">
            <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">[ Tier 01 ]</div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold">{main.title}</h2>
            <div className="mt-4 flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent break-words">
                {currency === "EUR" ? "300€ – 1000€" : `${Math.round(300 * rate)} – ${Math.round(1000 * rate)} RON`}
              </span>
            </div>
            <p className="mt-4 text-sm text-white/70 leading-relaxed">{main.desc}</p>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">{ro ? "Poate include" : "Can include"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {main.includes.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                  <Check className="size-4 mt-0.5 text-cyan-300 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Care plans */}
        <section className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">
              {ro ? "Pachete de mentenanță" : "Care plans"}
            </h2>
            <p className="mt-3 text-sm text-white/60 max-w-xl mx-auto">
              {ro
                ? "Dacă vrei să-ți administrezi singur produsul, e perfect. Dacă vrei să ne ocupăm noi — alege un pachet."
                : "Run it yourself or let us handle it — pick a plan that fits."}
            </p>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {tiers.map((tier) => (
              <article
                key={tier.key}
                className={`relative rounded-2xl border p-6 backdrop-blur transition-all hover:-translate-y-1 ${
                  tier.highlight
                    ? "border-emerald-300/40 bg-gradient-to-b from-emerald-500/10 to-white/[0.02] shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-400 text-[#05060f] text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                    {tier.tagline}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className={`text-3xl ${tier.accent} drop-shadow-[0_0_12px_currentColor]`}>{PS_SHAPES[tier.shape]}</span>
                  <span className="size-9 rounded-lg bg-white/10 grid place-items-center">{tier.icon}</span>
                </div>
                <h3 className="mt-5 font-display text-2xl font-extrabold">{tier.name}</h3>
                {!tier.highlight && <p className="text-xs text-white/50 mt-1">{tier.tagline}</p>}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">{tier.price}</span>
                  <span className="text-xs text-white/50">/{ro ? "lună" : "mo"}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                      <Check className={`size-4 mt-0.5 shrink-0 ${tier.accent}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    tier.highlight
                      ? "bg-emerald-400 text-[#05060f] hover:bg-emerald-300"
                      : "border border-white/15 bg-white/[0.06] hover:bg-white/[0.12]"
                  }`}
                >
                  {ro ? "Alege pachet" : "Choose plan"}
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Self-serve note */}
        <section className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
          <p className="text-sm md:text-base text-white/75 leading-relaxed">
            {ro
              ? "Dacă alegi să administrezi singur site-ul, totul este pregătit pentru asta. Fiecare client primește la livrare un produs complet funcțional, optimizat și gata de scalare, găzduit la partenerii noștri de încredere cu care colaborăm de mulți ani — fără costuri suplimentare ascunse. Securitatea, viteza de încărcare și performanța pe toate dispozitivele sunt validate riguros prin testări automate și manuale în mediile noastre de dezvoltare, iar la predare primești documentație clară și acces complet la panoul de administrare."
              : "If you choose to manage the site yourself, everything is set up for it. Each client receives a fully functional, optimized and scale-ready product on delivery, hosted with our long-trusted partners — with no hidden additional costs. Security, load speed and cross-device performance are rigorously validated through automated and manual testing in our development environments, and at handover you receive clear documentation and full access to the admin panel."}
          </p>
        </section>

        {/* Payments */}
        <section className="mt-16">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl font-extrabold">
              {ro ? "Modalități de plată" : "Payment methods"}
            </h2>
            <p className="mt-3 text-sm text-white/60 max-w-2xl mx-auto">
              {ro
                ? "Oferim metode flexibile și sigure de plată, adaptate atât pentru persoane fizice, cât și pentru companii."
                : "Flexible and secure payment methods, for both individuals and businesses."}
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {payments.map((p) => (
              <div
                key={p.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/30 hover:bg-white/[0.06] transition-all backdrop-blur"
              >
                <div className="size-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 grid place-items-center text-white">
                  {p.icon}
                </div>
                <h3 className="mt-4 font-display font-bold">{p.title}</h3>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {/* Future platform note */}
          <div className="mt-8 rounded-2xl border border-dashed border-cyan-300/30 bg-cyan-300/[0.04] p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cyan-200">
              <Sparkles className="size-3.5" />
              <span>{ro ? "În curând pe platformă" : "Coming soon on the platform"}</span>
            </div>
            <p className="mt-3 text-sm text-white/80 leading-relaxed">
              {ro
                ? "Prin simpla creare și validare a contului pe platformă, vei putea achita prin numeroase metode de plată, vei avea toate facturile într-un singur loc și vei vedea în timp real produsele achiziționate sau aflate în administrare — monitorizate eficient de echipa Avyron. Vei putea plăti direct de pe site pachetele, produsele și abonamentele, inclusiv plăți recurente pentru abonamente."
                : "Once you create and verify your account on the platform, you'll be able to pay using many methods, keep all invoices in one place and see your purchased or managed products in real time — monitored efficiently by the Avyron team. You'll be able to pay packages, products and subscriptions directly from the site, including recurring payments."}
            </p>
            <p className="mt-3 text-xs text-white/55">
              {ro
                ? "Costurile afișate sunt orientative și pot varia. Facturile se emit în RON la cursul BNR din ziua emiterii sau a efectuării plății."
                : "Displayed costs are indicative and may vary. Invoices are issued in RON at the BNR rate on the day of issue or payment."}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-pink-500/15 p-8 md:p-10 text-center backdrop-blur relative overflow-hidden">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold">
            {ro ? "Începem cu o evaluare gratuită" : "Let's start with a free evaluation"}
          </h2>
          <p className="mt-3 text-white/70 max-w-xl mx-auto">
            {ro
              ? "Spune-ne ce vrei să construiești sau ce vrei să îmbunătățim — îți răspundem în maxim 24h."
              : "Tell us what you want to build or improve — we reply within 24h."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/40734605055"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:avyrontech@gmail.com"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#05060f] hover:bg-cyan-200 px-6 py-3 text-sm font-bold transition-colors"
            >
              avyrontech@gmail.com
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Pricing;
