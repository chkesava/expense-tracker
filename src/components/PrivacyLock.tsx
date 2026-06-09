import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Lock, Fingerprint, Delete } from "lucide-react";
import useSettings from "../hooks/useSettings";
import { useBiometrics } from "../hooks/useBiometrics";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";
import { motion } from "framer-motion";

export default function PrivacyLock({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const { logout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const isLockedRef = useRef(false);
  const { isRegistered, authenticate } = useBiometrics();
  const hasAttemptedAutoBiometric = useRef(false);

  // Lockout states
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(sessionStorage.getItem("lock_failed_attempts") || "0");
  });
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number>(0);

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

  // Restore lockout cooldown on mount
  useEffect(() => {
    const lockoutUntil = sessionStorage.getItem("lock_lockout_until");
    if (lockoutUntil) {
      const remaining = Math.ceil((Number(lockoutUntil) - Date.now()) / 1000);
      if (remaining > 0) {
        setLockoutTimeLeft(remaining);
      } else {
        sessionStorage.removeItem("lock_lockout_until");
        sessionStorage.setItem("lock_failed_attempts", "0");
        setFailedAttempts(0);
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem("lock_lockout_until");
          sessionStorage.setItem("lock_failed_attempts", "0");
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimeLeft]);

  // Gesture-based auto-trigger for biometrics
  useEffect(() => {
    if (!isLocked || !isRegistered || hasAttemptedAutoBiometric.current || lockoutTimeLeft > 0) return;

    const triggerBiometrics = async () => {
      if (hasAttemptedAutoBiometric.current || lockoutTimeLeft > 0) return;
      hasAttemptedAutoBiometric.current = true;
      
      const success = await authenticate();
      if (success) {
        setIsLocked(false);
        setPinInput("");
        setError(false);
        setFailedAttempts(0);
        sessionStorage.setItem("app_unlocked", "true");
        sessionStorage.removeItem("app_duress");
        sessionStorage.setItem("lock_failed_attempts", "0");
        sessionStorage.removeItem("lock_lockout_until");
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
    window.addEventListener("click", triggerBiometrics);
    window.addEventListener("touchstart", triggerBiometrics);
    window.addEventListener("keydown", triggerBiometrics);

    return cleanup;
  }, [isLocked, isRegistered, authenticate, lockoutTimeLeft]);

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

  const triggerHaptic = (pattern: number | number[]) => {
    if (navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn("Haptics not supported or blocked by browser policies", e);
      }
    }
  };

  const handleUnlock = () => {
    if (pinInput === settings.privacyPin) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      setFailedAttempts(0);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.removeItem("app_duress");
      sessionStorage.setItem("lock_failed_attempts", "0");
      sessionStorage.removeItem("lock_lockout_until");
      window.dispatchEvent(new Event("duress_changed"));
    } else if (settings.fakePin && pinInput === settings.fakePin) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      setFailedAttempts(0);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.setItem("app_duress", "true");
      sessionStorage.setItem("lock_failed_attempts", "0");
      sessionStorage.removeItem("lock_lockout_until");
      window.dispatchEvent(new Event("duress_changed"));
    } else {
      setError(true);
      triggerHaptic([100, 50, 100]); // Error vibrate pattern
      setTimeout(() => setError(false), 500);
      setPinInput("");

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      sessionStorage.setItem("lock_failed_attempts", String(nextAttempts));

      if (nextAttempts >= 5) {
        const cooldown = Date.now() + 30000; // 30s cooldown
        sessionStorage.setItem("lock_lockout_until", String(cooldown));
        setLockoutTimeLeft(30);
      }
    }
  };

  const handleBiometricUnlock = async () => {
    if (lockoutTimeLeft > 0) return;
    const success = await authenticate();
    if (success) {
      setIsLocked(false);
      setPinInput("");
      setError(false);
      setFailedAttempts(0);
      sessionStorage.setItem("app_unlocked", "true");
      sessionStorage.removeItem("app_duress");
      sessionStorage.setItem("lock_failed_attempts", "0");
      sessionStorage.removeItem("lock_lockout_until");
      window.dispatchEvent(new Event("duress_changed"));
    } else {
      setError(true);
      triggerHaptic([100, 50, 100]);
      setTimeout(() => setError(false), 500);
    }
  };

  useEffect(() => {
    if (pinInput.length === 4) {
      handleUnlock();
    }
  }, [pinInput]);

  const handlePinClick = (num: string) => {
    if (lockoutTimeLeft > 0) return;
    if (pinInput.length < 4 && !error) {
      triggerHaptic(50); // Single tap vibrate
      setPinInput((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (lockoutTimeLeft > 0) return;
    triggerHaptic(35);
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
  }, [isLocked, pinInput, error, lockoutTimeLeft]);

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl transition-all duration-300">
      <div className="w-full max-w-[320px] px-4 text-center animate-in fade-in zoom-in duration-300">
        
        {/* Top Lock Icon Badge */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
          <Lock className="h-7 w-7" />
        </div>
        
        <h2 className="mb-1.5 text-2xl font-black text-white tracking-tight">Privacy Lock</h2>
        
        {/* Cooldown / Lockout Prompt */}
        {lockoutTimeLeft > 0 ? (
          <p className="mb-8 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-xl inline-block animate-pulse">
            Locked out. Try again in {lockoutTimeLeft}s
          </p>
        ) : (
          <p className="mb-8 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-80">
            Enter 4-Digit Security PIN
          </p>
        )}

        {/* Input indicators */}
        <motion.div
          animate={error ? { x: [-8, 8, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="mb-10 flex justify-center gap-5"
        >
          {[0, 1, 2, 3].map((i) => {
            const isFilled = i < pinInput.length;
            return (
              <motion.div
                key={i}
                animate={{
                  scale: isFilled ? 1.25 : 1,
                  backgroundColor: error 
                    ? "#ef4444" 
                    : isFilled 
                      ? "#3b82f6" 
                      : "rgba(71, 85, 105, 0.4)",
                  boxShadow: error 
                    ? "0 0 15px rgba(239, 68, 68, 0.8)" 
                    : isFilled 
                      ? "0 0 15px rgba(59, 130, 246, 0.8)" 
                      : "none",
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "h-4.5 w-4.5 rounded-full border transition-colors duration-200",
                  isFilled ? "border-blue-400" : "border-slate-700/60",
                  error && "border-red-400"
                )}
              />
            );
          })}
        </motion.div>

        {/* Premium Numeric Keypad */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 justify-items-center max-w-[260px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              disabled={lockoutTimeLeft > 0}
              onClick={() => handlePinClick(String(num))}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/5 text-2xl font-bold text-white shadow-inner hover:bg-white/10 active:scale-90 active:bg-blue-500/20 active:border-blue-500/30 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
            >
              {num}
            </button>
          ))}
          
          {/* Bottom row: Biometrics, 0, Backspace */}
          {isRegistered ? (
            <button
              disabled={lockoutTimeLeft > 0}
              onClick={handleBiometricUnlock}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-blue-500/10 bg-blue-500/5 text-blue-400 hover:bg-blue-500/20 active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Fingerprint className="h-6 w-6 animate-pulse" />
            </button>
          ) : (
            <div className="w-16 h-16" />
          )}

          <button
            disabled={lockoutTimeLeft > 0}
            onClick={() => handlePinClick("0")}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/5 text-2xl font-bold text-white shadow-inner hover:bg-white/10 active:scale-90 active:bg-blue-500/20 active:border-blue-500/30 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
          >
            0
          </button>

          <button
            disabled={lockoutTimeLeft > 0}
            onClick={handleDelete}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white hover:bg-white/10 active:scale-90 transition-all duration-150 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Forgot PIN / Sign Out disaster recovery path */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => {
              triggerHaptic(40);
              logout();
            }}
            className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors py-2 px-3 border border-slate-800 hover:border-slate-700 rounded-xl"
          >
            Forgot PIN? Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
