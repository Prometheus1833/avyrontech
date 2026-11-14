import type { LucideIcon } from "lucide-react";
import {
  Accessibility, Apple, ArrowRight, BadgeCheck, BarChart3, Bell, BookOpen, Box,
  Bug, Calendar, Check, Cloud, Code2, Cpu, CreditCard, Facebook, FileText,
  FlaskConical, Gauge, Globe, Hourglass, Image as ImageIcon, Instagram, Layers, LibraryBig,
  MessageCircle, Music2, Package, PenTool, RefreshCw, ScanSearch, SearchCheck,
  Share2, Shield, ShoppingBag, Smartphone, Sparkles, Tag, Truck, Zap,
} from "lucide-react";
import { LOGO3D_PATHS } from "@/data/logo3d";
import { WEBSITE_SUBSCRIPTION_PATH } from "@/shared/websiteSubscriptions";
export const SERVICE_SUMMARY_LIMIT = 7;
export type Copy = { ro: string; en: string };
export type Feature = { icon: LucideIcon; text: Copy };
export type Accent = {
  /** Left card border. */
  border: string;
  /** Decorative blur behind the left card. */
  glow: string;
  /** Badge pill: border + background + text. */
  pill: string;
  /** Icon tile gradient. */
  tile: string;
  /** Inclusion marker. */
  check: string;
  /** Primary action background. */
  button: string;
};
export type ServiceDef = {
  key: string;
  icon: LucideIcon;
  badge: Copy;
  title: Copy;
  tagline: Copy;
  desc: Copy;
  time: Copy;
  includes: Copy;
  features: Feature[];
  cta: Copy;
  /** WhatsApp pre-filled message. */
  wa: Copy;
  /** Service detail page. */
  details: Copy;
  analytics: string;
  accent: Accent;
};
export const SERVICES: ServiceDef[] = [
  {
    key: "website",
    icon: Globe,
    badge: { ro: "Serviciu principal", en: "Main service" },
    title: { ro: "Site Prezentare Profesional", en: "Professional Presentation Website" },
    tagline: { ro: "Design custom · SEO · Suport", en: "Custom design · SEO · Support" },
    desc: {
      ro: "Site complet, livrat la cheie — pregătit pentru obiectivele agreate, cu suport tehnic definit clar în ofertă.",
      en: "A turnkey website prepared for the agreed goals, with technical support clearly defined in the proposal.",
    },
    time: { ro: "Timp aproximativ dezvoltare: 2–5 zile", en: "Approx. development time: 2–5 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: Code2,
        text: {
          ro: "Design și cod custom, dezvoltate de la zero pe identitatea ta",
          en: "Custom design and code, built from scratch around your identity",
        },
      },
      {
        icon: PenTool,
        text: {
          ro: "Texte, imagini și galerii optimizate — le putem crea noi",
          en: "Optimized copy, images and galleries — we can create them for you",
        },
      },
      {
        icon: SearchCheck,
        text: {
          ro: "SEO tehnic și on-page, performanță și scor Lighthouse înalt",
          en: "Technical and on-page SEO, performance and a high Lighthouse score",
        },
      },
      {
        icon: Shield,
        text: {
          ro: "Securizat (HTTPS, headere, anti-spam) și mobile-ready",
          en: "Secure (HTTPS, headers, anti-spam) and mobile-ready",
        },
      },
      {
        icon: Cloud,
        text: {
          ro: "Email pe domeniul tău + panou de administrare complet",
          en: "Email on your own domain + full admin panel",
        },
      },
      {
        icon: FileText,
        text: {
          ro: "Pagină GDPR conformă, backup inițial și certificat SSL",
          en: "Compliant GDPR page, initial backup and SSL certificate",
        },
      },
      {
        icon: BookOpen,
        text: {
          ro: "Ghid de administrare + sesiune live de instruire",
          en: "Admin guide + live walkthrough session",
        },
      },
      {
        icon: RefreshCw,
        text: {
          ro: "Suport și runde de revizie definite în oferta proiectului",
          en: "Support period and revision rounds defined in the proposal",
        },
      },
    ],
    cta: { ro: "Vreau Site Prezentare Profesional", en: "I want a Professional Presentation Website" },
    wa: { ro: "Bună! Sunt interesat de Site Prezentare Profesional.", en: "Hi! I'm interested in a Professional Presentation Website." },
    details: { ro: "/servicii/website-prezentare-profesional", en: "/en/services/professional-presentation-website" },
    analytics: "services_website",
    accent: {
      border: "border-cyan-300/20",
      glow: "bg-cyan-400/15",
      pill: "border-cyan-300/30 bg-cyan-300/10 text-cyan-700 dark:text-cyan-200",
      tile: "from-cyan-400 to-blue-600",
      check: "bg-cyan-400/15 text-cyan-600 dark:text-cyan-300",
      button: "bg-gradient-to-r from-cyan-500 to-blue-600",
    },
  },
  {
    key: "blog",
    icon: BookOpen,
    badge: { ro: "Conținut care construiește autoritate", en: "Content that builds authority" },
    title: { ro: "Blog Profesional", en: "Professional Blog" },
    tagline: { ro: "SEO · Articole · Administrare", en: "SEO · Articles · Administration" },
    desc: {
      ro: "Un hub editorial rapid, sigur și ușor de administrat, proiectat pentru SEO, expertiză și conversii — nu doar o listă de articole.",
      en: "A fast, secure, easy-to-manage editorial hub designed for SEO, expertise and conversions — not merely a list of articles.",
    },
    time: { ro: "Timp aproximativ dezvoltare: 5–10 zile", en: "Approx. development time: 5–10 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: SearchCheck,
        text: {
          ro: "Structură semantică, metadata, sitemap și articole conectate",
          en: "Semantic structure, metadata, sitemap and connected articles",
        },
      },
      {
        icon: PenTool,
        text: {
          ro: "Ciorne, publicare, autori, categorii și conținut bilingv",
          en: "Drafts, publishing, authors, categories and bilingual content",
        },
      },
      {
        icon: Gauge,
        text: {
          ro: "Imagini optimizate, încărcare rapidă și experiență fluidă pe mobil",
          en: "Optimized images, fast loading and a fluid mobile experience",
        },
      },
      {
        icon: Shield,
        text: {
          ro: "Moderare, protecție anti-abuz, analytics și conversii măsurabile",
          en: "Moderation, abuse protection, analytics and measurable conversions",
        },
      },
    ],
    cta: { ro: "Vreau un Blog Profesional", en: "I want a Professional Blog" },
    wa: { ro: "Bună! Sunt interesat de un Blog Profesional.", en: "Hi! I'm interested in a Professional Blog." },
    details: { ro: "/servicii/blog-profesional", en: "/en/services/professional-blog" },
    analytics: "services_blog_professional",
    accent: {
      border: "border-rose-300/20",
      glow: "bg-rose-400/12",
      pill: "border-rose-300/25 bg-rose-300/10 text-rose-700 dark:text-rose-200",
      tile: "from-rose-500 to-violet-600",
      check: "bg-rose-400/15 text-rose-600 dark:text-rose-300",
      button: "bg-gradient-to-r from-rose-500 to-violet-600",
    },
  },
  {
    key: "logo",
    icon: Box,
    badge: { ro: "Serviciu nou", en: "New service" },
    title: { ro: "Logo Profesional 3D", en: "Professional 3D Logo" },
    tagline: { ro: "Vector · 3D · Animație", en: "Vector · 3D · Motion" },
    desc: {
      ro: "Un logo original gândit din prima pentru print, volum și mișcare: fișiere vectoriale, model 3D, animații și logo interactiv pentru site. Pentru persoane fizice, firme mici și medii, branduri și startupuri.",
      en: "An original logo designed from day one for print, volume and motion: vector files, a 3D model, animations and an interactive website logo. For individuals, small and mid-size companies, brands and startups.",
    },
    time: { ro: "Timp aproximativ: 5–15 zile lucrătoare", en: "Approx. time: 5–15 working days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: ImageIcon,
        text: { ro: "Logo vectorial original: SVG, PDF, PNG", en: "Original vector logo: SVG, PDF, PNG" },
      },
      {
        icon: Box,
        text: { ro: "Model 3D pentru web și realitate augmentată", en: "3D model for the web and augmented reality" },
      },
      {
        icon: Zap,
        text: {
          ro: "Intro și buclă animată pentru site și social media",
          en: "Animated intro and loop for web and social media",
        },
      },
      {
        icon: BadgeCheck,
        text: { ro: "Drepturi de autor cedate integral", en: "Full copyright transfer" },
      },
    ],
    cta: { ro: "Vreau un logo 3D", en: "I want a 3D logo" },
    wa: { ro: "Bună! Sunt interesat de un Logo Profesional 3D.", en: "Hi! I'm interested in a Professional 3D Logo." },
    details: { ro: LOGO3D_PATHS.ro, en: LOGO3D_PATHS.en },
    analytics: "services_logo_3d",
    accent: {
      border: "border-violet-300/20",
      glow: "bg-violet-500/20",
      pill: "border-violet-300/30 bg-violet-300/10 text-violet-700 dark:text-violet-200",
      tile: "from-violet-400 to-sky-500",
      check: "bg-violet-400/15 text-violet-600 dark:text-violet-300",
      button: "bg-gradient-to-r from-violet-500 to-sky-500",
    },
  },
  {
    key: "social",
    icon: Instagram,
    badge: { ro: "Identitate digitală", en: "Digital identity" },
    title: { ro: "Identitate Social Media", en: "Social Media Identity" },
    tagline: { ro: "Facebook · Instagram · TikTok", en: "Facebook · Instagram · TikTok" },
    desc: {
      ro: "Construim de la zero identitatea ta în social media — conturi profesionale, coerente vizual și pregătite să convertească. Configurăm tot ce ține de prezență, descrieri, design, postări inițiale și butoane de acțiune, sincronizate cu website-ul tău pentru o experiență unitară între online și client.",
      en: "We build your social media identity from scratch — professional accounts, visually coherent and conversion-ready. We set up presence, bios, design, initial posts and action buttons, all synced with your website for a seamless online experience.",
    },
    time: { ro: "Timp aproximativ dezvoltare: 2–5 zile", en: "Approx. development time: 2–5 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: BadgeCheck,
        text: {
          ro: "Creare conturi Facebook, Instagram și TikTok Business",
          en: "Facebook, Instagram and TikTok Business account setup",
        },
      },
      {
        icon: FileText,
        text: {
          ro: "Descrieri (bio) profesionale, optimizate cu cuvinte cheie",
          en: "Professional bios, optimized with relevant keywords",
        },
      },
      {
        icon: ImageIcon,
        text: {
          ro: "Poză de profil, cover și template-uri vizuale coerente cu brandul",
          en: "Profile picture, cover and visual templates aligned to your brand",
        },
      },
      {
        icon: Music2,
        text: {
          ro: "Pachet de 6–9 postări inițiale (grid estetic Instagram)",
          en: "Initial 6–9 posts pack (aesthetic Instagram grid)",
        },
      },
      {
        icon: Calendar,
        text: {
          ro: "Repere și calendar editorial pentru primele 30 de zile",
          en: "Milestones and editorial calendar for the first 30 days",
        },
      },
      {
        icon: MessageCircle,
        text: {
          ro: "Butoane de comenzi & contact (WhatsApp, Mesaj, Sună, Rezervă)",
          en: "Order & contact buttons (WhatsApp, Message, Call, Book)",
        },
      },
      {
        icon: Share2,
        text: {
          ro: "Sincronizare conturi cu website și pixeluri (Meta, TikTok)",
          en: "Accounts synced with website and pixels (Meta, TikTok)",
        },
      },
      {
        icon: Facebook,
        text: {
          ro: "Linkuri unificate (link-in-bio) și redirect către produse / servicii",
          en: "Unified link-in-bio and redirects to products / services",
        },
      },
      {
        icon: Shield,
        text: {
          ro: "Setări de siguranță, verificare e-mail și recuperare cont",
          en: "Safety settings, email verification and account recovery",
        },
      },
    ],
    cta: { ro: "Vreau Identitate Social Media", en: "I want the Social Identity pack" },
    wa: {
      ro: "Bună! Sunt interesat de pachetul Identitate Social Media (Facebook, Instagram, TikTok).",
      en: "Hi! I'm interested in the Social Media Identity pack (Facebook, Instagram, TikTok).",
    },
    details: { ro: "/servicii/identitate-social-media", en: "/en/services/social-media-identity" },
    analytics: "services_social",
    accent: {
      border: "border-pink-300/20",
      glow: "bg-pink-400/15",
      pill: "border-pink-300/30 bg-pink-300/10 text-pink-700 dark:text-pink-200",
      tile: "from-pink-500 to-purple-600",
      check: "bg-pink-400/15 text-pink-600 dark:text-pink-300",
      button: "bg-gradient-to-r from-pink-500 to-purple-600",
    },
  },
  {
    key: "shop",
    icon: ShoppingBag,
    badge: { ro: "Magazin online", en: "Online store" },
    title: { ro: "Magazin Online", en: "Online Store" },
    tagline: { ro: "Shopify · WooCommerce · Custom", en: "Shopify · WooCommerce · Custom" },
    desc: {
      ro: "Magazin online complet, optimizat pentru vânzări reale — catalog de produse, coș, checkout securizat și plăți online integrate. Construim pe Shopify sau pe stack custom, în funcție de scară, cu accent pe viteză, conversie și un panou ușor de administrat de oricine din echipa ta.",
      en: "A full online store optimized for real sales — product catalog, cart, secure checkout and integrated online payments. We build on Shopify or on a custom stack depending on scale, focused on speed, conversion and an admin panel anyone on your team can use.",
    },
    time: { ro: "Timp aproximativ dezvoltare: 7–21 zile", en: "Approx. development time: 7–21 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: Package,
        text: {
          ro: "Catalog produse cu variante, stocuri și categorii nelimitate",
          en: "Scalable product catalog with variants, stock and categories",
        },
      },
      {
        icon: ShoppingBag,
        text: {
          ro: "Coș, checkout securizat și pagini de produs orientate spre conversie",
          en: "Cart, secure checkout and conversion-focused product pages",
        },
      },
      {
        icon: CreditCard,
        text: {
          ro: "Plăți online (card, Apple Pay, Google Pay) + ramburs",
          en: "Online payments (card, Apple Pay, Google Pay) + COD",
        },
      },
      {
        icon: Truck,
        text: {
          ro: "Integrare curieri (FAN, Sameday, DPD) cu AWB automat",
          en: "Courier integrations (FAN, Sameday, DPD) with automatic AWB",
        },
      },
      {
        icon: Globe,
        text: {
          ro: "Integrare marketplace eMAG + Sameday cu livrare în România, Ungaria și Bulgaria",
          en: "eMAG marketplace integration + Sameday delivery across Romania, Hungary and Bulgaria",
        },
      },
      {
        icon: FileText,
        text: {
          ro: "Facturare automată și conformitate ANAF, prin integrarea agreată",
          en: "Automated invoicing and tax compliance through the agreed integration",
        },
      },
      {
        icon: Tag,
        text: {
          ro: "Coduri promo, reduceri, bundle-uri și campanii sezoniere",
          en: "Promo codes, discounts, bundles and seasonal campaigns",
        },
      },
      {
        icon: BarChart3,
        text: {
          ro: "Pixel Meta / TikTok, GA4 și conversion tracking complet",
          en: "Meta / TikTok pixel, GA4 and complete conversion tracking",
        },
      },
      {
        icon: MessageCircle,
        text: {
          ro: "Email-uri automate: comandă, expediere, abandon coș",
          en: "Automated emails: order, shipping, abandoned cart",
        },
      },
    ],
    cta: { ro: "Vreau magazin online", en: "I want an online store" },
    wa: {
      ro: "Bună! Sunt interesat de un magazin online (Platformă eCommerce / Shopify).",
      en: "Hi! I'm interested in an online store (eCommerce platform / Shopify).",
    },
    details: { ro: "/servicii/magazin-online", en: "/en/services/online-store" },
    analytics: "services_shop",
    accent: {
      border: "border-emerald-300/20",
      glow: "bg-emerald-400/15",
      pill: "border-emerald-300/30 bg-emerald-300/10 text-emerald-700 dark:text-emerald-200",
      tile: "from-emerald-400 to-teal-600",
      check: "bg-emerald-400/15 text-emerald-600 dark:text-emerald-300",
      button: "bg-gradient-to-r from-emerald-500 to-teal-600",
    },
  },
  {
    key: "apps",
    icon: Smartphone,
    badge: { ro: "Serviciu dedicat", en: "Dedicated service" },
    title: { ro: "Aplicații Mobile & Web", en: "Mobile & Web Apps" },
    tagline: { ro: "iOS · Android · PWA · SaaS", en: "iOS · Android · PWA · SaaS" },
    desc: {
      ro: "Construim aplicații web și mobile pentru procesele afacerii tale: de la idee, design și prototip până la lansare și suport. Alegem tehnologiile și infrastructura după nevoile proiectului, cu integrarea sistemelor existente, accesuri clare și un plan de extindere stabilit împreună.",
      en: "We build web and mobile apps around your business processes, from the first idea, design and prototype to launch and support. We choose technology and infrastructure for your project's needs, integrating existing systems with clear access controls and an agreed plan for future growth.",
    },
    time: { ro: "Timp aproximativ dezvoltare: 7–30 zile", en: "Approx. development time: 7–30 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: PenTool,
        text: {
          ro: "Sesiune de discovery + wireframe-uri și prototip Figma",
          en: "Discovery session + wireframes and Figma prototype",
        },
      },
      {
        icon: Layers,
        text: {
          ro: "Design UX/UI custom, sistem de componente și dark mode",
          en: "Custom UX/UI design, component system and dark mode",
        },
      },
      {
        icon: Code2,
        text: {
          ro: "Cod nativ-friendly (React Native) sau Web App / PWA",
          en: "Native-friendly code (React Native) or Web App / PWA",
        },
      },
      {
        icon: Apple,
        text: {
          ro: "Publicare App Store & Google Play (cont, build, review)",
          en: "App Store & Google Play publishing (account, build, review)",
        },
      },
      {
        icon: Cloud,
        text: {
          ro: "Backend, bază de date, autentificare și API-uri securizate",
          en: "Backend, database, authentication and secure APIs",
        },
      },
      {
        icon: Bell,
        text: {
          ro: "Notificări push, deep links și onboarding utilizator",
          en: "Push notifications, deep links and user onboarding",
        },
      },
      {
        icon: BarChart3,
        text: {
          ro: "Analytics, crash reporting și A/B testing integrate",
          en: "Built-in analytics, crash reporting and A/B testing",
        },
      },
      {
        icon: Shield,
        text: {
          ro: "GDPR, criptare, roluri de utilizator și audit de securitate",
          en: "GDPR, encryption, user roles and security audit",
        },
      },
    ],
    cta: { ro: "Vreau aplicație Mobile / Web", en: "I want a Mobile / Web app" },
    wa: {
      ro: "Bună! Sunt interesat de o aplicație mobilă sau web (iOS / Android / PWA).",
      en: "Hi! I'm interested in a mobile or web app (iOS / Android / PWA).",
    },
    details: { ro: "/servicii/aplicatii-si-platforme", en: "/en/services/apps-and-platforms" },
    analytics: "services_apps",
    accent: {
      border: "border-indigo-300/20",
      glow: "bg-indigo-400/15",
      pill: "border-indigo-300/30 bg-indigo-300/10 text-indigo-700 dark:text-indigo-200",
      tile: "from-indigo-500 to-violet-600",
      check: "bg-indigo-400/15 text-indigo-600 dark:text-indigo-300",
      button: "bg-gradient-to-r from-indigo-500 to-violet-600",
    },
  },
  {
    key: "ai",
    icon: Cpu,
    badge: { ro: "Agenți și automatizări", en: "Agents and automation" },
    title: { ro: "Agenți AI personalizați", en: "Custom AI agents" },
    tagline: { ro: "Conversații · Email · Social media · Leaduri", en: "Conversations · Email · Social media · Leads" },
    desc: {
      ro: "Configurăm unul sau mai mulți agenți AI pentru procesele reale ale afacerii: conversații cu clienții, emailuri și follow-up, pregătirea și publicarea controlată a conținutului social, identificarea și calificarea leadurilor, programări, comenzi și actualizarea CRM-ului. Fiecare agent lucrează pe surse aprobate, cu permisiuni clare, jurnal de activitate și predare către echipă.",
      en: "We configure one or more AI agents for real business workflows: customer conversations, email and follow-up, controlled social content preparation and publishing, lead discovery and qualification, bookings, orders and CRM updates. Every agent works from approved sources, with clear permissions, activity logs and human handoff.",
    },
    time: { ro: "Timp aproximativ implementare: 5–14 zile", en: "Approx. implementation time: 5–14 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: MessageCircle,
        text: {
          ro: "Agent conversațional pentru site, WhatsApp și canalele conectate",
          en: "Conversation agent for your website, WhatsApp and connected channels",
        },
      },
      {
        icon: Share2,
        text: {
          ro: "Agent social media pentru idei, calendar, postări, programare și raportare",
          en: "Social media agent for ideas, calendars, posts, scheduling and reporting",
        },
      },
      {
        icon: Cloud,
        text: {
          ro: "Agent pentru emailuri, răspunsuri, follow-up și notificări operaționale",
          en: "Agent for email, replies, follow-ups and operational notifications",
        },
      },
      {
        icon: BadgeCheck,
        text: {
          ro: "Căutare și calificare de leaduri din surse permise, sincronizate cu CRM-ul",
          en: "Lead discovery and qualification from permitted sources, synced with your CRM",
        },
      },
      {
        icon: Cpu,
        text: {
          ro: "Automatizări pentru comenzi, programări, documente și actualizări de status",
          en: "Automation for orders, bookings, documents and status updates",
        },
      },
      {
        icon: Bell,
        text: {
          ro: "Aprobări înaintea acțiunilor sensibile și transfer rapid către un om",
          en: "Approvals before sensitive actions and fast human handoff",
        },
      },
      {
        icon: BarChart3,
        text: {
          ro: "Panou cu activitate, rezultate, erori, costuri și trasabilitatea acțiunilor",
          en: "Dashboard for activity, outcomes, errors, costs and action traceability",
        },
      },
      {
        icon: RefreshCw,
        text: {
          ro: "Cunoștințe și reguli actualizabile fără a reconstrui întregul sistem",
          en: "Updatable knowledge and rules without rebuilding the entire system",
        },
      },
    ],
    cta: { ro: "Vreau agenți AI personalizați", en: "I want custom AI agents" },
    wa: {
      ro: "Bună! Sunt interesat de agenți AI personalizați și automatizări pentru afacerea mea.",
      en: "Hi! I'm interested in custom AI agents and automation for my business.",
    },
    details: { ro: "/servicii/automatizari-si-ai", en: "/en/services/automation-and-ai" },
    analytics: "services_ai",
    accent: {
      border: "border-fuchsia-300/20",
      glow: "bg-fuchsia-400/15",
      pill: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-700 dark:text-fuchsia-200",
      tile: "from-fuchsia-500 to-purple-600",
      check: "bg-fuchsia-400/15 text-fuchsia-600 dark:text-fuchsia-300",
      button: "bg-gradient-to-r from-fuchsia-500 to-purple-600",
    },
  },
  {
    key: "qa",
    icon: Bug,
    badge: { ro: "Calitate garantată", en: "Guaranteed quality" },
    title: { ro: "Testare QA Web & Mobile", en: "QA Testing Web & Mobile" },
    tagline: { ro: "Funcțional · Regresie · Mobil · Automatizat", en: "Functional · Regression · Mobile · Automated" },
    desc: {
      ro: "Testăm site-uri, magazine online și aplicații mobile exact cum o face un client real. Primești un raport de defecte cu severitate și pași de reproducere, plus retestare după remedieri.",
      en: "We test websites, online stores and mobile apps exactly the way a real customer would. You get a defect report with severity and reproduction steps, plus retesting after fixes.",
    },
    time: { ro: "Durată: 3–10 zile", en: "Duration: 3–10 days" },
    includes: { ro: "Acoperim:", en: "We cover:" },
    features: [
      {
        icon: Check,
        text: {
          ro: "Testare funcțională pe toate fluxurile critice",
          en: "Functional testing across every critical flow",
        },
      },
      {
        icon: Smartphone,
        text: {
          ro: "Dispozitive și browsere reale (Android, iOS, desktop)",
          en: "Real devices and browsers (Android, iOS, desktop)",
        },
      },
      {
        icon: FlaskConical,
        text: {
          ro: "Teste automate end-to-end, rulate la fiecare update",
          en: "Automated end-to-end tests on every release",
        },
      },
      {
        icon: Gauge,
        text: {
          ro: "Performanță, internet lent și trafic simultan",
          en: "Performance, slow networks and concurrent traffic",
        },
      },
      {
        icon: Shield,
        text: {
          ro: "Securitate de bază: validări, roluri, sesiuni",
          en: "Baseline security: validation, roles, sessions",
        },
      },
      {
        icon: Accessibility,
        text: {
          ro: "Accesibilitate: tastatură, contrast, WCAG",
          en: "Accessibility: keyboard, contrast, WCAG",
        },
      },
      {
        icon: FileText,
        text: {
          ro: "Raport de defecte cu severitate și pași de reproducere",
          en: "Defect report with severity and reproduction steps",
        },
      },
      {
        icon: RefreshCw,
        text: {
          ro: "Retestare și regresie după remedieri",
          en: "Retesting and regression after fixes",
        },
      },
    ],
    cta: { ro: "Vreau testare QA", en: "I want QA testing" },
    wa: {
      ro: "Bună! Aș dori o ofertă de testare QA pentru produsul meu web / mobil.",
      en: "Hi! I'd like a QA testing quote for my web / mobile product.",
    },
    details: { ro: "/servicii/qa-testing-web-mobile", en: "/en/services/web-mobile-qa-testing" },
    analytics: "services_qa",
    accent: {
      border: "border-lime-300/20",
      glow: "bg-lime-400/15",
      pill: "border-lime-300/30 bg-lime-300/10 text-lime-700 dark:text-lime-200",
      tile: "from-lime-400 to-emerald-600",
      check: "bg-lime-400/15 text-lime-600 dark:text-lime-300",
      button: "bg-gradient-to-r from-lime-500 to-emerald-600",
    },
  },
  {
    key: "seo-ai",
    icon: SearchCheck,
    badge: { ro: "Vizibilitate organică", en: "Organic visibility" },
    title: { ro: "SEO & AI Performance and Visibility", en: "SEO & AI Performance and Visibility" },
    tagline: { ro: "SEO/GEO/AEO extins · Căutare și răspunsuri AI", en: "Comprehensive SEO/GEO/AEO · Search and AI answers" },
    desc: {
      ro: "Legăm intenția de căutare de paginile care răspund cel mai bine. Clarificăm cine ești, ce oferi și ce dovezi susțin informațiile, atât pentru căutarea clasică, cât și pentru răspunsurile generate de AI.",
      en: "We match search intent to the pages that answer it best. We clarify who you are, what you offer and what evidence supports your content, for both traditional search and AI-generated answers.",
    },
    time: { ro: "Calendar stabilit după audit", en: "Timeline agreed after audit" },
    includes: { ro: "Acoperim:", en: "We cover:" },
    features: [
      { icon: SearchCheck, text: { ro: "Analiza căutărilor, a concurenței și a golurilor de conținut", en: "Search, competitor and content gap analysis" } },
      { icon: Layers, text: { ro: "Arhitectură pe teme, legături interne și prioritizarea indexării", en: "Topic architecture, internal links and indexing priorities" } },
      { icon: FileText, text: { ro: "Pagini de servicii și răspunsuri clare la întrebările clienților (AEO)", en: "Service pages and clear answers to customer questions (AEO)" } },
      { icon: Sparkles, text: { ro: "Entități de brand, surse verificabile și date structurate relevante (GEO)", en: "Brand entities, verifiable sources and relevant structured data (GEO)" } },
      { icon: Globe, text: { ro: "Vizibilitate locală și consecvență între site și profilurile publice", en: "Local visibility and consistency across your site and public profiles" } },
      { icon: Gauge, text: { ro: "Raportare Search Console, Core Web Vitals și citări AI observabile", en: "Search Console reporting, Core Web Vitals and observable AI citations" } },
    ],
    cta: { ro: "Discută despre vizibilitate", en: "Discuss visibility" },
    wa: { ro: "Bună! Aș vrea să discut despre SEO & AI Performance and Visibility.", en: "Hi! I'd like to discuss SEO & AI Performance and Visibility." },
    details: { ro: "/servicii/seo-ai-visibility-performance", en: "/en/services/seo-ai-visibility-performance" },
    analytics: "services_seo_ai",
    accent: {
      border: "border-teal-300/25", glow: "bg-teal-400/15",
      pill: "border-teal-300/30 bg-teal-300/10 text-teal-700 dark:text-teal-200",
      tile: "from-teal-400 to-sky-500", check: "bg-teal-400/15 text-teal-700 dark:text-teal-300",
      button: "bg-gradient-to-r from-teal-500 to-sky-600",
    },
  },
  {
    key: "marketing-ads",
    icon: BarChart3,
    badge: { ro: "Creștere măsurabilă", en: "Measurable growth" },
    title: { ro: "Digital Marketing & Ads", en: "Digital Marketing & Ads" },
    tagline: { ro: "Google Ads · Meta Ads · Măsurare și optimizare", en: "Google Ads · Meta Ads · Measurement and optimization" },
    desc: {
      ro: "Alegem canalele după cum cumpără clienții tăi. Aliniem reclama, pagina de destinație și măsurarea, apoi folosim costul și calitatea solicitărilor pentru a decide unde merită investit bugetul.",
      en: "We choose channels based on how your customers buy. We align ads, landing pages and measurement, then use enquiry cost and quality to decide where budget is best spent.",
    },
    time: { ro: "Calendar stabilit după brief", en: "Timeline agreed after the brief" },
    includes: { ro: "Acoperim:", en: "We cover:" },
    features: [
      { icon: BarChart3, text: { ro: "Strategie de achiziție și alocarea bugetului pe canale și obiective", en: "Acquisition strategy and budget allocation by channel and objective" } },
      { icon: SearchCheck, text: { ro: "Google Ads: intenție, termeni de căutare și cuvinte negative", en: "Google Ads: intent, search terms and negative keywords" } },
      { icon: Share2, text: { ro: "Meta Ads: audiențe, prospectare și remarketing unde datele permit", en: "Meta Ads: audiences, prospecting and remarketing where data allows" } },
      { icon: ImageIcon, text: { ro: "Testarea mesajelor și materialelor, cu pagini dedicate ofertei", en: "Testing messages and creative with dedicated landing pages" } },
      { icon: BadgeCheck, text: { ro: "Verificarea conversiilor și măsurare cu respectarea consimțământului", en: "Conversion verification and consent-aware measurement" } },
      { icon: Gauge, text: { ro: "Optimizare după cost pe rezultat și calitatea solicitărilor", en: "Optimization by cost per result and enquiry quality" } },
    ],
    cta: { ro: "Discută despre campanii", en: "Discuss campaigns" },
    wa: { ro: "Bună! Aș vrea să discut despre Digital Marketing & Ads.", en: "Hi! I'd like to discuss Digital Marketing & Ads." },
    details: { ro: "/servicii/digital-marketing-ads", en: "/en/services/digital-marketing-ads" },
    analytics: "services_marketing_ads",
    accent: {
      border: "border-orange-300/25", glow: "bg-orange-400/15",
      pill: "border-orange-300/30 bg-orange-300/10 text-orange-700 dark:text-orange-200",
      tile: "from-orange-400 to-rose-500", check: "bg-orange-400/15 text-orange-700 dark:text-orange-300",
      button: "bg-gradient-to-r from-orange-500 to-rose-600",
    },
  },
  {
    key: "website-subscription",
    icon: Globe,
    badge: { ro: "0 lei pentru dezvoltare", en: "No development fee" },
    title: { ro: "Website prin abonament", en: "Website by subscription" },
    tagline: { ro: "Site personalizat, construit pentru afacerea ta", en: "A custom site built for your business" },
    desc: {
      ro: "Primești un site de prezentare creat pe identitatea afacerii tale. Costul lunar acoperă hostingul, securitatea și mentenanța, în funcție de pachetul ales.",
      en: "Get a business website built around your brand. Your monthly plan covers hosting, security and maintenance.",
    },
    time: { ro: "Start · Business · Premium", en: "Start · Business · Premium" },
    includes: { ro: "În funcție de pachet", en: "Depending on your plan" },
    features: [
      { icon: Code2, text: { ro: "Design propriu, optimizat pentru mobil", en: "Custom, mobile-friendly design" } },
      { icon: Shield, text: { ro: "Hosting, SSL și mentenanță", en: "Hosting, SSL and maintenance" } },
      { icon: SearchCheck, text: { ro: "SEO tehnic și conectare la Google", en: "Technical SEO and Google integration" } },
      { icon: Share2, text: { ro: "Integrare social media și contact direct", en: "Social media integration and direct contact" } },
    ],
    cta: { ro: "Discută pe WhatsApp", en: "Chat on WhatsApp" },
    wa: {
      ro: "Bună! Aș vrea să aflu ce pachet de website prin abonament se potrivește afacerii mele.",
      en: "Hello! I’d like to find the website subscription plan that suits my business.",
    },
    details: WEBSITE_SUBSCRIPTION_PATH,
    analytics: "website_subscription",
    accent: {
      border: "border-violet-500/35",
      glow: "bg-violet-500/15",
      pill: "border-violet-500/25 bg-violet-500/10 text-violet-800 dark:text-violet-200",
      tile: "from-violet-600 via-indigo-600 to-blue-600",
      check: "bg-violet-500/10 text-violet-700 dark:text-violet-200",
      button: "bg-gradient-to-r from-violet-600 to-indigo-600",
    },
  },
];
// Published copy is keyed by array index. Append new entries and order them at render time.
export const SERVICE_ORDER = ["website", "shop", "apps", "ai", "seo-ai", "marketing-ads", "logo", "blog", "social", "qa", "website-subscription"] as const;
export const ORDERED_SERVICES = SERVICE_ORDER.flatMap((key) => {
  const service = SERVICES.find((candidate) => candidate.key === key);
  return service ? [service] : [];
});
export const AUDIT_COVERAGE: Copy[] = [
  { ro: "Securitate", en: "Security" },
  { ro: "Performanță", en: "Performance" },
  { ro: "SEO tehnic", en: "Technical SEO" },
  { ro: "Accesibilitate", en: "Accessibility" },
  { ro: "Priorități", en: "Priorities" },
];
