import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/Logo";
import { Loader2, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, MailCheck } from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3C29.7 34.7 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.3c-.5.4 6.5-4.7 6.5-15 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

type SignInErrorKind = "unconfirmed" | "invalid" | "rate_limit" | "generic";

const mapAuthError = (msg: string): { kind: SignInErrorKind; text: string } => {
  const m = (msg || "").toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return { kind: "unconfirmed", text: "Please confirm your email to sign in." };
  }
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid email or password")) {
    return { kind: "invalid", text: "Email or password is incorrect. Check for typos or create an account." };
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("over_") || m.includes("429")) {
    return { kind: "rate_limit", text: "Too many attempts. Please wait a moment and try again." };
  }
  if (m.includes("already registered") || m.includes("user already")) {
    return { kind: "generic", text: "An account with this email already exists. Try signing in instead." };
  }
  return { kind: "generic", text: msg || "Something went wrong. Please try again." };
};

const scorePassword = (pw: string): 0 | 1 | 2 | 3 => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 1;
  if (score <= 3) return 2;
  return 3;
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<{ kind: SignInErrorKind; text: string } | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : "/app";

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const startCooldown = () => setResendCooldown(60);

  const handleGoogle = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${safeNext}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      const m = (err?.message || "").toLowerCase();
      if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
        toast.error("Google sign-in is not enabled yet. It will work once Google is configured in the backend.");
      } else {
        toast.error(err?.message || "Could not start Google sign-in.");
      }
      setGoogleLoading(false);
    }
  };

  const handleResendConfirmation = async (targetEmail: string) => {
    if (resendCooldown > 0) return;
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Confirmation email sent. Check your inbox.");
      startCooldown();
    } catch (err: any) {
      const mapped = mapAuthError(err?.message || "");
      toast.error(mapped.text);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate(safeNext);
      } else {
        if (password.length < 8) {
          setFormError({ kind: "generic", text: "Password must be at least 8 characters." });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSentEmail(email);
        startCooldown();
      }
    } catch (err: any) {
      setFormError(mapAuthError(err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  const strength = scorePassword(password);
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["bg-border", "bg-destructive/70", "bg-accent/60", "bg-accent"][strength];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-0 gold-gradient opacity-20" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 70%, hsl(38 60% 55% / 0.1) 0%, transparent 50%)' }} />
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

          {sentEmail ? (
            <div>
              <div className="w-14 h-14 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center mb-6">
                <MailCheck className="w-6 h-6 text-accent" />
              </div>
              <h1 className="font-display text-3xl font-medium mb-2">Check your email</h1>
              <p className="font-body text-muted-foreground mb-6">
                We've sent a confirmation link to{" "}
                <span className="text-foreground font-medium">{sentEmail}</span>. Click it to activate your account.
              </p>
              <div className="rounded-lg border border-border bg-card p-4 mb-6">
                <p className="font-body text-xs text-muted-foreground">
                  Didn't get it? Check your spam folder, or resend below. The link expires in 24 hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleResendConfirmation(sentEmail)}
                disabled={resendCooldown > 0}
                className="w-full font-body text-sm font-medium border border-accent/40 text-accent rounded-lg py-3 hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSentEmail(null);
                  setIsLogin(true);
                  setPassword("");
                  setFormError(null);
                }}
                className="w-full font-body text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl font-medium mb-2">
                {isLogin ? "Welcome back" : "Create account"}
              </h1>
              <p className="font-body text-muted-foreground mb-8">
                {isLogin
                  ? "Sign in to continue staging rooms"
                  : "Get started with AI virtual staging"}
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full font-body text-sm font-medium border border-accent/40 text-foreground rounded-lg py-3 flex items-center justify-center gap-3 hover:bg-accent/5 hover:border-accent/60 transition-colors disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-border flex-1" />
                <span className="font-body text-xs text-muted-foreground uppercase tracking-wider">or</span>
                <div className="h-px bg-border flex-1" />
              </div>

              {formError && (
                <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-body text-sm text-foreground">{formError.text}</p>
                    {formError.kind === "unconfirmed" && email && (
                      <button
                        type="button"
                        onClick={() => handleResendConfirmation(email)}
                        disabled={resendCooldown > 0}
                        className="mt-2 font-body text-xs font-medium text-accent hover:underline disabled:opacity-50 disabled:no-underline"
                      >
                        {resendCooldown > 0 ? `Resend confirmation in ${resendCooldown}s` : "Resend confirmation email"}
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                      className="w-full font-body text-sm bg-card border border-border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
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
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={isLogin ? 6 : 8}
                      className="w-full font-body text-sm bg-card border border-border rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {!isLogin && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength >= i ? strengthColor : "bg-border"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="font-body text-xs text-muted-foreground mt-1.5">
                        {password.length === 0
                          ? "Use at least 8 characters."
                          : password.length < 8
                          ? "At least 8 characters required."
                          : `Password strength: ${strengthLabel}`}
                      </p>
                    </div>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full gold-gradient-animated text-accent-foreground font-body font-semibold text-sm py-3.5 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 mt-6"
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

              {isLogin && (
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        toast.error("Enter your email first, then click Forgot Password");
                        return;
                      }
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/auth`,
                        });
                        if (error) throw error;
                        toast.success("Password reset email sent! Check your inbox.");
                      } catch (err: any) {
                        toast.error(err.message);
                      }
                    }}
                    className="font-body text-xs text-muted-foreground hover:text-accent transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <p className="font-body text-sm text-muted-foreground text-center mt-6">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setFormError(null);
                  }}
                  className="text-accent font-medium hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
