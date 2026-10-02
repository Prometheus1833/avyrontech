import { Link } from "react-router-dom";
import { useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Accessibility, Apple, ArrowRight, BadgeCheck, BarChart3, Bell, BookOpen, Box,
  Bug, Calendar, Check, Cloud, Code2, Cpu, CreditCard, Facebook, FileText,
  FlaskConical, Gauge, Globe, Hourglass, Image as ImageIcon, Instagram, Layers,
  MessageCircle, Music2, Package, PenTool, RefreshCw, ScanSearch, SearchCheck,
  Share2, Shield, ShoppingBag, Smartphone, Tag, Truck, Zap,
} from "lucide-react";
import PaymentMethods from "@/components/site/PaymentMethods";
import { useLang } from "@/i18n/LanguageContext";
import type { Lang } from "@/i18n/translations";
import { trackEvent } from "@/lib/analytics";
import Footer from "@/components/site/Footer";
import logo from "@/assets/avyron-logo.jpg";
import LangSwitch from "@/components/site/LangSwitch";
import ThemeToggle from "@/components/site/ThemeToggle";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageBackLink from "@/components/site/PageBackLink";
import QuickNav from "@/components/site/QuickNav";
import { LOGO3D_PATHS } from "@/data/logo3d";
import { SUBSCRIPTION_CATEGORIES, SUBSCRIPTION_PATH } from "@/data/subscriptionPlans";

/**
 * Public services hub.
 * - Every service renders through the same block: badge, icon tile, title,
 *   tagline, short description, delivery time, inclusions, two actions.
 * - No prices here: they live on each service page, where the configuration
 *   is known. This page only introduces the service and links forward.
 * - After the list, one short pointer to the subscriptions page.
 */

const SERVICE_SUMMARY_LIMIT = 7;

/** Picks the copy for the active language. */
const t = (copy: Copy, lang: Lang) => copy[lang];


type Copy = { ro: string; en: string };
type Feature = { icon: LucideIcon; text: Copy };

type Accent = {
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

type ServiceDef = {
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

const SERVICES: ServiceDef[] = [
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
    title: { ro: "Logo Dinamic 3D", en: "Dynamic 3D Logo" },
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
    wa: { ro: "Bună! Sunt interesat de un Logo Dinamic 3D.", en: "Hi! I'm interested in a Dynamic 3D Logo." },
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
          ro: "Facturare automată (SmartBill / Oblio) și conformitate ANAF",
          en: "Automated invoicing (SmartBill / Oblio) and tax compliance",
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
      ro: "Construim aplicații mobile și web custom — de la idee, prototip și UX, până la publicare în App Store, Google Play sau pe propriul tău domeniu. Lucrăm cu tehnologii moderne (React, React Native, Node, Supabase) care îți dau viteză, scalare reală și un cost de mentenanță predictibil pe termen lung.",
      en: "We build custom mobile and web apps — from idea, prototype and UX through to publishing on the App Store, Google Play or your own domain. We use modern technologies (React, React Native, Node, Supabase) that deliver speed, real scalability and predictable long-term maintenance cost.",
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
    badge: { ro: "Serviciu AI dedicat", en: "Dedicated AI service" },
    title: { ro: "Agentul tău AI personalizat", en: "Your personalized AI Agent" },
    tagline: { ro: "Chat site · WhatsApp · Automatizări", en: "Site chat · WhatsApp · Automations" },
    desc: {
      ro: "Un asistent AI construit special pentru afacerea ta — răspunde clienților 24/7 pe site și WhatsApp, preia comenzi, programează întâlniri și automatizează sarcini repetitive. Antrenat pe baza ta de date, produsele, prețurile și tonul brandului tău, devine un coleg digital care nu doarme niciodată.",
      en: "An AI assistant built specifically for your business — replies to clients 24/7 on your site and WhatsApp, takes orders, books appointments and automates repetitive tasks. Trained on your database, products, prices and brand tone, it becomes a digital teammate that never sleeps.",
    },
    time: { ro: "Timp aproximativ implementare: 5–14 zile", en: "Approx. implementation time: 5–14 days" },
    includes: { ro: "Include:", en: "Includes:" },
    features: [
      {
        icon: MessageCircle,
        text: {
          ro: "Chat AI interactiv pe site, integrabil în orice pagină",
          en: "Interactive AI chat on your site, embeddable on any page",
        },
      },
      {
        icon: Share2,
        text: {
          ro: "Integrare WhatsApp Business — același agent, același ton",
          en: "WhatsApp Business integration — same agent, same voice",
        },
      },
      {
        icon: Cloud,
        text: {
          ro: "Bază de date privată cu produsele, prețurile și politicile tale",
          en: "Private database with your products, pricing and policies",
        },
      },
      {
        icon: BadgeCheck,
        text: {
          ro: "Personalitate, ton și răspunsuri configurate pe brandul tău",
          en: "Personality, tone and replies tuned to your brand",
        },
      },
      {
        icon: Cpu,
        text: {
          ro: "Automatizări: comenzi, programări, lead-uri, follow-up",
          en: "Automations: orders, bookings, leads, follow-ups",
        },
      },
      {
        icon: Bell,
        text: {
          ro: "Notificări către echipă când clientul cere intervenție umană",
          en: "Notifications to your team when human handoff is needed",
        },
      },
      {
        icon: BarChart3,
        text: {
          ro: "Dashboard cu conversații, conversii și subiecte frecvente",
          en: "Dashboard with conversations, conversions and hot topics",
        },
      },
      {
        icon: RefreshCw,
        text: {
          ro: "Reantrenare periodică pe noile informații din afacerea ta",
          en: "Periodic retraining on new information from your business",
        },
      },
    ],
    cta: { ro: "Vreau un Agent AI", en: "I want an AI Agent" },
    wa: {
      ro: "Bună! Sunt interesat de un Agent AI personalizat pentru afacerea mea.",
      en: "Hi! I'm interested in a personalized AI Agent for my business.",
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
];

const AUDIT_COVERAGE: Copy[] = [
  { ro: "Securitate", en: "Security" },
  { ro: "Performanță", en: "Performance" },
  { ro: "SEO tehnic", en: "Technical SEO" },
  { ro: "Accesibilitate", en: "Accessibility" },
  { ro: "Priorități", en: "Priorities" },
];

const ServiceBlock = ({ service, lang }: { service: ServiceDef; lang: Lang }) => {
  const t = (copy: Copy) => copy[lang];
  const a = service.accent;

  return (
    <section
      id={service.key}
      data-service={service.key}
      className="mt-6 grid items-start gap-4 md:grid-cols-5"
    >
      <div
        className={`md:col-span-2 rounded-2xl border ${a.border} bg-gradient-to-br from-card to-background p-5 sm:p-6 relative overflow-hidden text-center`}
      >
        <div aria-hidden className={`absolute -top-16 -right-16 size-48 rounded-full ${a.glow} blur-3xl`} />
        <div className="relative">
          <div
            className={`inline-flex items-center gap-2 rounded-full border ${a.pill} px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]`}
          >
            <service.icon className="size-3.5" aria-hidden />
            {t(service.badge)}
          </div>
          <div
            className={`mt-5 mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${a.tile} shadow-[0_18px_45px_-18px_rgba(0,0,0,0.65)]`}
          >
            <service.icon className="size-8 text-white" aria-hidden />
          </div>
          <h2 className="mt-4 font-display text-2xl sm:text-3xl font-extrabold">{t(service.title)}</h2>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">{t(service.tagline)}</p>
          <p className="mt-3 text-xs sm:text-sm text-foreground/70 leading-snug text-left">{t(service.desc)}</p>
          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full border ${a.border} bg-foreground/[0.04] px-3 py-1.5 text-[11px] text-foreground/70`}
          >
            <Hourglass className="size-3.5" aria-hidden />
            {t(service.time)}
          </div>
        </div>
      </div>

      <div className="md:col-span-3 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 backdrop-blur">
        <div className="text-[11px] uppercase tracking-[0.3em] text-foreground/50">{t(service.includes)}</div>
        <ul className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {service.features.slice(0, SERVICE_SUMMARY_LIMIT).map((feature) => (
            <li key={feature.text[lang]} className="flex items-start gap-2 text-sm text-foreground/85">
              <span className={`mt-0.5 size-5 rounded-md grid place-items-center shrink-0 ${a.check}`}>
                <feature.icon className="size-3.5" aria-hidden />
              </span>
              <span>{t(feature.text)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={`https://wa.me/40734605055?text=${encodeURIComponent(t(service.wa))}`}
            onClick={() => trackEvent("contact_click", { method: "whatsapp", location: service.analytics })}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center gap-2 rounded-full ${a.button} px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90`}
          >
            <MessageCircle className="size-4" aria-hidden />
            {t(service.cta)}
          </a>
          <Link
            to={t(service.details)}
            onClick={() => trackEvent("product_details_click", { product: service.details.ro })}
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.05] px-5 py-2.5 text-sm font-semibold hover:bg-foreground/[0.12] hover:border-foreground/35 transition-all duration-300"
          >
            {lang === "ro" ? "Vezi detalii" : "See details"}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  const { lang } = useLang();
  const ro = lang === "ro";

  useEffect(() => {
    window.scrollTo(0, 0);
    const title = ro
      ? "Servicii digitale personalizate & costuri | Avyron"
      : "Custom Digital AVYRON Services | Avyron";
    const description = ro
      ? "Descoperă serviciile digitale Avyron: site-uri profesionale, identitate vizuală, magazine online, bloguri, aplicații, automatizări și soluții AI adaptate fiecărui proiect."
      : "Explore Avyron digital services: professional websites, visual identity, online stores, blogs, apps, automations and AI solutions tailored to each project.";
    Promise.all([import("@/lib/seo"), import("@/lib/structuredData")]).then(
      ([{ setPageMeta, setJsonLd }, { organizationLd, breadcrumbLd }]) => {
        setPageMeta({
          title,
          description,
          path: ro ? "/servicii" : "/en/services",
          alternates: { ro: "/servicii", en: "/en/services" },
          image: "/og/pricing.jpg",
          imageAlt: ro
            ? "Pachete de prețuri Avyron — site-uri web, magazine online și mentenanță"
            : "Avyron pricing packages — websites, online stores and care plans",
        });

        setJsonLd("ld-organization", organizationLd);
        setJsonLd(
          "ld-breadcrumb",
          breadcrumbLd([
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Servicii AVYRON" : "AVYRON Services",
              path: ro ? "/servicii" : "/en/services",
            },
          ]),
        );
      },
    );
  }, [ro]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <QuickNav
        items={[
          { id: "prezentare", label: ro ? "Servicii" : "Services", icon: ShoppingBag },
          { id: "audit", label: ro ? "Audit gratuit" : "Free audit", icon: ScanSearch },
          { id: "abonamente", label: ro ? "Abonamente" : "Plans", icon: RefreshCw },
          { id: "cta", label: ro ? "Contact" : "Contact", icon: MessageCircle },
        ]}
      />
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
        <nav
          aria-label={ro ? "Acțiuni pagină servicii" : "Services page actions"}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3"
        >
          <PageBackLink to={ro ? "/" : "/en"} label={ro ? "Înapoi" : "Back"} />

          <a
            href={ro ? "/#hero" : "/en#hero"}
            aria-label={ro ? "Acasă Avyron" : "Avyron home"}
            className="flex min-w-0 items-center justify-self-center gap-2 rounded-full px-1.5 py-1 transition-colors hover:bg-foreground/5"
          >
            <img src={logo} alt="Avyron" className="size-7 rounded-md ring-1 ring-white/20 sm:size-8" />
            <span className="hidden font-display text-xs tracking-[0.2em] min-[380px]:inline sm:text-sm sm:tracking-[0.25em]">AVYRON</span>
          </a>

          <div className="inline-flex min-h-9 items-center justify-self-end gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-2 py-1 backdrop-blur">
            <LangSwitch />
            <span aria-hidden className="h-3 w-px bg-foreground/15" />
            <ThemeToggle />
          </div>
        </nav>

        <Breadcrumbs
          className="mt-4 sm:mt-6"
          items={[
            { name: ro ? "Acasă" : "Home", path: ro ? "/" : "/en" },
            {
              name: ro ? "Servicii AVYRON" : "AVYRON Services",
              path: ro ? "/servicii" : "/en/services",
            },
          ]}
        />

        {/* Hero */}
        <section id="prezentare" className="mt-12 scroll-mt-28 text-center">
          <h1 className="mt-6 font-display text-3xl sm:text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight px-2">
            <span className="bg-gradient-to-r from-foreground via-cyan-500 to-blue-600 dark:from-white dark:via-cyan-200 dark:to-blue-400 bg-clip-text text-transparent">
              {ro
                ? "Servicii digitale construite pentru fiecare proiect"
                : "Digital services built for every project"}
            </span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-foreground/70 text-base md:text-lg">
            {ro
              ? "Fiecare serviciu Avyron este configurat în jurul obiectivelor proiectului. Designul, funcționalitățile, infrastructura și integrările sunt adaptate afacerii tale, nu alese dintr-un șablon."
              : "Every Avyron service is configured around the project's goals. Design, features, infrastructure and integrations are tailored to your business, not selected from a template."}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-foreground/45">
            {ro
              ? "Prețurile se calculează pe pagina fiecărui serviciu, în funcție de configurație"
              : "Pricing is calculated on each service page, based on the configuration"}
          </p>
        </section>

        {/* Audit — compact entry; the request continues in the protected form. */}
        <section
          id="audit"
          data-testid="free-audit-card"
          className="relative mt-8 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-r from-amber-400/[0.08] via-card to-orange-500/[0.06] p-4"
        >
          <div aria-hidden className="absolute -right-10 -top-12 size-36 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300">
                <ScanSearch className="size-4" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-base font-extrabold sm:text-lg">
                  {ro ? "Audit Produs Digital — gratuit" : "Digital Product Audit — free"}
                </h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-foreground/70 sm:text-sm">
                  {ro
                    ? "Evaluăm website-ul sau aplicația și primești prioritățile clare care merită rezolvate mai întâi."
                    : "We evaluate your website or app and return the clear priorities worth addressing first."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ul data-testid="audit-coverage-list" className="flex flex-wrap items-center gap-1.5">
                {AUDIT_COVERAGE.map((item) => (
                  <li
                    key={item[lang]}
                    className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2.5 py-1 text-[11px] text-foreground/70"
                  >
                    {t(item, lang)}
                  </li>
                ))}
              </ul>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground/60">
                <Hourglass className="size-3.5" aria-hidden />
                {ro ? "Raport în 2–4 zile" : "Report in 2–4 days"}
              </span>
              <Link
                to={ro ? "/?request=audit#cta" : "/en?request=audit#cta"}
                onClick={() => trackEvent("audit_form_click", { location: "pricing_product" })}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {ro ? "Vreau auditul" : "I want an audit"}
              </Link>
            </div>
          </div>
        </section>

        {/* All services — one uniform block each */}
        <div data-testid="services-list" className="mt-6">
          {SERVICES.map((service) => (
            <ServiceBlock key={service.key} service={service} lang={lang} />
          ))}
        </div>

        {/* Subscriptions — one short pointer, plans are split per service */}
        <section
          id="abonamente"
          data-testid="subscriptions-teaser"
          className="mt-12 scroll-mt-28 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/[0.10] via-card to-cyan-400/[0.06] p-5 sm:p-6"
        >
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
                <RefreshCw className="size-3.5" aria-hidden />
                {ro ? "Abonamente" : "Subscriptions"}
              </span>
              <h2 className="mt-3 font-display text-xl font-extrabold sm:text-2xl">
                {ro ? "Fiecare serviciu are abonamentul lui" : "Every service has its own plan"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/70">
                {ro
                  ? "Nu plătești pentru ce nu ai. Abonamentele sunt separate pe tip de produs — site, magazin, blog, agent AI sau aplicație — și acoperă mentenanță, actualizări, backup, suport și conținut, fiecare cu preț și conținut propriu."
                  : "You don't pay for what you don't have. Plans are separated by product type — website, online store, blog, AI agent or app — each covering maintenance, updates, backups, support and content, with its own price and inclusions."}
              </p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <li key={category.key}>
                    <Link
                      to={`${SUBSCRIPTION_PATH[lang]}#abonamente-${category.key}`}
                      onClick={() => trackEvent("subscription_anchor_click", { category: category.key })}
                      className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 bg-foreground/[0.04] px-3 py-1.5 text-[11px] font-medium text-foreground/75 transition-colors hover:border-brand/40 hover:text-foreground"
                    >
                      {category.copy[lang].title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to={SUBSCRIPTION_PATH[lang]}
              onClick={() => trackEvent("subscriptions_click", { location: "services" })}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90"
            >
              {ro ? "Vezi abonamentele" : "See the plans"}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </section>

        {/* Self-serve note */}
        <section className="mt-10 rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 backdrop-blur">
          <p className="text-sm md:text-base text-foreground/75 leading-relaxed">
            {ro
              ? "Dacă alegi să administrezi singur site-ul, totul este pregătit pentru asta. Fiecare client primește la livrare un produs complet funcțional, optimizat și gata de scalare, găzduit la partenerii noștri de încredere cu care colaborăm de mulți ani — fără costuri suplimentare ascunse. Securitatea, viteza de încărcare și performanța pe toate dispozitivele sunt validate riguros prin testări automate și manuale în mediile noastre de dezvoltare, iar la predare primești documentație clară și acces complet la panoul de administrare."
              : "If you choose to manage the site yourself, everything is set up for it. Each client receives a fully functional, optimized and scale-ready product on delivery, hosted with our long-trusted partners — with no hidden additional costs. Security, load speed and cross-device performance are rigorously validated through automated and manual testing in our development environments, and at handover you receive clear documentation and full access to the admin panel."}
          </p>
        </section>

        {/* Payments */}
        <div className="mt-12">
          <PaymentMethods />
        </div>

        {/* CTA */}
        <section id="cta" className="mt-16 scroll-mt-28 rounded-3xl border border-foreground/10 bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-pink-500/15 p-8 md:p-10 text-center backdrop-blur relative overflow-hidden">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold">
            {ro ? "Începem cu o evaluare gratuită" : "Let's start with a free evaluation"}
          </h2>
          <p className="mt-3 text-foreground/70 max-w-xl mx-auto">
            {ro
              ? "Spune-ne ce vrei să construiești sau ce vrei să îmbunătățim — îți răspundem în maxim 24h."
              : "Tell us what you want to build or improve — we reply within 24h."}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://wa.me/40734605055"
              onClick={() => trackEvent("contact_click", { method: "whatsapp", location: "pricing_footer" })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe5a] px-6 py-3 text-sm font-bold text-white transition-colors"
            >
              WhatsApp
            </a>
            <a
              href="mailto:contact@avyron.ro"
              onClick={() => trackEvent("contact_click", { method: "email", location: "pricing_footer" })}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 px-6 py-3 text-sm font-bold transition-colors"
            >
              contact@avyron.ro
            </a>
            <Link
              to="/#examples"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 text-background hover:bg-cyan-300 px-6 py-3 text-sm font-bold transition-colors"
            >
              {ro ? "Vreau un demo" : "I want a demo"}
            </Link>
            <a
              href="tel:+40734605055"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/[0.06] hover:bg-foreground/[0.12] px-6 py-3 text-sm font-bold text-foreground transition-colors"
            >
              {ro ? "Telefon" : "Phone"}
            </a>
          </div>
        </section>
      </div>
      <Footer />
    </main>
  );
};

export default Services;

