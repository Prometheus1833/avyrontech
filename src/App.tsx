import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Gdpr from "./pages/Gdpr.tsx";
import Pricing from "./pages/Pricing.tsx";
import About from "./pages/About.tsx";
import NotFound from "./pages/NotFound.tsx";
import ErrorPage from "./pages/ErrorPage.tsx";
import FlawlesstudioDemo from "./pages/demos/FlawlesstudioDemo.tsx";
import RetuvoDemo from "./pages/demos/RetuvoDemo.tsx";
import Auth from "./pages/Auth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Profile from "./pages/Profile.tsx";
import Blog from "./pages/Blog.tsx";
import ExamplePage from "./pages/ExamplePage.tsx";

import CookieBanner from "@/components/site/CookieBanner";
import MustChangePassword from "@/components/auth/MustChangePassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/gdpr" element={<Gdpr />} />
              <Route path="/costuri" element={<Pricing />} />
              <Route path="/costurisiproduse" element={<Pricing />} />
              <Route path="/despre" element={<About />} />
              <Route path="/despre-si-portofoliu" element={<About />} />
              <Route path="/exemple/flawlesstudio" element={<FlawlesstudioDemo />} />
              <Route path="/exemple/retuvo" element={<RetuvoDemo />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/noutati" element={<Navigate to="/blog" replace />} />
              <Route path="/examples/:slug" element={<ExamplePage />} />
              
              
              <Route path="/auth" element={<Auth />} />
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <CookieBanner />
          <MustChangePassword />
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
