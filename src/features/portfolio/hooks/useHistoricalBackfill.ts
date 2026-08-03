import { useState } from "react";
import { toast } from "../../../lib/toast";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../../../hooks/useAuth";
import { useHoldings } from "./useHoldings";
import { usePortfolioSettings } from "./usePortfolioSettings";

export function useHistoricalBackfill() {
  const { user } = useAuth();
  const { holdings } = useHoldings();
  const { settings } = usePortfolioSettings();
  const [syncing, setSyncing] = useState(false);

  const syncHistoricalData = async (days = 90) => {
    if (!user || holdings.length === 0) {
      toast.info("No holdings to sync.");
      return false;
    }

    setSyncing(true);
    try {
      // Yahoo historical only supports stocks/ETFs — MF/crypto use cost basis in the reconstruction loop
      const equityHoldings = holdings.filter(
        (h) => h.instrumentType === "stock" || h.instrumentType === "etf"
      );
      const symbols = Array.from(
        new Set(equityHoldings.map((h) => h.yahooSymbol || h.symbol).filter(Boolean))
      ).join(",");

      const period2Date = new Date();
      const period1Date = new Date();
      period1Date.setDate(period1Date.getDate() - days);

      const period1 = period1Date.toISOString().split("T")[0];
      const period2 = period2Date.toISOString().split("T")[0];

      let histData: Record<string, any[]> = {};
      if (symbols) {
        const res = await fetch(`/api/historical?symbols=${encodeURIComponent(symbols)}&period1=${period1}&period2=${period2}`);
        if (!res.ok) throw new Error("Failed to fetch historical data from API");

        const response = await (res.json() as Promise<{ success: boolean; data: Record<string, any[]> }>);
        if (!response.success) throw new Error("API returned an error");
        histData = response.data;
      }
      const cash = settings?.cashBalance ?? 0;

      // Constant invested value for the backfill period
      const totalInvested = holdings.reduce((sum, h) => sum + h.quantity * h.averageBuyPrice, 0) + cash;

      const batch = writeBatch(db);
      
      // Helper to format Date to YYYY-MM-DD local
      const toDateString = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const date = new Date(d.getTime() - offset * 60 * 1000);
        return date.toISOString().split("T")[0];
      };

      // Generate the last `days` dates
      let snapshotsGenerated = 0;
      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = toDateString(d);

        let dailyPortfolioValue = cash;
        
        for (const holding of holdings) {
          const sym = holding.yahooSymbol || holding.symbol;
          const prices = histData[sym] || [];
          
          // Find the most recent price on or before `dateStr`
          // prices array is usually sorted chronologically
          let closestPrice = holding.averageBuyPrice; // Fallback
          
          for (let j = prices.length - 1; j >= 0; j--) {
            const priceDate = prices[j].date.split("T")[0];
            if (priceDate <= dateStr) {
              closestPrice = prices[j].close;
              break;
            }
          }
          
          dailyPortfolioValue += holding.quantity * closestPrice;
        }

        const profit = dailyPortfolioValue - totalInvested;
        const profitPercent = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        const ref = doc(db, "users", user.uid, "portfolioSnapshots", dateStr);
        batch.set(ref, {
          date: dateStr,
          portfolioValue: dailyPortfolioValue,
          investedValue: totalInvested,
          profit,
          profitPercent,
          netWorth: dailyPortfolioValue, // Simplified net worth
          createdAt: serverTimestamp(),
        });
        
        snapshotsGenerated++;
      }

      await batch.commit();
      toast.success(`Successfully synced ${snapshotsGenerated} days of historical data!`);
      return true;
    } catch (err) {
      console.error("Backfill error", err);
      toast.error("Failed to sync historical data.");
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncHistoricalData,
    syncing,
  };
}
