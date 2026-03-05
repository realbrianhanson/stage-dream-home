import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/app");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-0 gold-gradient opacity-20" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Logo light />
          <div>
            <h2 className="font-display text-4xl xl:text-5xl text-primary-foreground font-medium leading-tight mb-6">
              Transform empty spaces into{" "}
              <span className="italic text-accent">stunning homes</span>
            </h2>
            <p className="font-body text-primary-foreground/60 text-lg max-w-md">
              AI-powered virtual staging that helps you sell properties faster with beautiful, photorealistic furnishings.
            </p>
          </div>
          <p className="font-body text-primary-foreground/30 text-sm">
            © 2026 RealVision
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden mb-10">
            <Logo />
          </div>

          <h1 className="font-display text-3xl font-medium mb-2">
            {isLogin ? "Welcome back" : "Create account"}
          </h1>
          <p className="font-body text-muted-foreground mb-8">
            {isLogin
              ? "Sign in to continue staging rooms"
              : "Get started with AI virtual staging"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-body text-sm font-medium text-muted-foreground block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full font-body text-sm bg-card border border-border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div>
              <label className="font-body text-sm font-medium text-muted-foreground block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full font-body text-sm bg-card border border-border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full gold-gradient text-accent-foreground font-body font-semibold text-sm py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="font-body text-sm text-muted-foreground text-center mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
