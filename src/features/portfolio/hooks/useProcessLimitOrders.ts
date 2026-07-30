import { useEffect, useRef } from "react";
import { usePortfolioOrders } from "./usePortfolioOrders";
import { usePortfolioSettings } from "./usePortfolioSettings";
import { usePortfolioTransactions } from "./usePortfolioTransactions";
import { useHoldings } from "./useHoldings";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import type { HoldingWithMetrics } from "../types";
import { toLocalDateKey } from "../../../utils/dates";

export function useProcessLimitOrders(liveHoldings: HoldingWithMetrics[]) {
  const { user } = useAuth();
  const { orders } = usePortfolioOrders();
  const { settings, updateCashBalance } = usePortfolioSettings();
  const { addTransaction } = usePortfolioTransactions();
  const { applyBuyToHolding } = useHoldings();
  
  // Keep track of recently executed order IDs in this session to prevent duplicate runs
  const processedOrders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !settings || orders.length === 0 || liveHoldings.length === 0) return;

    const executeOrders = async () => {
      const pendingBuyOrders = orders.filter(
        (o) => o.status === "pending" && o.type === "BUY" && o.orderType === "LIMIT"
      );

      for (const order of pendingBuyOrders) {
        if (processedOrders.current.has(order.id)) continue;

        const liveQuote = liveHoldings.find((h) => h.symbol === order.symbol);
        if (!liveQuote || !liveQuote.hasLiveQuote) continue;

        // Check limit condition: If market price drops to or below the target price
        if (liveQuote.currentPrice <= order.targetPrice) {
          const totalCost = order.quantity * order.targetPrice;
          const cash = settings.cashBalance ?? 0;

          // Only execute if we have enough cash
          if (cash >= totalCost) {
            processedOrders.current.add(order.id);

            try {
              // 1. Mark order as executed
              await updateDoc(doc(db, "users", user.uid, "portfolioOrders", order.id), {
                status: "executed",
                executedAt: new Date().toISOString(),
                updatedAt: serverTimestamp(),
              });

              // 2. Add transaction
              await addTransaction({
                holdingId: liveQuote.id,
                symbol: order.symbol,
                type: "BUY",
                quantity: order.quantity,
                price: order.targetPrice,
                fees: 0,
                broker: order.broker,
                date: toLocalDateKey(new Date()),
                notes: `Executed Limit Order: Target ₹${order.targetPrice}`,
                orderStatus: "executed",
              });

              // 3. Update holdings and cash
              await applyBuyToHolding(liveQuote.id, order.quantity, order.targetPrice);
              await updateCashBalance(cash - totalCost);
              
            } catch (err) {
              console.error("Failed to execute limit order", order.id, err);
              processedOrders.current.delete(order.id);
            }
          }
        }
      }
    };

    void executeOrders();
  }, [liveHoldings, orders, settings, user, addTransaction, applyBuyToHolding, updateCashBalance]);
}
