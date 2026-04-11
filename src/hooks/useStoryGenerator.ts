import { useMemo } from "react";
import type { Expense } from "../types/expense";
import { groupByCategory } from "../utils/analytics";

type StorySlideType =
  | "cover"
  | "hero"
  | "category"
  | "habit"
  | "comparison"
  | "outro";

interface StoryBar {
  label: string;
  value: number;
  formattedValue: string;
}

interface StorySlideData {
  emoji?: string;
  chips?: string[];
  bars?: StoryBar[];
}

export interface StorySlide {
  id: string;
  type: StorySlideType;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  value?: string;
  caption?: string;
  color: string;
  accent?: string;
  durationMs?: number;
  data?: StorySlideData;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return `Rs. ${currencyFormatter.format(Math.round(value))}`;
}

function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`;
}

function getMonthLabel(month: string) {
  if (!month) return "This Month";

  return new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getPreviousMonth(month: string) {
  if (!month) return "";

  const base = new Date(`${month}-01T00:00:00`);
  base.setMonth(base.getMonth() - 1);
  return base.toISOString().slice(0, 7);
}

function getWeekendShare(expenses: Expense[]) {
  if (!expenses.length) return 0;

  const weekendTotal = expenses.reduce((sum, expense) => {
    const day = new Date(`${expense.date}T00:00:00`).getDay();
    return day === 0 || day === 6 ? sum + expense.amount : sum;
  }, 0);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return total > 0 ? Math.round((weekendTotal / total) * 100) : 0;
}

function getHighestSpendDay(expenses: Expense[]) {
  const dailyTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.date] = (acc[expense.date] || 0) + expense.amount;
    return acc;
  }, {});

  const [date, amount] =
    Object.entries(dailyTotals).sort((a, b) => b[1] - a[1])[0] || [];

  if (!date) {
    return null;
  }

  return {
    date,
    amount,
    label: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }),
  };
}

function getPersonalityTitle(topCategory: string, weekendShare: number, expenseCount: number) {
  if (weekendShare >= 45) return "Weekend Warrior";
  if (topCategory === "Food") return "Coffee Connoisseur";
  if (topCategory === "Travel") return "Getaway Chaser";
  if (topCategory === "Shopping") return "Retail Royalty";
  if (topCategory === "Entertainment") return "Scene Stealer";
  if (topCategory === "Subscriptions") return "Auto-Renew Royalty";
  if (topCategory === "Health") return "Wellness Warrior";
  if (topCategory === "Rent") return "Home Base Hero";
  if (expenseCount >= 25) return "Tap Titan";
  return "Money Moves Maven";
}

function getCategoryEmoji(category: string) {
  switch (category) {
    case "Food":
      return "☕";
    case "Travel":
      return "✈";
    case "Shopping":
      return "🛍";
    case "Entertainment":
      return "🎬";
    case "Subscriptions":
      return "📺";
    case "Health":
      return "💪";
    case "Rent":
      return "🏠";
    case "Utilities":
      return "⚡";
    default:
      return "✨";
  }
}

export function useStoryGenerator(expenses: Expense[], month: string, allExpenses: Expense[] = expenses) {
  return useMemo(() => {
    if (!month || expenses.length === 0) return [];

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;
    const activeDays = new Set(expenses.map((expense) => expense.date)).size;
    const averageSpend = expenseCount > 0 ? total / expenseCount : 0;
    const weekendShare = getWeekendShare(expenses);
    const highestDay = getHighestSpendDay(expenses);
    const topCategories = groupByCategory(expenses).sort((a, b) => b.value - a.value);
    const topCategory = topCategories[0];
    const previousMonth = getPreviousMonth(month);
    const previousTotal = allExpenses
      .filter((expense) => expense.month === previousMonth)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const comparisonDelta = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : 0;
    const comparisonLabel =
      previousTotal <= 0
        ? "First full wrap unlocked"
        : comparisonDelta === 0
          ? "Right on par with last month"
          : comparisonDelta > 0
            ? `${formatPercent(comparisonDelta)} higher than last month`
            : `${formatPercent(Math.abs(comparisonDelta))} lower than last month`;
    const topCategoryShare = topCategory ? Math.round((topCategory.value / total) * 100) : 0;
    const personality = getPersonalityTitle(topCategory?.category ?? "", weekendShare, expenseCount);
    const monthLabel = getMonthLabel(month);
    const categoryBars = topCategories.slice(0, 3).map((item) => ({
      label: item.category,
      value: total > 0 ? Math.round((item.value / total) * 100) : 0,
      formattedValue: formatCurrency(item.value),
    }));

    const slides: StorySlide[] = [
      {
        id: "cover",
        type: "cover",
        eyebrow: "The Monthly Wrap",
        title: personality,
        subtitle: `${monthLabel} had a style all its own.`,
        value: `${expenseCount} spends`,
        caption: "Tap through like a story to see your month play back.",
        color: "from-emerald-500 via-cyan-500 to-blue-700",
        accent: "bg-white text-slate-950",
        durationMs: 5500,
        data: {
          emoji: topCategory ? getCategoryEmoji(topCategory.category) : "✨",
          chips: [monthLabel, `${activeDays} active days`, formatCurrency(total)],
        },
      },
      {
        id: "hero",
        type: "hero",
        eyebrow: "Big Picture",
        title: "Your month in numbers",
        subtitle: "A clean snapshot of how the spending landed.",
        value: formatCurrency(total),
        caption: `Across ${expenseCount} entries, you averaged ${formatCurrency(averageSpend)} per spend.`,
        color: "from-slate-950 via-slate-800 to-indigo-900",
        accent: "bg-cyan-300 text-slate-950",
        data: {
          emoji: "📈",
          chips: [`${expenseCount} transactions`, `${activeDays} active days`, `${weekendShare}% weekend spend`],
        },
      },
      {
        id: "category",
        type: "category",
        eyebrow: "Top Category",
        title: topCategory ? topCategory.category : "No leader yet",
        subtitle: topCategory
          ? `${formatPercent(topCategoryShare)} of your month clustered here.`
          : "Add a few more expenses to unlock category highlights.",
        value: topCategory ? formatCurrency(topCategory.value) : undefined,
        caption: topCategory
          ? "This was the category that defined your month."
          : "Your top category card will appear once there is spend to compare.",
        color: "from-fuchsia-600 via-rose-500 to-orange-500",
        accent: "bg-black/20 text-white",
        data: {
          emoji: topCategory ? getCategoryEmoji(topCategory.category) : "✨",
          bars: categoryBars,
        },
      },
      {
        id: "habit",
        type: "habit",
        eyebrow: "Spending Habit",
        title: weekendShare >= 40 ? "Weekend energy was strong" : "Weekday routine stayed in charge",
        subtitle: highestDay
          ? `Your heaviest day was ${highestDay.label} at ${formatCurrency(highestDay.amount)}.`
          : "Start logging daily and this slide will call out your biggest day.",
        value: formatPercent(weekendShare),
        caption: "Weekend share of total spend.",
        color: "from-amber-400 via-orange-500 to-rose-600",
        accent: "bg-white/20 text-white",
        data: {
          emoji: weekendShare >= 40 ? "🎉" : "🗓",
          chips: [
            highestDay ? `Peak day ${highestDay.label}` : "Peak day pending",
            `${activeDays} active days`,
            formatCurrency(averageSpend),
          ],
        },
      },
      {
        id: "comparison",
        type: "comparison",
        eyebrow: "Month Vs Month",
        title: previousTotal > 0 ? comparisonLabel : "Your first wrap is ready",
        subtitle:
          previousTotal > 0
            ? `Last month closed at ${formatCurrency(previousTotal)}.`
            : "As more months stack up, this slide will compare your momentum over time.",
        value: previousTotal > 0 ? formatCurrency(total - previousTotal) : formatCurrency(total),
        caption: previousTotal > 0 ? `${monthLabel} compared with ${getMonthLabel(previousMonth)}.` : monthLabel,
        color: "from-violet-700 via-indigo-700 to-slate-900",
        accent: "bg-emerald-300 text-slate-950",
        data: {
          emoji: previousTotal > 0 ? (comparisonDelta <= 0 ? "📉" : "📊") : "🚀",
          chips: [
            monthLabel,
            previousTotal > 0 ? getMonthLabel(previousMonth) : "No previous month",
            previousTotal > 0 ? formatPercent(Math.abs(comparisonDelta)) : "Fresh start",
          ],
        },
      },
      {
        id: "outro",
        type: "outro",
        eyebrow: "Share-Worthy Finish",
        title: "Monthly wrap complete",
        subtitle: `Badge unlocked: ${personality}.`,
        value: topCategory ? `${topCategory.category} era` : "New era",
        caption: "Keep tracking every day and next month gets even more fun.",
        color: "from-sky-500 via-indigo-600 to-slate-950",
        accent: "bg-white text-slate-950",
        data: {
          emoji: "🎯",
          chips: ["Story mode", "Monthly ritual", "Built for sharing"],
        },
      },
    ];

    return slides;
  }, [allExpenses, expenses, month]);
}
