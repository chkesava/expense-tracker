import { useEffect } from "react";
import useSettings from "../../../hooks/useSettings";
import { useSipPlans } from "../hooks/useSipPlans";
import { useSipExecutor } from "../hooks/useSipExecutor";

/** Runs due virtual SIP catch-up on login when investments are enabled. */
export default function SipCatchUp() {
  const { settings } = useSettings();
  const enabled = settings.enableInvestments;
  const { plans } = useSipPlans();
  const { processDueSips } = useSipExecutor(enabled ? plans : []);

  useEffect(() => {
    if (!enabled) return;
    void processDueSips();
  }, [enabled, processDueSips]);

  return null;
}
