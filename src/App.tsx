import { Suspense, useEffect, useRef, useState } from "react";
import { lazyWithRetry, clearChunkReloadFlag } from "@/lib/lazyWithRetry";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import LangRouteSync from "@/components/site/LangRouteSync";
import { pageView } from "@/lib/analytics";
import { resetManagedHead } from "@/lib/seo";
import { FEATURES } from "@/config/features";


const Gdpr = lazyWithRetry(() => import("./pages/Gdpr.tsx"));
const Terms = lazyWithRetry(() => import("./pages/Terms.tsx"));
const CookiePolicy = lazyWithRetry(() => import("./pages/CookiePolicy.tsx"));
const Services = lazyWithRetry(() => import("./pages/Services.tsx"));
const Configurator = lazyWithRetry(() => import("./pages/Configurator.tsx"));
const AboutUs = lazyWithRetry(() => import("./pages/AboutUs.tsx"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound.tsx"));
const ErrorPage = lazyWithRetry(() => import("./pages/ErrorPage.tsx"));
const FlawlesstudioDemo = lazyWithRetry(() => import("./pages/demos/FlawlesstudioDemo.tsx"));
const RetuvoDemo = lazyWithRetry(() => import("./pages/demos/RetuvoDemo.tsx"));
const Auth = lazyWithRetry(() => import("./pages/Auth.tsx"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword.tsx"));
const Profile = lazyWithRetry(() => import("./pages/Profile.tsx"));
const Blog = lazyWithRetry(() => import("./pages/Blog.tsx"));
const ExamplePage = lazyWithRetry(() => import("./pages/ExamplePage.tsx"));
const Unsubscribe = lazyWithRetry(() => import("./pages/Unsubscribe.tsx"));
const ProjectPage = lazyWithRetry(() => import("./pages/intern/ProjectPage.tsx"));
const InternHome = lazyWithRetry(() => import("./pages/intern/InternHome.tsx"));
const InternBlog = lazyWithRetry(() => import("./pages/intern/InternBlog.tsx"));
const ServiceDetail = lazyWithRetry(() => import("./pages/services/ServicePage.tsx"));
const QaTesting = lazyWithRetry(() => import("./pages/services/QaTestingPage.tsx"));
const MaintenancePartnerships = lazyWithRetry(() => import("./pages/MaintenancePartnerships.tsx"));
const BlogProfessional = lazyWithRetry(() => import("./pages/services/BlogProfessional.tsx"));
const LogoDinamic3D = lazyWithRetry(() => import("./pages/services/LogoDinamic3DPage.tsx"));
const LogoStudio = lazyWithRetry(() => import("./pages/services/LogoStudioPage.tsx"));
const AiOsConsole = lazyWithRetry(() => import("./pages/intern/AiOs.tsx"));
const ProduseApp = lazyWithRetry(() => import("./features/produse/ProduseApp.tsx"));
const InternationalProductsHome = lazyWithRetry(() => import("./features/produse/pages/InternationalHome.tsx"));
const AiProjects = lazyWithRetry(() => import("./pages/intern/AiProjects.tsx"));
const AiProjectPage = lazyWithRetry(() => import("./pages/intern/AiProjectPage.tsx"));
const Finance = lazyWithRetry(() => import("./pages/intern/Finance.tsx"));
const ProduseAvyronOs = lazyWithRetry(() => import("./pages/intern/ProduseAvyron.tsx"));
const ServiciiAvyronOs = lazyWithRetry(() => import("./pages/intern/ServiciiAvyron.tsx"));
const AvyEngine = lazyWithRetry(() => import("./pages/intern/AvyEngine.tsx"));
const Biblioteca = lazyWithRetry(() => import("./pages/Biblioteca.tsx"));
const AvyChat = lazyWithRetry(() => import("@/components/ai/AvyChat"));
const NewsletterPrompt = lazyWithRetry(() => import("@/components/site/NewsletterPrompt"));

const DeferredNewsletterPrompt = () => {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const excluded = /^\/(auth|autentificare|profil|intern|finance|gdpr|en\/privacy|termeni|en\/terms|politica-cookies|en\/cookie-policy|unsubscribe|403|500|offline|mentenanta|exemple|examples|demo)(\/|$)/.test(pathname);
  useEffect(() => {
    setReady(false);
    if (excluded) return;
    const timer = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, [excluded, pathname]);
  if (!ready || excluded) return null;
  return <Suspense fallback={null}><NewsletterPrompt /></Suspense>;
};

/** Butonul AVY apare pe paginile comerciale, nu pe cele private sau pe demo-uri. */
const AvyLauncher = () => {
  const { pathname } = useLocation();
  const [ready, setReady] = useState(false);
  const excluded = /^\/(auth|autentificare|profil|intern|exemple|examples|demo|forgot-password|reset-password|403|500|offline|mentenanta|unsubscribe)/.test(pathname);
  useEffect(() => {
    if (excluded) return;
    const timer = window.setTimeout(() => setReady(true), 1800);
    return () => window.clearTimeout(timer);
  }, [excluded, pathname]);
  if (excluded || !ready) return null;
  return (
    <Suspense fallback={null}>
      <AvyChat />
    </Suspense>
  );
};


import CookieBanner from "@/components/site/CookieBanner";
import AppHostGuard from "@/components/auth/AppHostGuard";

const Notifications = lazyWithRetry(() =>
  import("@/components/ui/sonner").then(({ Toaster }) => ({ default: Toaster })),
);
const MustChangePassword = lazyWithRetry(() => import("@/components/auth/MustChangePassword"));

/**
 * Notification and account-dialog packages are useful only after interaction
 * or after a session is found. Keeping them out of the first render prevents
 * private Radix UI code from entering the public homepage preload graph.
 */
const DeferredGlobalUi = () => {
  const { user } = useAuth();
  const [ready, setReady] = useState(Boolean(user));

  useEffect(() => {
    if (user) {
      setReady(true);
      return;
    }
    const activate = () => setReady(true);
    const timer = window.setTimeout(activate, 2500);
    window.addEventListener("pointerdown", activate, { once: true, passive: true });
    window.addEventListener("keydown", activate, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };
  }, [user]);

  return (
    <Suspense fallback={null}>
      {ready && <Notifications />}
      {user && <MustChangePassword />}
    </Suspense>
  );
};

const AnalyticsTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    pageView(pathname);
  }, [pathname]);
  return null;
};

/**
 * Wipes the previous route's managed head (hreflang, og:locale:alternate,
 * JSON-LD graph) during render — i.e. BEFORE the page effects of the new route
 * write their own tags. Guarantees no Product/Service schema survives a
 * navigation to pricing or the homepage.
 */
const HeadManager = () => {
  const { pathname } = useLocation();
  const last = useRef<string | null>(null);
  if (last.current !== pathname) {
    last.current = pathname;
    resetManagedHead();
  }
  return null;
};

const App = () => (
  <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <HeadManager />
        <LangRouteSync />
        <AnalyticsTracker />
        <AvyLauncher />
        <DeferredNewsletterPrompt />

        <AppHostGuard>
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/en" element={<Index />} />
                <Route path="/gdpr" element={<Gdpr />} />
                <Route path="/en/privacy" element={<Gdpr />} />
                <Route path="/termeni" element={<Terms />} />
                <Route path="/en/terms" element={<Terms />} />
                <Route path="/politica-cookies" element={<CookiePolicy />} />
                <Route path="/en/cookie-policy" element={<CookiePolicy />} />
                {/* Produse Avyron este public implicit; VITE_PRODUSE_LIVE=0 îl
                    poate retrage temporar din prerender, sitemap și hreflang. */}
                {FEATURES.produse && (
                  <>
                    <Route path="/produse/*" element={<ProduseApp />} />
                    <Route path="/en/products/*" element={<ProduseApp />} />
                    <Route path="/it/prodotti" element={<InternationalProductsHome lang="it" />} />
                    <Route path="/hu/termekek" element={<InternationalProductsHome lang="hu" />} />
                    <Route path="/de/produkte" element={<InternationalProductsHome lang="de" />} />
                    <Route path="/fr/produits" element={<InternationalProductsHome lang="fr" />} />
                    <Route path="/pl/produkty" element={<InternationalProductsHome lang="pl" />} />
                  </>
                )}
                <Route path="/configurator" element={<Configurator />} />
                <Route path="/en/configurator" element={<Configurator />} />
                <Route path="/servicii" element={<Services />} />
                <Route path="/en/services" element={<Services />} />
                <Route path="/servicii/website-prezentare-profesional" element={<ServiceDetail />} />
                <Route path="/servicii/creare-logo-3d-dinamic-cinematic" element={<LogoDinamic3D />} />
                <Route path="/en/services/cinematic-dynamic-3d-logo-design" element={<LogoDinamic3D />} />
                <Route path="/servicii/creare-logo-3d-dinamic-cinematic/creeaza" element={<LogoStudio />} />
                <Route path="/en/services/cinematic-dynamic-3d-logo-design/create" element={<LogoStudio />} />
                <Route path="/servicii/identitate-social-media" element={<ServiceDetail />} />
                <Route path="/servicii/magazin-online" element={<ServiceDetail />} />
                <Route path="/servicii/blog-profesional" element={<BlogProfessional />} />
                <Route path="/servicii/aplicatii-si-platforme" element={<ServiceDetail />} />
                <Route path="/servicii/automatizari-si-ai" element={<ServiceDetail />} />
                <Route path="/servicii/audit-website" element={<Navigate to="/?request=audit#cta" replace />} />
                <Route path="/servicii/qa-testing-web-mobile" element={<QaTesting />} />
                <Route path="/en/services/professional-presentation-website" element={<ServiceDetail />} />
                <Route path="/en/services/social-media-identity" element={<ServiceDetail />} />
                <Route path="/en/services/online-store" element={<ServiceDetail />} />
                <Route path="/en/services/professional-blog" element={<BlogProfessional />} />
                <Route path="/en/services/apps-and-platforms" element={<ServiceDetail />} />
                <Route path="/en/services/automation-and-ai" element={<ServiceDetail />} />
                <Route path="/en/services/website-audit" element={<Navigate to="/en?request=audit#cta" replace />} />
                <Route path="/en/services/web-mobile-qa-testing" element={<QaTesting />} />
                {/* Client-side safety net for bookmarks; production serves the
                    same mappings as HTTP 301 redirects at the edge. */}
                <Route path="/costuri" element={<Navigate to="/servicii" replace />} />
                <Route path="/costurisiproduse" element={<Navigate to="/servicii" replace />} />
                <Route path="/en/pricing" element={<Navigate to="/en/services" replace />} />
                <Route path="/produse/website-prezentare-premium" element={<Navigate to="/servicii/website-prezentare-profesional" replace />} />
                <Route path="/en/products/premium-presentation-website" element={<Navigate to="/en/services/professional-presentation-website" replace />} />
                <Route path="/produse/identitate-social-media" element={<Navigate to="/servicii/identitate-social-media" replace />} />
                <Route path="/en/products/social-media-identity" element={<Navigate to="/en/services/social-media-identity" replace />} />
                <Route path="/produse/magazin-online" element={<Navigate to="/servicii/magazin-online" replace />} />
                <Route path="/en/products/online-store" element={<Navigate to="/en/services/online-store" replace />} />
                <Route path="/produse/blog-profesional" element={<Navigate to="/servicii/blog-profesional" replace />} />
                <Route path="/en/products/professional-blog" element={<Navigate to="/en/services/professional-blog" replace />} />
                <Route path="/produse/aplicatii-web-si-mobile" element={<Navigate to="/servicii/aplicatii-si-platforme" replace />} />
                <Route path="/en/products/web-and-mobile-apps" element={<Navigate to="/en/services/apps-and-platforms" replace />} />
                <Route path="/produse/agent-ai-personalizat" element={<Navigate to="/servicii/automatizari-si-ai" replace />} />
                <Route path="/en/products/personalized-ai-agent" element={<Navigate to="/en/services/automation-and-ai" replace />} />
                <Route path="/produse/testare-qa-web-mobile" element={<Navigate to="/servicii/qa-testing-web-mobile" replace />} />
                <Route path="/en/products/qa-testing-web-mobile" element={<Navigate to="/en/services/web-mobile-qa-testing" replace />} />
                <Route path="/produse/audit-website" element={<Navigate to="/?request=audit#cta" replace />} />
                <Route path="/en/products/website-audit" element={<Navigate to="/en?request=audit#cta" replace />} />
                <Route path="/servicii/logo" element={<Navigate to="/servicii/creare-logo-3d-dinamic-cinematic" replace />} />
                <Route path="/en/services/logo" element={<Navigate to="/en/services/cinematic-dynamic-3d-logo-design" replace />} />
                {/* Biblioteca este publică și indexabilă, dar intrările ei
                    rămân exclusiv în paginile serviciilor. */}
                {FEATURES.biblioteca && (
                  <>
                    <Route path="/biblioteca" element={<Biblioteca />} />
                    <Route path="/en/library" element={<Biblioteca />} />
                  </>
                )}
                <Route path="/mentenanta-si-colaborari" element={<MaintenancePartnerships />} />
                <Route path="/en/maintenance-and-partnerships" element={<MaintenancePartnerships />} />
                <Route path="/pachete-mentenanta" element={<Navigate to="/mentenanta-si-colaborari" replace />} />
                <Route path="/en/care-plans" element={<Navigate to="/en/maintenance-and-partnerships" replace />} />

                <Route path="/despre" element={<Navigate to="/despre-noi" replace />} />
                <Route path="/despre-si-portofoliu" element={<Navigate to="/servicii/website-prezentare-profesional#portofoliu" replace />} />
                <Route path="/despre-noi" element={<AboutUs />} />
                <Route path="/en/about" element={<AboutUs />} />
                <Route path="/portofoliu" element={<Navigate to="/servicii/website-prezentare-profesional#portofoliu" replace />} />
                <Route path="/en/portfolio" element={<Navigate to="/en/services/professional-presentation-website#portofoliu" replace />} />
                <Route path="/exemple/flawlesstudio" element={<FlawlesstudioDemo />} />
                <Route path="/exemple/retuvo" element={<RetuvoDemo />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<Blog />} />
                <Route path="/en/blog" element={<Blog />} />
                <Route path="/en/blog/:slug" element={<Blog />} />
                <Route path="/noutati" element={<Navigate to="/blog" replace />} />
                <Route path="/examples/:slug" element={<ExamplePage />} />

                <Route path="/auth" element={<Auth />} />
                <Route path="/autentificare" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/profil"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/finance"
                  element={
                    <ProtectedRoute>
                      <Finance />
                    </ProtectedRoute>
                  }
                />
                <Route path="/403" element={<ErrorPage variant="403" />} />
                <Route path="/500" element={<ErrorPage variant="500" />} />
                <Route path="/mentenanta" element={<ErrorPage variant="maintenance" />} />
                <Route path="/offline" element={<ErrorPage variant="offline" />} />
                <Route path="/unsubscribe" element={<Unsubscribe />} />
                <Route
                  path="/intern"
                  element={
                    <ProtectedRoute>
                      <InternHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/blog"
                  element={
                    <ProtectedRoute>
                      <InternBlog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/servicii"
                  element={
                    <ProtectedRoute>
                      <ServiciiAvyronOs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/produse"
                  element={
                    <ProtectedRoute>
                      <ProduseAvyronOs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/ai-os"
                  element={
                    <ProtectedRoute>
                      <AiOsConsole />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/ai-projects"
                  element={
                    <ProtectedRoute>
                      <AiProjects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/ai-projects/:slug"
                  element={
                    <ProtectedRoute>
                      <AiProjectPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/avy-engine"
                  element={
                    <ProtectedRoute>
                      <AvyEngine />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intern/projects"
                  element={<Navigate to="/intern" replace />}
                />
                <Route
                  path="/intern/projects/:slug"
                  element={
                    <ProtectedRoute>
                      <ProjectPage />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppHostGuard>
        <CookieBanner />
      </BrowserRouter>
      <DeferredGlobalUi />
    </AuthProvider>
  </LanguageProvider>
);

export default App;
