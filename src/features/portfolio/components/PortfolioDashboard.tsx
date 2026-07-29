import { memo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import Amount from "../../../components/common/Amount";
import type { PortfolioSummary } from "../types";
import { cn } from "../../../lib/utils";
import { formatPercent, gainClass, lossClass } from "../utils/styles";

interface PortfolioDashboardProps {
  summary: PortfolioSummary;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
  liveQuoteCount?: number;
  totalHoldings?: number;
}

function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  positive,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon: typeof TrendingUp;
  positive?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bento-card p-5 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon size={16} className="text-muted-foreground" />
      </div>
      <div className="text-xl font-black tracking-tight">{value}</div>
      {subValue && (
        <div
          className={cn(
            "text-sm font-semibold",
            positive === true && gainClass,
            positive === false && lossClass
          )}
        >
          {subValue}
        </div>
      )}
    </motion.div>
  );
}

function PortfolioDashboard({
  summary,
  isRefreshing,
  lastUpdated,
  liveQuoteCount = 0,
  totalHoldings = 0,
}: PortfolioDashboardProps) {
  const todayPositive = summary.todayGainLoss >= 0;
  const overallPositive = summary.overallGainLoss >= 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight">Portfolio Overview</h2>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw
                size={12}
                className={cn(isRefreshing && "animate-spin")}
              />
              Updated {lastUpdated.toLocaleTimeString("en-IN")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio Value"
          value={<Amount value={summary.portfolioValue} />}
          icon={Wallet}
          delay={0}
        />
        <MetricCard
          label="Today's P&L"
          value={
            <span>
              {summary.todayGainLoss >= 0 ? "+" : "−"}
              <Amount value={Math.abs(summary.todayGainLoss)} />
            </span>
          }
          subValue={formatPercent(summary.todayGainLossPercent)}
          icon={todayPositive ? TrendingUp : TrendingDown}
          positive={todayPositive}
          delay={0.05}
        />
        <MetricCard
          label="Overall P&L"
          value={
            <span>
              {summary.overallGainLoss >= 0 ? "+" : "−"}
              <Amount value={Math.abs(summary.overallGainLoss)} />
            </span>
          }
          subValue={formatPercent(summary.overallGainLossPercent)}
          icon={overallPositive ? TrendingUp : TrendingDown}
          positive={overallPositive}
          delay={0.1}
        />
        <MetricCard
          label="Total Invested"
          value={<Amount value={summary.totalInvested} />}
          subValue={`${summary.totalHoldings} holdings`}
          icon={BarChart3}
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bento-card p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cash Balance
          </span>
          <div className="text-xl font-black mt-2">
            <Amount value={summary.cashBalance} />
          </div>
        </div>

        {summary.topGainer && (
          <div className="bento-card p-5 border-emerald-500/20">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Top Gainer
            </span>
            <div className="mt-2 font-bold">{summary.topGainer.symbol}</div>
            <div className={cn("text-sm font-semibold", gainClass)}>
              {formatPercent(summary.topGainer.profitPercent)}
            </div>
          </div>
        )}

        {summary.topLoser && summary.totalHoldings > 1 && (
          <div className="bento-card p-5 border-rose-500/20">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Top Loser
            </span>
            <div className="mt-2 font-bold">{summary.topLoser.symbol}</div>
            <div className={cn("text-sm font-semibold", lossClass)}>
              {formatPercent(summary.topLoser.profitPercent)}
            </div>
          </div>
        )}
      </div>

      <div className="bento-card p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <PieChart size={16} />
        <span>
          {liveQuoteCount < totalHoldings && totalHoldings > 0 ? (
            <span className="text-amber-600 font-medium">
              Live prices unavailable for some holdings — showing avg buy price.{" "}
            </span>
          ) : null}
          Profit % = (Current Value − Invested) / Invested × 100 · Prices refresh every 15 min
        </span>
      </div>
    </div>
  );
}

export default memo(PortfolioDashboard);
