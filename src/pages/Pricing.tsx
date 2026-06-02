import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CreditCard, Building2, Link2, FileText, Sparkles, Zap, Crown, Shield, RefreshCw, Globe, Instagram, Facebook, Music2, Image as ImageIcon, MessageCircle, Share2, Calendar, BadgeCheck, ShoppingBag, Package, Truck, Tag, BarChart3, Smartphone, Apple, Layers, Code2, Bell, Cloud, Cpu } from "lucide-react";
import { useLang } from "@/i18n/LanguageContext";
import logo from "@/assets/avyron-logo.jpg";
import premiumTech from "@/assets/premium-mockup.jpg.asset.json";

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
  const rate = 5; // indicative leu/euro rate for display only

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro ? "Costuri & Mentenanță — Avyron" : "Pricing & Care — Avyron";
    const description = ro
      ? "Pachete transparente pentru site-uri profesionale: produs principal de la 300€, mentenanță Plus / Pro / Pro activ și plăți sigure."
      : "Transparent packages for professional websites: main product from €300, Plus / Pro / Pro Active care plans and secure payment methods.";
    import("@/lib/seo").then(({ setPageMeta }) =>
      setPageMeta({ title, description, path: "/costurisiproduse" }),
    );
  }, [ro]);

  const fmt = (eur: number) => {
    if (currency === "EUR") return `${eur}€`;
    return `${Math.round(eur * rate)} RON`;
  };

  const main = {
    title: ro ? "Website Prezentare Premium" : "Premium Presentation Website",
    range: ro ? "de la 300€" : "from €300",
    desc: ro
      ? "Site complet, livrat la cheie — gata să producă rezultate din prima zi. Clientul nu mai are nimic de plătit pentru o perioadă de minim 1 lună până la 1 an (în funcție de cerințele și configurația inițială), iar produsul beneficiază de suport tehnic gratuit pe toată durata de viață: asistență la administrare, recomandări de securitate, răspuns prompt la întrebări și ghidare strategică pentru evoluția site-ului."
      : "A turnkey website — ready to deliver results from day one. The client owes nothing for a period ranging from 1 month up to 1 year (depending on the initial scope and configuration), and the product comes with free lifetime technical support: admin assistance, security guidance, prompt answers and strategic advice for ongoing growth.",
    includes: ro
      ? [
          "Logo static creat împreună cu clientul",
          "Descrieri profesionale pentru produse și servicii — le putem redacta noi pentru tine",
          "Imagini optimizate și galerii vizuale — le putem crea sau edita noi",
          "Cod, structură și design custom, dezvoltate de la zero pe identitatea ta",
          "SEO tehnic și on-page, optimizări complete pentru toate device-urile",
          "Mobile-ready, securizat (HTTPS, headers, anti-spam) și performant (scor Lighthouse înalt)",
          "Integrare completă cu rețele sociale și pixeluri analytics",
          "Conturi demonstrative, mediu de testare și revizii nelimitate până la validare",
          "Asistență gratuită la transferul datelor, conturilor și e-mailurilor existente",
          "Ghid de administrare + sesiune live de prezentare a panoului",
          "Backup inițial, certificat SSL și configurări de e-mail profesionale",
          "Suport gratuit lifetime — recomandări de securitate, performanță și administrare",
        ]
      : [
          "Static logo crafted together with the client",
          "Professional descriptions for products and services — we can write them for you",
          "Optimized images and visual galleries — we can create or edit them for you",
          "Custom code, structure and design built from scratch around your identity",
          "Technical and on-page SEO, full optimizations across every device",
          "Mobile-ready, secure (HTTPS, headers, anti-spam) and performant (high Lighthouse score)",
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
            "Plus +",
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
            "Pro +",
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
            <div className="md:col-span-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0a0f24] to-[#05060f] p-5 sm:p-6 relative overflow-hidden text-center">
            {/* Decorative glow */}
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-cyan-200">
                <BadgeCheck className="size-3.5" />
                {ro ? "Produs principal" : "Main product"}
              </div>
              <div className="mt-5 mx-auto w-40 h-40 sm:w-44 sm:h-44 rounded-2xl ring-1 ring-cyan-300/20 overflow-hidden shadow-[0_20px_60px_-20px_rgba(34,211,238,0.45)]">
                <img src={premiumTech.url} alt="Website Prezentare Premium" width={176} height={176} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">{main.title}</h2>
              <div className="mt-4 flex items-baseline justify-center gap-2 flex-wrap">
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent break-words">
                  <span className="text-[50%] font-semibold align-middle mr-1.5 opacity-80">{ro ? "de la" : "from"}</span>
                  {currency === "EUR" ? "300€" : `${Math.round(300 * rate)} RON`}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70 leading-relaxed text-left">{main.desc}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-1.5 text-[11px] text-cyan-100">
                <RefreshCw className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 2–5 zile" : "Approx. development time: 2–5 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {main.includes.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                  <Check className="size-4 mt-0.5 text-cyan-300 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de Website Prezentare Premium."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-5 py-2.5 text-sm font-bold text-white transition-colors"
              >
                <MessageCircle className="size-4" />
                {ro ? "Vreau Website Prezentare Premium" : "I want a Premium Presentation Website"}
              </a>
            </div>
          </div>
        </section>

        {/* Identitate Social Media */}
        <section className="mt-12 grid md:grid-cols-5 gap-5">
          <div className="md:col-span-2 rounded-2xl border border-pink-300/20 bg-gradient-to-br from-[#1a0a24] to-[#05060f] p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -left-16 size-48 rounded-full bg-pink-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -right-16 size-48 rounded-full bg-purple-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/30 bg-pink-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-pink-200">
                <MessageCircle className="size-3.5" />
                {ro ? "Identitate digitală" : "Digital identity"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#1877F2] to-[#0a4fb3] grid place-items-center shadow-[0_0_24px_-6px_rgba(24,119,242,0.6)]">
                  <Facebook className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] grid place-items-center shadow-[0_0_24px_-6px_rgba(220,39,67,0.6)]">
                  <Instagram className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-[#25F4EE] via-[#000] to-[#FE2C55] grid place-items-center shadow-[0_0_24px_-6px_rgba(254,44,85,0.6)]">
                  <Music2 className="size-6 text-white" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Identitate Social Media" : "Social Media Identity"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">
                {ro ? "Facebook · Instagram · TikTok" : "Facebook · Instagram · TikTok"}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2 flex-wrap">
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-300 to-purple-500 bg-clip-text text-transparent break-words">
                  <span className="text-[50%] font-semibold align-middle mr-1.5 opacity-80">{ro ? "de la" : "from"}</span>
                  {currency === "EUR" ? "250€" : `${Math.round(250 * rate)} RON`}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70 leading-relaxed text-left">
                {ro
                  ? "Construim de la zero identitatea ta în social media — conturi profesionale, coerente vizual și pregătite să convertească. Configurăm tot ce ține de prezență, descrieri, design, postări inițiale și butoane de acțiune, sincronizate cu website-ul tău pentru o experiență unitară între online și client."
                  : "We build your social media identity from scratch — professional accounts, visually coherent and conversion-ready. We set up presence, bios, design, initial posts and action buttons, all synced with your website for a seamless online experience."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-pink-300/[0.06] px-3 py-1.5 text-[11px] text-pink-100">
                <RefreshCw className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 2–5 zile" : "Approx. development time: 2–5 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <BadgeCheck className="size-4" />, text: "Creare conturi Facebook, Instagram și TikTok Business" },
                    { icon: <FileText className="size-4" />, text: "Descrieri (bio) profesionale, optimizate cu cuvinte cheie" },
                    { icon: <ImageIcon className="size-4" />, text: "Poză de profil, cover și template-uri vizuale coerente cu brandul" },
                    { icon: <Sparkles className="size-4" />, text: "Pachet de 6–9 postări inițiale (grid estetic Instagram)" },
                    { icon: <Calendar className="size-4" />, text: "Repere și calendar editorial pentru primele 30 de zile" },
                    { icon: <MessageCircle className="size-4" />, text: "Butoane de comenzi & contact (WhatsApp, Mesaj, Sună, Rezervă)" },
                    { icon: <Share2 className="size-4" />, text: "Sincronizare conturi cu website și pixeluri (Meta, TikTok)" },
                    { icon: <Instagram className="size-4" />, text: "Linkuri unificate (link-in-bio) și redirect către produse / servicii" },
                    { icon: <Music2 className="size-4" />, text: "Recomandări de conținut TikTok adaptat domeniului tău" },
                    { icon: <Shield className="size-4" />, text: "Setări de siguranță, verificare e-mail și recuperare cont" },
                  ]
                : [
                    { icon: <BadgeCheck className="size-4" />, text: "Facebook, Instagram and TikTok Business account setup" },
                    { icon: <FileText className="size-4" />, text: "Professional bios, optimized with relevant keywords" },
                    { icon: <ImageIcon className="size-4" />, text: "Profile picture, cover and visual templates aligned to your brand" },
                    { icon: <Sparkles className="size-4" />, text: "Initial 6–9 posts pack (aesthetic Instagram grid)" },
                    { icon: <Calendar className="size-4" />, text: "Milestones and editorial calendar for the first 30 days" },
                    { icon: <MessageCircle className="size-4" />, text: "Order & contact buttons (WhatsApp, Message, Call, Book)" },
                    { icon: <Share2 className="size-4" />, text: "Accounts synced with website and pixels (Meta, TikTok)" },
                    { icon: <Instagram className="size-4" />, text: "Unified link-in-bio and redirects to products / services" },
                    { icon: <Music2 className="size-4" />, text: "TikTok content recommendations tailored to your niche" },
                    { icon: <Shield className="size-4" />, text: "Safety settings, email verification and account recovery" },
                  ]
              ).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-white/85">
                  <span className="mt-0.5 size-5 rounded-md bg-pink-400/15 text-pink-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de pachetul Identitate Social Media (Facebook, Instagram, TikTok)."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <BadgeCheck className="size-4" />
                {ro ? "Vreau Identitate Social Media" : "I want the Social Identity pack"}
              </a>
            </div>
          </div>
        </section>

        {/* Platformă eCommerce / Shopify */}
        <section className="mt-12 grid md:grid-cols-5 gap-5">
          <div className="md:col-span-2 rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-[#04221a] to-[#05060f] p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -right-16 size-48 rounded-full bg-emerald-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -left-16 size-48 rounded-full bg-teal-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-200">
                <ShoppingBag className="size-3.5" />
                {ro ? "Magazin online" : "Online store"}
              </div>
              <div className="mt-5 mx-auto size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 grid place-items-center shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)]">
                <ShoppingBag className="size-8 text-white" />
              </div>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Platformă eCommerce / Shopify" : "eCommerce / Shopify Platform"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">
                {ro ? "Shopify · WooCommerce · Custom" : "Shopify · WooCommerce · Custom"}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2 flex-wrap">
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-300 to-teal-500 bg-clip-text text-transparent break-words">
                  <span className="text-[50%] font-semibold align-middle mr-1.5 opacity-80">{ro ? "de la" : "from"}</span>
                  {currency === "EUR" ? "1000€" : `${Math.round(1000 * rate)} RON`}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70 leading-relaxed text-left">
                {ro
                  ? "Magazin online complet, optimizat pentru vânzări reale — catalog de produse, coș, checkout securizat și plăți online integrate. Construim pe Shopify sau pe stack custom, în funcție de scară, cu accent pe viteză, conversie și un panou ușor de administrat de oricine din echipa ta."
                  : "A full online store optimized for real sales — product catalog, cart, secure checkout and integrated online payments. We build on Shopify or on a custom stack depending on scale, focused on speed, conversion and an admin panel anyone on your team can use."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] text-emerald-100">
                <RefreshCw className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 7–21 zile" : "Approx. development time: 7–21 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <Package className="size-4" />, text: "Catalog produse cu variante, stocuri și categorii nelimitate" },
                    { icon: <ShoppingBag className="size-4" />, text: "Coș, checkout securizat și pagini de produs orientate spre conversie" },
                    { icon: <CreditCard className="size-4" />, text: "Plăți online (card, Apple Pay, Google Pay) + ramburs" },
                    { icon: <Truck className="size-4" />, text: "Integrare curieri (FAN, Sameday, DPD) cu AWB automat" },
                    { icon: <ShoppingBag className="size-4" />, text: "Integrare marketplace eMAG + Sameday cu livrare în România, Ungaria și Bulgaria" },
                    { icon: <FileText className="size-4" />, text: "Facturare automată (SmartBill / Oblio) și conformitate ANAF" },
                    { icon: <Tag className="size-4" />, text: "Coduri promo, reduceri, bundle-uri și campanii sezoniere" },
                    { icon: <BarChart3 className="size-4" />, text: "Pixel Meta / TikTok, GA4 și conversion tracking complet" },
                    { icon: <Globe className="size-4" />, text: "Multilingv, multi-monedă și SEO tehnic pentru fiecare produs" },
                    { icon: <MessageCircle className="size-4" />, text: "Email-uri automate: comandă, expediere, abandon coș" },
                    { icon: <Shield className="size-4" />, text: "GDPR, termeni & condiții, politici și backup-uri zilnice" },
                  ]
                : [
                    { icon: <Package className="size-4" />, text: "Product catalog with unlimited variants, stock and categories" },
                    { icon: <ShoppingBag className="size-4" />, text: "Cart, secure checkout and conversion-focused product pages" },
                    { icon: <CreditCard className="size-4" />, text: "Online payments (card, Apple Pay, Google Pay) + COD" },
                    { icon: <Truck className="size-4" />, text: "Courier integrations (FAN, Sameday, DPD) with automatic AWB" },
                    { icon: <ShoppingBag className="size-4" />, text: "eMAG marketplace integration + Sameday delivery across Romania, Hungary and Bulgaria" },
                    { icon: <FileText className="size-4" />, text: "Automated invoicing (SmartBill / Oblio) and tax compliance" },
                    { icon: <Tag className="size-4" />, text: "Promo codes, discounts, bundles and seasonal campaigns" },
                    { icon: <BarChart3 className="size-4" />, text: "Meta / TikTok pixel, GA4 and complete conversion tracking" },
                    { icon: <Globe className="size-4" />, text: "Multilingual, multi-currency and per-product technical SEO" },
                    { icon: <MessageCircle className="size-4" />, text: "Automated emails: order, shipping, abandoned cart" },
                    { icon: <Shield className="size-4" />, text: "GDPR, terms, policies and daily backups" },
                  ]
              ).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-white/85">
                  <span className="mt-0.5 size-5 rounded-md bg-emerald-400/15 text-emerald-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de un magazin online (Platformă eCommerce / Shopify)."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <ShoppingBag className="size-4" />
                {ro ? "Vreau magazin online" : "I want an online store"}
              </a>
            </div>
          </div>
        </section>

        {/* Aplicații Mobile & Web */}
        <section className="mt-12 grid md:grid-cols-5 gap-5">
          <div className="md:col-span-2 rounded-2xl border border-indigo-300/20 bg-gradient-to-br from-[#0a0f2e] to-[#05060f] p-5 sm:p-6 relative overflow-hidden text-center">
            <div aria-hidden className="absolute -top-16 -left-16 size-48 rounded-full bg-indigo-400/15 blur-3xl" />
            <div aria-hidden className="absolute -bottom-16 -right-16 size-48 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-indigo-200">
                <Smartphone className="size-3.5" />
                {ro ? "Produs dedicat" : "Dedicated product"}
              </div>
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="size-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(99,102,241,0.6)]">
                  <Smartphone className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(139,92,246,0.6)]">
                  <Layers className="size-6 text-white" />
                </div>
                <div className="size-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 grid place-items-center shadow-[0_0_24px_-6px_rgba(34,211,238,0.6)]">
                  <Code2 className="size-6 text-white" />
                </div>
              </div>
              <h2 className="mt-5 font-display text-2xl sm:text-3xl font-extrabold">
                {ro ? "Aplicații Mobile & Web" : "Mobile & Web Apps"}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">
                {ro ? "iOS · Android · PWA · SaaS" : "iOS · Android · PWA · SaaS"}
              </p>
              <div className="mt-4 flex items-baseline justify-center gap-2 flex-wrap">
                <span className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-300 to-violet-500 bg-clip-text text-transparent break-words">
                  <span className="text-[50%] font-semibold align-middle mr-1.5 opacity-80">{ro ? "de la" : "from"}</span>
                  {currency === "EUR" ? "1500€" : `${Math.round(1500 * rate)} RON`}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/70 leading-relaxed text-left">
                {ro
                  ? "Construim aplicații mobile și web custom — de la idee, prototip și UX, până la publicare în App Store, Google Play sau pe propriul tău domeniu. Lucrăm cu tehnologii moderne (React, React Native, Node, Supabase) care îți dau viteză, scalare reală și un cost de mentenanță predictibil pe termen lung."
                  : "We build custom mobile and web apps — from idea, prototype and UX through to publishing on the App Store, Google Play or your own domain. We use modern technologies (React, React Native, Node, Supabase) that deliver speed, real scalability and predictable long-term maintenance cost."}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/[0.06] px-3 py-1.5 text-[11px] text-indigo-100">
                <RefreshCw className="size-3.5" />
                {ro ? "Timp aproximativ dezvoltare: 7–30 zile" : "Approx. development time: 7–30 days"}
              </div>
            </div>
          </div>
          <div className="md:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/50">{ro ? "Include:" : "Includes:"}</div>
            <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {(ro
                ? [
                    { icon: <Sparkles className="size-4" />, text: "Sesiune de discovery + wireframe-uri și prototip Figma" },
                    { icon: <Layers className="size-4" />, text: "Design UX/UI custom, sistem de componente și dark mode" },
                    { icon: <Code2 className="size-4" />, text: "Cod nativ-friendly (React Native) sau Web App / PWA" },
                    { icon: <Apple className="size-4" />, text: "Publicare App Store & Google Play (cont, build, review)" },
                    { icon: <Cloud className="size-4" />, text: "Backend, bază de date, autentificare și API-uri securizate" },
                    { icon: <Bell className="size-4" />, text: "Notificări push, deep links și onboarding utilizator" },
                    { icon: <BarChart3 className="size-4" />, text: "Analytics, crash reporting și A/B testing integrate" },
                    { icon: <Cpu className="size-4" />, text: "Integrări AI / API-uri externe (plăți, hărți, OCR, chat)" },
                    { icon: <Shield className="size-4" />, text: "GDPR, criptare, roluri de utilizator și audit de securitate" },
                    { icon: <RefreshCw className="size-4" />, text: "Update-uri OTA, versionare și roadmap pe minim 12 luni" },
                  ]
                : [
                    { icon: <Sparkles className="size-4" />, text: "Discovery session + wireframes and Figma prototype" },
                    { icon: <Layers className="size-4" />, text: "Custom UX/UI design, component system and dark mode" },
                    { icon: <Code2 className="size-4" />, text: "Native-friendly code (React Native) or Web App / PWA" },
                    { icon: <Apple className="size-4" />, text: "App Store & Google Play publishing (account, build, review)" },
                    { icon: <Cloud className="size-4" />, text: "Backend, database, authentication and secure APIs" },
                    { icon: <Bell className="size-4" />, text: "Push notifications, deep links and user onboarding" },
                    { icon: <BarChart3 className="size-4" />, text: "Built-in analytics, crash reporting and A/B testing" },
                    { icon: <Cpu className="size-4" />, text: "AI integrations / external APIs (payments, maps, OCR, chat)" },
                    { icon: <Shield className="size-4" />, text: "GDPR, encryption, user roles and security audit" },
                    { icon: <RefreshCw className="size-4" />, text: "OTA updates, versioning and 12+ month roadmap" },
                  ]
              ).map((f) => (
                <li key={f.text} className="flex items-start gap-2 text-sm text-white/85">
                  <span className="mt-0.5 size-5 rounded-md bg-indigo-400/15 text-indigo-300 grid place-items-center shrink-0">
                    {f.icon}
                  </span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-center">
              <a
                href="https://wa.me/40734605055?text=Bună! Sunt interesat de o aplicație mobilă sau web (iOS / Android / PWA)."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Smartphone className="size-4" />
                {ro ? "Vreau aplicație Mobile / Web" : "I want a Mobile / Web app"}
              </a>
            </div>
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
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-cyan-300/30 hover:bg-white/[0.06] transition-all backdrop-blur flex flex-col items-center text-center"
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
            <Link
              to="/#examples"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 text-[#05060f] hover:bg-cyan-300 px-6 py-3 text-sm font-bold transition-colors"
            >
              {ro ? "Vreau un demo" : "I want a demo"}
            </Link>
            <a
              href="tel:+40734605055"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] px-6 py-3 text-sm font-bold text-white transition-colors"
            >
              {ro ? "Telefon" : "Phone"}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Pricing;
