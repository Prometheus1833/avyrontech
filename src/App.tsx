import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import LangRouteSync from "@/components/site/LangRouteSync";
import { pageView } from "@/lib/analytics";
import { resetManagedHead } from "@/lib/seo";


const Gdpr = lazy(() => import("./pages/Gdpr.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Portfolio = lazy(() => import("./pages/About.tsx"));
const AboutUs = lazy(() => import("./pages/AboutUs.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const ErrorPage = lazy(() => import("./pages/ErrorPage.tsx"));
const FlawlesstudioDemo = lazy(() => import("./pages/demos/FlawlesstudioDemo.tsx"));
const RetuvoDemo = lazy(() => import("./pages/demos/RetuvoDemo.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Blog = lazy(() => import("./pages/Blog.tsx"));
const ExamplePage = lazy(() => import("./pages/ExamplePage.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const ProjectPage = lazy(() => import("./pages/intern/ProjectPage.tsx"));
const InternHome = lazy(() => import("./pages/intern/InternHome.tsx"));
const ProductDetail = lazy(() => import("./pages/products/ProductPage.tsx"));
const CarePlans = lazy(() => import("./pages/products/CarePlansPage.tsx"));
const ProcessPage = lazy(() => import("./pages/ProcessPage.tsx"));


import CookieBanner from "@/components/site/CookieBanner";
import AppHostGuard from "@/components/auth/AppHostGuard";

const Notifications = lazy(() =>
  import("@/components/ui/sonner").then(({ Toaster }) => ({ default: Toaster })),
);
const MustChangePassword = lazy(() => import("@/components/auth/MustChangePassword"));

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

        <AppHostGuard>
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/en" element={<Index />} />
                <Route path="/gdpr" element={<Gdpr />} />
                <Route path="/en/privacy" element={<Gdpr />} />
                <Route path="/termeni" element={<Terms />} />
                <Route path="/en/terms" element={<Terms />} />
                <Route path="/costuri" element={<Pricing />} />
                <Route path="/costurisiproduse" element={<Pricing />} />
                <Route path="/en/pricing" element={<Pricing />} />
                <Route path="/produse/website-prezentare-premium" element={<ProductDetail />} />
                <Route path="/produse/identitate-social-media" element={<ProductDetail />} />
                <Route path="/produse/magazin-online" element={<ProductDetail />} />
                <Route path="/produse/aplicatii-web-si-mobile" element={<ProductDetail />} />
                <Route path="/produse/agent-ai-personalizat" element={<ProductDetail />} />
                <Route path="/produse/audit-website" element={<Navigate to="/?request=audit#cta" replace />} />
                <Route path="/produse/testare-qa-web-mobile" element={<ProductDetail />} />
                <Route path="/en/products/premium-presentation-website" element={<ProductDetail />} />
                <Route path="/en/products/social-media-identity" element={<ProductDetail />} />
                <Route path="/en/products/online-store" element={<ProductDetail />} />
                <Route path="/en/products/web-and-mobile-apps" element={<ProductDetail />} />
                <Route path="/en/products/personalized-ai-agent" element={<ProductDetail />} />
                <Route path="/en/products/website-audit" element={<Navigate to="/en?request=audit#cta" replace />} />
                <Route path="/en/products/qa-testing-web-mobile" element={<ProductDetail />} />
                <Route path="/pachete-mentenanta" element={<CarePlans />} />
                <Route path="/en/care-plans" element={<CarePlans />} />
                <Route path="/proces" element={<ProcessPage />} />
                <Route path="/en/process" element={<ProcessPage />} />

                <Route path="/despre" element={<Navigate to="/despre-noi" replace />} />
                <Route path="/despre-si-portofoliu" element={<Navigate to="/portofoliu" replace />} />
                <Route path="/despre-noi" element={<AboutUs />} />
                <Route path="/en/about" element={<AboutUs />} />
                <Route path="/portofoliu" element={<Portfolio />} />
                <Route path="/en/portfolio" element={<Portfolio />} />
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
      </BrowserRouter>
      <CookieBanner />
      <DeferredGlobalUi />
    </AuthProvider>
  </LanguageProvider>
);

export default App;
