import { useEffect, useState } from "react";
import { useAlertChecker } from "../features/portfolio/hooks/useAlertChecker";
import SipCatchUp from "../features/sip/components/SipCatchUp";
import useSettings from "../hooks/useSettings";
import { scheduleIdleWork } from "../utils/scheduleIdle";

/**
 * Runs portfolio alert checking and SIP catch-up after first paint / idle time
 * so they do not compete with critical startup Firestore listeners.
 */
function PortfolioStartupWork() {
  useAlertChecker();
  return <SipCatchUp />;
}

export default function DeferredStartupEffects() {
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!settings.enableInvestments) {
      setReady(false);
      return;
    }

    return scheduleIdleWork(() => setReady(true), {
      timeoutMs: 3000,
      fallbackDelayMs: 1500,
    });
  }, [settings.enableInvestments]);

  if (!settings.enableInvestments || !ready) return null;
  return <PortfolioStartupWork />;
}
