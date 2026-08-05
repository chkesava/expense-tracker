/**
 * Mobile Google auth bridge.
 * Opened from the Expo app via WebBrowser AuthSession.
 * Completes Google sign-in on this HTTPS origin (same Firebase project as web),
 * then redirects back to the app deep link with a Firebase ID token.
 *
 * Google never sees exp:// — only this site does OAuth, so Expo Go works.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Activity } from "lucide-react";
import { auth, db } from "../firebase";
import { ICON_SIZE, ICON_STROKE } from "../lib/iconSizes";

const STORAGE_KEY = "mobile_google_redirect_uri";

function isAllowedRedirect(uri: string): boolean {
  return (
    uri.startsWith("expensetrackermobile://") ||
    uri.startsWith("exp://") ||
    uri.startsWith("exps://")
  );
}

function redirectToApp(redirectUri: string, idToken: string) {
  const base = redirectUri.split("#")[0];
  window.location.href = `${base}#id_token=${encodeURIComponent(idToken)}`;
}

export default function MobileGoogleAuthPage() {
  const [params] = useSearchParams();
  const redirectUri = useMemo(() => {
    const fromQuery = params.get("redirect_uri")?.trim();
    if (fromQuery) return fromQuery;
    return (
      sessionStorage.getItem(STORAGE_KEY) ||
      "expensetrackermobile://google-auth"
    );
  }, [params]);

  const [status, setStatus] = useState("Preparing Google sign-in…");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const handoff = useCallback(
    async (user: User, isNewUser?: boolean) => {
      if (isNewUser) {
        const settingsSnap = await getDoc(doc(db, "system_settings", "global"));
        if (settingsSnap.exists() && settingsSnap.data().disableSignups) {
          await user.delete();
          throw new Error(
            "New registrations are temporarily disabled by the administrator."
          );
        }
      }

      setStatus("Returning to the app…");
      const idToken = await user.getIdToken(/* forceRefresh */ true);
      const target =
        sessionStorage.getItem(STORAGE_KEY) || redirectUri;

      try {
        await signOut(auth);
      } catch {
        // Token already obtained; ignore sign-out failures.
      }

      redirectToApp(target, idToken);
    },
    [redirectUri]
  );

  useEffect(() => {
    if (!isAllowedRedirect(redirectUri)) {
      setError("Invalid redirect URI. Open this page from the Vault mobile app.");
      setReady(false);
      return;
    }

    sessionStorage.setItem(STORAGE_KEY, redirectUri);

    let cancelled = false;

    (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (cancelled) return;

        if (redirectResult?.user) {
          const extra = getAdditionalUserInfo(redirectResult);
          await handoff(redirectResult.user, Boolean(extra?.isNewUser));
          return;
        }

        if (auth.currentUser) {
          await handoff(auth.currentUser, false);
          return;
        }

        setStatus("Sign in with the same Google account you use on the web.");
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Google sign-in failed"
        );
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handoff, redirectUri]);

  const onContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        const extra = getAdditionalUserInfo(result);
        await handoff(result.user, Boolean(extra?.isNewUser));
      } catch (popupError: unknown) {
        const code =
          popupError && typeof popupError === "object" && "code" in popupError
            ? String((popupError as { code?: string }).code)
            : "";
        if (
          code === "auth/popup-closed-by-user" ||
          code === "auth/cancelled-popup-request"
        ) {
          throw popupError;
        }
        // In-app browsers often block popups — fall back to full redirect.
        setStatus("Redirecting to Google…");
        await signInWithRedirect(auth, provider);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[5%] -top-[10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-[5%] top-[60%] h-[40%] w-[40%] rounded-full bg-info/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background shadow-lg">
            <Activity size={ICON_SIZE.lg} strokeWidth={ICON_STROKE} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Continue to Vault Mobile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{status}</p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {ready ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onContinue()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3.5 text-sm font-bold text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Continue with Google"}
          </button>
        ) : null}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Uses your existing web Google account and expense data.
        </p>
      </div>
    </div>
  );
}
