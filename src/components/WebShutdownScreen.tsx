import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  Shield,
  Smartphone,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLatestRelease } from "../hooks/useLatestRelease";
import { useSystemSettings } from "../hooks/useSystemSettings";
import { toast } from "../lib/toast";
import { fieldClass, labelClass } from "../lib/formStyles";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";
import { isLikelyApkUrl, isValidEmail, normalizeEmail } from "../utils/appRelease";

const shutdownDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatShutdownDate(isoDate: string): string {
  if (!isoDate) return "";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return shutdownDateFormatter.format(parsed);
}

async function inviteTester(email: string) {
  const res = await fetch("/api/app-distribution-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    testerUrl?: string;
    downloadUrl?: string;
    alreadyInvited?: boolean;
  };
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || "Could not add you as a tester.");
  }
  return payload;
}

export default function WebShutdownScreen() {
  const { user, login, loginWithEmail, logout } = useAuth();
  const { settings } = useSystemSettings();
  const { release, loading: releaseLoading } = useLatestRelease();

  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);
  const [showAdminSignIn, setShowAdminSignIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const testerUrl = release?.testerUrl || settings.appDistributionInviteUrl || "";
  const downloadUrl = release?.downloadUrl && isLikelyApkUrl(release.downloadUrl)
    ? release.downloadUrl
    : "";
  const versionLabel = release?.versionName
    ? `v${release.versionName}${release.versionCode ? ` (${release.versionCode})` : ""}`
    : "";
  const endDateLabel = formatShutdownDate(settings.webAppShutdownDate);
  const customMessage = settings.webAppShutdownMessage.trim();

  const headline = useMemo(() => {
    if (endDateLabel) return `The web app ended on ${endDateLabel}`;
    return "The web app is no longer available";
  }, [endDateLabel]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextEmail = normalizeEmail(email);
    if (!isValidEmail(nextEmail)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setInviting(true);
    try {
      const result = await inviteTester(nextEmail);
      setInvited(true);
      toast.success(
        result.alreadyInvited
          ? "You are already on the tester list. Download the app below."
          : "You're on the tester list. Check your inbox, then download the app below."
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Invite failed.";
      toast.error(message);
      if (testerUrl) {
        toast.info("You can still join from the Firebase tester page.");
      }
    } finally {
      setInviting(false);
    }
  };

  const handleGoogleAdmin = async () => {
    setAdminLoading(true);
    try {
      await login();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      toast.error(message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEmailAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminLoading(true);
    try {
      await loginWithEmail(adminEmail, adminPassword);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Sign-in failed";
      toast.error(message);
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[8%] -top-[12%] h-[42%] w-[42%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-[6%] top-[55%] h-[40%] w-[40%] rounded-full bg-info/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-6"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background shadow-lg">
            <Activity size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Vault
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{headline}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {customMessage ||
              "Web support has ended. Your data stays in the Android app — nothing is deleted. Super admins can still open the site."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Smartphone size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
            </div>
            <div>
              <h2 className="font-semibold">Android app is still supported</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join Firebase App Testing with the Google email you use on your phone, then
                download Spendly from this page.
              </p>
              {versionLabel ? (
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Latest build {versionLabel}
                  {release?.notes ? ` · ${release.notes}` : ""}
                </p>
              ) : null}
            </div>
          </div>

          <ol className="mb-5 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              Opt in below so Firebase can send the tester invite.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              Open the invite email or the tester page, then accept.
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              Download the APK here and install it on your phone.
            </li>
          </ol>

          {invited ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Tester access requested for <span className="font-semibold">{normalizeEmail(email)}</span>.
                Check Gmail (and spam) for Firebase App Distribution, then download below.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="mb-4 space-y-3">
              <div className="space-y-1.5">
                <label className={labelClass} htmlFor="tester-email">
                  Google email for testing
                </label>
                <input
                  id="tester-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className={`${fieldClass} px-4 py-3`}
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={inviting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground disabled:opacity-50"
              >
                {inviting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
                )}
                Join Firebase app testing
              </button>
            </form>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={downloadUrl || undefined}
              aria-disabled={!downloadUrl}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                downloadUrl
                  ? "bg-foreground text-background"
                  : "pointer-events-none bg-muted text-muted-foreground"
              }`}
            >
              <Download size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
              {downloadUrl ? "Download Android app" : releaseLoading ? "Checking build…" : "APK not published"}
            </a>
            <a
              href={testerUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!testerUrl}
              className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
                testerUrl
                  ? "border-border bg-card text-foreground hover:bg-muted/50"
                  : "pointer-events-none border-border bg-muted text-muted-foreground"
              }`}
            >
              <ExternalLink size={ICON_SIZE.sm} strokeWidth={ICON_STROKE} />
              Open tester page
            </a>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            On Android, allow installs from this browser when prompted. Use the tester page if
            you prefer Firebase App Tester.
          </p>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          {user?.email ? (
            <p>
              Signed in as {user.email}.{" "}
              <button type="button" className="font-semibold text-foreground underline" onClick={() => void logout()}>
                Sign out
              </button>
            </p>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => setShowAdminSignIn((open) => !open)}
              >
                <Shield size={ICON_SIZE.xs} strokeWidth={ICON_STROKE} />
                Super admin sign in
              </button>
              {showAdminSignIn ? (
                <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm">
                  <button
                    type="button"
                    onClick={() => void handleGoogleAdmin()}
                    disabled={adminLoading}
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-semibold text-foreground disabled:opacity-50"
                  >
                    <img
                      className="h-4 w-4"
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt=""
                    />
                    Continue with Google
                  </button>
                  <form onSubmit={handleEmailAdmin} className="space-y-3">
                    <div className="space-y-1.5">
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className={`${fieldClass} px-4 py-3`}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClass}>Password</label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className={`${fieldClass} px-4 py-3`}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={adminLoading}
                      className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-50"
                    >
                      {adminLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
                    </button>
                  </form>
                </div>
              ) : null}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
