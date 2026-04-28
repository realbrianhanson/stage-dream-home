import { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import PageTransition from "@/components/PageTransition";
import Landing from "@/pages/Landing";

const Index = lazy(() => import("@/pages/Index"));
const Auth = lazy(() => import("@/pages/Auth"));
const Gallery = lazy(() => import("@/pages/Gallery"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const SharedStaging = lazy(() => import("@/pages/SharedStaging"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background grain-overlay flex flex-col items-center justify-center gap-5">
    <div
      className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
      style={{ boxShadow: "0 0 12px hsl(38 60% 55% / 0.6)" }}
    />
    <p className="font-body text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
      Loading
    </p>
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
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
          <Route path="/app" element={<ProtectedRoute><PageTransition><Index /></PageTransition></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><PageTransition><Gallery /></PageTransition></ProtectedRoute>} />
          <Route path="/pricing" element={<PageTransition><Pricing /></PageTransition>} />
          <Route path="/share/:token" element={<PageTransition><SharedStaging /></PageTransition>} />
          <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
          <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

export default AnimatedRoutes;
