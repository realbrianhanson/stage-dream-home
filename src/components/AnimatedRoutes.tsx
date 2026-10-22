import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PageTransition from "@/components/PageTransition";
import Landing from "@/pages/Landing";

const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const SharedStaging = lazy(() => import("@/pages/SharedStaging"));
const ListingPage = lazy(() => import("@/pages/ListingPage"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("@/pages/CheckoutCancel"));
// Dev-only UI review page; Vite drops it from production builds.
const DevStudio = import.meta.env.DEV ? lazy(() => import("@/pages/DevStudio")) : null;

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite">
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <span className="w-4 h-4 rounded-full border-2 border-border border-t-accent animate-spin" aria-hidden />
      Loading…
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <RouteFallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/app" element={<ProtectedRoute><PageTransition><Index /></PageTransition></ProtectedRoute>} />
        <Route path="/gallery" element={<ProtectedRoute><PageTransition><Gallery /></PageTransition></ProtectedRoute>} />
        <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
        <Route path="/share/:token" element={<PageTransition><SharedStaging /></PageTransition>} />
        <Route path="/listing/:token" element={<PageTransition><ListingPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
        <Route path="/billing/success" element={<PageTransition><CheckoutSuccess /></PageTransition>} />
        <Route path="/billing/cancel" element={<PageTransition><CheckoutCancel /></PageTransition>} />
        {DevStudio && <Route path="/__studio" element={<DevStudio />} />}
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </Suspense>
  );
};

export default AnimatedRoutes;
