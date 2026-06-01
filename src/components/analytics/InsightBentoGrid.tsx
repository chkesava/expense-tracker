import type { Expense, Income } from "../../types/expense";
import {
  getPacingMetrics,
  getCashFlowMetrics,
  getFixedVsVariableMetrics,
  getAnomalyMetrics,
} from "../../utils/insightMetrics";
import SpendingPacingCard from "./SpendingPacingCard";
import CashFlowCard from "./CashFlowCard";
import FixedVsVariableCard from "./FixedVsVariableCard";
import AnomalySpikeCard from "./AnomalySpikeCard";
import { Sparkles, CalendarX } from "lucide-react";

interface InsightBentoGridProps {
  expenses: Expense[];
  incomes: Income[];
  selectedMonth: string;
}

export default function InsightBentoGrid({
  expenses,
  incomes,
  selectedMonth,
}: InsightBentoGridProps) {
  const currentMonthExpenses = expenses.filter((e) => e.month === selectedMonth);
  const currentMonthIncomes = incomes.filter((i) => i.month === selectedMonth);

  // If there's no data whatsoever for this month, render a beautiful empty slate
  if (currentMonthExpenses.length === 0 && currentMonthIncomes.length === 0) {
    return (
      <div className="premium-glass p-12 rounded-3xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-8 space-y-4 transition-all duration-500 hover:shadow-xl">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <CalendarX size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
            No Activity Recorded
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            There is no spending or income activity logged for this month. Transactions must be recorded to generate your wealth dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Pre-calculate all bento metrics
  const pacingMetrics = getPacingMetrics(expenses, selectedMonth);
  const cashFlowMetrics = getCashFlowMetrics(incomes, expenses, selectedMonth);
  const fixedVsVariableMetrics = getFixedVsVariableMetrics(expenses, selectedMonth);
  const anomalyMetrics = getAnomalyMetrics(expenses, selectedMonth);

  return (
    <div className="space-y-6">
      {/* Title Header with a small premium badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-1.5">
          <Sparkles size={12} className="text-violet-500" /> Operational Intelligence Feed
        </h2>
      </div>

      {/* Responsive Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SpendingPacingCard metrics={pacingMetrics} />
        <CashFlowCard metrics={cashFlowMetrics} />
        <FixedVsVariableCard metrics={fixedVsVariableMetrics} />
        <AnomalySpikeCard metrics={anomalyMetrics} />
      </div>
    </div>
  );
}
