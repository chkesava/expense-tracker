import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { toast } from "../lib/toast";
import { fieldClass, labelClass } from "../lib/formStyles";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

type AuthMode = "login" | "signup" | "forgot";

const authFieldClass = `${fieldClass} px-4 py-3.5 shadow-inner`;

export default function AuthPage() {
  const { login, loginWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const { settings: systemSettings } = useSystemSettings();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        toast.success("Welcome back!");
      } else if (mode === "signup") {
        if (systemSettings?.disableSignups) {
          throw new Error("New registrations are temporarily disabled by the administrator.");
        }
        if (!displayName) throw new Error("Please enter your name");
        await signUpWithEmail(email, password, displayName);
        toast.success("Account created successfully!");
      } else {
        await resetPassword(email);
        toast.success("Password reset email sent!");
        setMode("login");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await login();
      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6 transition-colors">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[5%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-[5%] top-[60%] h-[40%] w-[40%] rounded-full bg-info/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background shadow-lg">
            <Activity size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Vault</h2>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Personal finance, calmly organized
          </p>
        </div>

        <motion.div layout className="bento-card relative z-10 w-full overflow-hidden p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
            </h1>
            <p className="text-xs font-medium text-muted-foreground">
              {mode === "login"
                ? "Enter your credentials to access your vault."
                : mode === "signup"
                  ? "Create an account to start tracking your money."
                  : "We'll send recovery instructions to your inbox."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1.5"
                >
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className={authFieldClass}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className={authFieldClass}
              />
            </div>

            <AnimatePresence mode="wait">
              {mode !== "forgot" && (
                <motion.div
                  key="password-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between px-0.5">
                    <label className={labelClass}>Password</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-[11px] font-semibold text-primary transition-colors hover:text-primary/80"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={authFieldClass}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loading || (mode === "signup" && systemSettings?.disableSignups)}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
              )}
              {mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? systemSettings?.disableSignups
                    ? "Signups disabled"
                    : "Create account"
                  : "Send reset link"}
            </motion.button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <img
              className="h-4 w-4"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
            />
            <span>Continue with Google</span>
          </motion.button>

          <div className="mt-8 text-center">
            {mode === "login" ? (
              <p className="text-xs font-medium text-muted-foreground">
                New here?{" "}
                {!systemSettings?.disableSignups ? (
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="ml-1 font-semibold text-foreground hover:underline"
                  >
                    Create an account
                  </button>
                ) : (
                  <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    (Signups disabled)
                  </span>
                )}
              </p>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="ml-1 font-semibold text-foreground hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
