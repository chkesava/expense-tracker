import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useAlerts } from "./useAlerts";
import { useHoldingsWithMetrics } from "./useMarketQuotes";
import { useHoldings } from "./useHoldings";
import type { PriceAlert } from "../types";

function isAlertTriggered(
  alert: PriceAlert,
  price: number,
  profitPercent: number
): boolean {
  switch (alert.condition) {
    case "price_above":
      return price >= alert.threshold;
    case "price_below":
      return price <= alert.threshold;
    case "profit_above":
      return profitPercent >= alert.threshold;
    case "loss_above":
      return profitPercent <= -alert.threshold;
    default:
      return false;
  }
}

/** Evaluates active alerts when market quotes refresh */
export function useAlertChecker() {
  const { alerts, toggleAlert } = useAlerts();
  const { holdings, markTargetAlertTriggered } = useHoldings();
  const { holdingsWithMetrics } = useHoldingsWithMetrics(holdings);
  const announcedTargetIds = useRef(new Set<string>());

  useEffect(() => {
    holdingsWithMetrics.forEach((holding) => {
      if (
        holding.targetAlertTriggeredAt ||
        holding.targetPrice == null ||
        holding.currentPrice < holding.targetPrice
      ) {
        announcedTargetIds.current.delete(holding.id);
      }
    });

    const targetHoldings = holdingsWithMetrics.filter(
      (holding) =>
        holding.hasLiveQuote &&
        holding.targetPrice != null &&
        !holding.targetAlertTriggeredAt &&
        holding.currentPrice >= holding.targetPrice
    );

    for (const holding of targetHoldings) {
      if (announcedTargetIds.current.has(holding.id)) continue;
      announcedTargetIds.current.add(holding.id);
      toast.info(
        `Target reached: ${holding.symbol} is at ${holding.currentPrice.toLocaleString()} (target ${holding.targetPrice!.toLocaleString()})`
      );
      void markTargetAlertTriggered(holding.id);
    }

    const activeAlerts = alerts.filter((a) => a.isActive && !a.triggeredAt);
    if (activeAlerts.length === 0 || holdingsWithMetrics.length === 0) return;

    for (const alert of activeAlerts) {
      const holding = holdingsWithMetrics.find(
        (h) => h.yahooSymbol === alert.yahooSymbol || h.symbol === alert.symbol
      );
      if (!holding) continue;

      if (
        isAlertTriggered(alert, holding.currentPrice, holding.profitPercent)
      ) {
        toast.info(
          `Alert: ${alert.symbol} — ${alert.condition.replace("_", " ")} ₹${alert.threshold}`
        );
        void toggleAlert(alert.id, false);
      }
    }
  }, [alerts, holdingsWithMetrics, markTargetAlertTriggered, toggleAlert]);
}
