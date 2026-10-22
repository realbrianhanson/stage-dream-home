import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "@/components/Logo";
import afterImg from "@/assets/after-staged.jpg";
import { getPlan } from "@/config/pricing";
import { Loader2, Eye, EyeOff, AlertCircle, MailCheck } from "lucide-react";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.4 6.3 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3C29.7 34.7 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.5 5.3c-.5.4 6.5-4.7 6.5-15 0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : "";

type SignInErrorKind = "unconfirmed" | "invalid" | "rate_limit" | "generic";

const mapAuthError = (msg: string): { kind: SignInErrorKind; text: string } => {
  const m = (msg || "").toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return { kind: "unconfirmed", text: "Confirm your email first. We sent you a link when you signed up." };
  }
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid email or password")) {
    return { kind: "invalid", text: "That email and password don't match. Check for typos, or create an account." };
  }
  if (m.includes("rate limit") || m.includes("too many") || m.includes("over_") || m.includes("429")) {
    return { kind: "rate_limit", text: "Too many attempts. Wait a minute, then try again." };
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
    } catch (err) {
      const msg = errorMessage(err);
      const m = msg.toLowerCase();
      if (m.includes("provider is not enabled") || m.includes("unsupported provider")) {
        setFormError({ kind: "generic", text: "Google sign-in isn't turned on yet. Use your email and password for now." });
      } else {
        setFormError({ kind: "generic", text: msg || "Google sign-in didn't start. Please try again." });
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
    } catch (err) {
      const mapped = mapAuthError(errorMessage(err));
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
        toast.success("Signed in");
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
    } catch (err) {
      setFormError(mapAuthError(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setFormError(null);
    if (!email) {
      setFormError({ kind: "generic", text: "Enter your email above, then choose Forgot password." });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
      if (error) throw error;
      toast.success("Password reset email sent. Check your inbox.");
    } catch (err) {
      setFormError(mapAuthError(errorMessage(err)));
    }
  };

  const strength = scorePassword(password);
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["bg-border", "bg-destructive/70", "bg-accent/60", "bg-accent"][strength];

  const inputClass =
    "w-full h-11 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      <div className="flex flex-col px-4 sm:px-8 py-6 sm:py-8">
        <Link to="/" className="self-start rounded-md" aria-label="RealVision home">
          <Logo />
        </Link>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-sm">
            {sentEmail ? (
              <div>
                <MailCheck className="w-6 h-6 text-accent mb-4" aria-hidden />
                <h1 className="text-2xl font-normal tracking-[-0.02em]">Check your email</h1>
                <p className="mt-2 text-muted-foreground">
                  We sent a confirmation link to <span className="text-foreground font-medium break-all">{sentEmail}</span>. Open it to finish creating your account.
                </p>
                <p className="mt-4 rounded-md border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground">
                  Nothing there? Check spam, or resend it. The link works for 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => handleResendConfirmation(sentEmail)}
                  disabled={resendCooldown > 0}
                  className="mt-6 w-full h-11 rounded-md border border-border bg-background text-sm font-medium hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="mt-3 w-full h-10 text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-2xl sm:text-3xl font-normal tracking-[-0.02em]">{isLogin ? "Sign in" : "Create your account"}</h1>
                <p className="mt-2 text-muted-foreground">
                  {isLogin ? "Pick up where you left off." : `The free plan includes ${getPlan("free").quotaLabel}. No card needed.`}
                </p>

                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="mt-8 w-full h-11 rounded-md border border-border bg-background text-sm font-medium flex items-center justify-center gap-3 hover:bg-card transition-colors disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <GoogleIcon />}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-6" aria-hidden>
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">or with email</span>
                  <div className="h-px bg-border flex-1" />
                </div>

                {formError && (
                  <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{formError.text}</p>
                      {formError.kind === "unconfirmed" && email && (
                        <button
                          type="button"
                          onClick={() => handleResendConfirmation(email)}
                          disabled={resendCooldown > 0}
                          className="mt-2 text-sm font-medium text-accent hover:underline disabled:opacity-50 disabled:no-underline"
                        >
                          {resendCooldown > 0 ? `Resend confirmation in ${resendCooldown}s` : "Resend confirmation email"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-sm font-medium mb-1.5">
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@brokerage.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="auth-password" className="block text-sm font-medium">
                        Password
                      </label>
                      {isLogin && (
                        <button type="button" onClick={handleForgot} className="text-xs text-muted-foreground hover:text-foreground">
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete={isLogin ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={isLogin ? 6 : 8}
                        aria-describedby={!isLogin ? "password-hint" : undefined}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                      </button>
                    </div>
                    {!isLogin && (
                      <div className="mt-2">
                        <div className="flex gap-1" aria-hidden>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className={`h-1 flex-1 rounded-sm transition-colors ${strength >= i ? strengthColor : "bg-border"}`} />
                          ))}
                        </div>
                        <p id="password-hint" className="text-xs text-muted-foreground mt-1.5">
                          {password.length === 0
                            ? "Use at least 8 characters."
                            : password.length < 8
                              ? `${8 - password.length} more character${8 - password.length === 1 ? "" : "s"} needed.`
                              : `Password strength: ${strengthLabel}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="gold-gradient-animated w-full h-11 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                    {isLogin ? "Sign in" : "Create account"}
                  </button>
                </form>

                <p className="text-sm text-muted-foreground text-center mt-6">
                  {isLogin ? "New to RealVision?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setFormError(null);
                    }}
                    className="text-accent font-medium hover:underline"
                  >
                    {isLogin ? "Create an account" : "Sign in"}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          By continuing you agree to the{" "}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="relative hidden lg:block overflow-hidden">
        <img src={afterImg} alt="A living room staged with RealVision" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="font-display text-4xl leading-tight tracking-[-0.02em] max-w-md">Show buyers the home it could be.</p>
          <p className="mt-3 max-w-md text-white/85">
            Upload a listing photo, pick a style, and download an MLS-ready image in about a minute.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
