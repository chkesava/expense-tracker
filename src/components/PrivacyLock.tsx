import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Lock, Fingerprint } from "lucide-react";
import useSettings from "../hooks/useSettings";
import { useBiometrics } from "../hooks/useBiometrics";
import { cn } from "../lib/utils";

export default function PrivacyLock({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const isLockedRef = useRef(false);
  const { isRegistered, authenticate } = useBiometrics();
  const hasAttemptedAutoBiometric = useRef(false);

  // Sync ref with state for event listeners
  useEffect(() => {
    isLockedRef.current = isLocked;
    if (!isLocked) {
      hasAttemptedAutoBiometric.current = false;
    }
  }, [isLocked]);

  // Initialize lock state
  useEffect(() => {
    if (settings.privacyPin && !sessionStorage.getItem("app_unlocked")) {
      setIsLocked(true);
    }
  }, [settings.privacyPin]);

  // Gesture-based auto-trigger for biometrics
  useEffect(() => {
    if (!isLocked || !isRegistered || hasAttemptedAutoBiometric.current) return;

    const triggerBiometrics = async () => {
      if (hasAttemptedAutoBiometric.current) return;
      hasAttemptedAutoBiometric.current = true;
      
      const success = await authenticate();
      if (success) {
        setIsLocked(false);
        setPinInput("");
        setError(false);
        sessionStorage.setItem("app_unlocked", "true");
        sessionStorage.removeItem("app_duress");
        window.dispatchEvent(new Event("duress_changed"));
      }
      // Remove listeners after attempt
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener("click", triggerBiometrics);
      window.removeEventListener("touchstart", triggerBiometrics);
      window.removeEventListener("keydown", triggerBiometrics);
    };

    // Browsers require a user gesture to trigger WebAuthn.
    // We listen for the first interaction to trigger the prompt.
    window.addEventListener("click", triggerBiometrics);
    window.addEventListener("touchstart", triggerBiometrics);
    window.addEventListener("keydown", triggerBiometrics);

    return cleanup;
  }, [isLocked, isRegistered, authenticate]);

  // Handle inactivity and blur
  useEffect(() => {
    if (!settings.privacyPin) return;

    let timeout: ReturnType<typeof setTimeout>;

    const lockApp = () => {
      setIsLocked(true);
      sessionStorage.removeItem("app_unlocked");
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      if (isLockedRef.current) return;
      if (!settings.lockOnInactivity) return;
      
      timeout = setTimeout(() => {
        lockApp();
      }, (settings.inactivityTimeout || 60) * 1000);
    };

    const handleVisibilityChange = () => {
      if (settings.lockOnAppSwitch && document.hidden && !isLockedRef.current) {
        lockApp();
      }
    };

    // Listeners for user activity
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("scroll", resetTimer);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("scroll", resetTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [settings.privacyPin, settings.lockOnInactivity, settings.inactivityTimeout, settings.lockOnAppSwitch]);

  const handleUnlock = () => {
    if (pinInput === settings.privacyPin) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.removeItem("app_duress");
      window.dispatchEvent(new Event("duress_changed"));
    } else if (settings.fakePin && pinInput === settings.fakePin) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.setItem("app_duress", "true");
      window.dispatchEvent(new Event("duress_changed"));
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      setPinInput("");
    }
  };

  const handleBiometricUnlock = async () => {
    const success = await authenticate();
    if (success) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.removeItem("app_duress");
      window.dispatchEvent(new Event("duress_changed"));
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
    }
  };

  useEffect(() => {
    if (pinInput.length === 4) {
      handleUnlock();
    }
  }, [pinInput]);

  const handlePinClick = (num: string) => {
    if (pinInput.length < 4 && !error) {
      setPinInput((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
  };

  // Keyboard support for PIN entry
  useEffect(() => {
    if (!isLocked) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handlePinClick(e.key);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isLocked, pinInput, error]);

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl transition-all duration-300">
      <div className="w-full max-w-sm px-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 ring-4 ring-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
          <Lock className="h-10 w-10" />
        </div>
        <h2 className="mb-2 text-2xl font-black text-white tracking-tight">Privacy Lock</h2>
        <p className="mb-10 text-sm font-medium text-slate-400">Enter your 4-digit PIN to access</p>

        <div className={cn("mb-10 flex justify-center gap-5", error && "animate-shake")}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-4 w-4 rounded-full transition-all duration-300",
                i < pinInput.length ? "bg-blue-500 scale-125 shadow-[0_0_15px_rgba(59,130,246,0.8)]" : "bg-slate-700/50 border border-slate-600/50",
                error && "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handlePinClick(String(num))}
              className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-2xl font-black text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          {isRegistered ? (
            <button
              onClick={handleBiometricUnlock}
              className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all"
            >
              <Fingerprint className="h-6 w-6" />
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={() => handlePinClick("0")}
            className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-2xl font-black text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="flex h-16 items-center justify-center rounded-2xl bg-white/5 text-sm font-bold text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            Del
          </button>
        </div>
      </div>
    </div>
  );
}
