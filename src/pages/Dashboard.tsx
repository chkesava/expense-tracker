import MonthSelector from "../components/MonthSelector";
import { useExpenses } from "../hooks/useExpenses";
import { useMemo, useState } from "react";
import { groupByCategory, groupByMonth } from "../utils/analytics";
import { CATEGORIES } from "../types/expense";
import { useAuth } from "../hooks/useAuth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-toastify";
import useSettings from "../hooks/useSettings";
import { motion, type Variants } from "framer-motion";
import { cn } from "../lib/utils";
import GamificationCard from "../components/GamificationCard";
import { Link } from "react-router-dom";
import { useSubscriptions } from "../hooks/useSubscriptions";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Dashboard() {
  const expenses = useExpenses();
  const { subscriptions } = useSubscriptions();

  /* ----------------------------------
   * Months (unique, sorted, latest first)
   * ---------------------------------- */
  const months = useMemo(() => {
    return Array.from(new Set(expenses.map(e => e.month)))
      .sort()
      .reverse();
  }, [expenses]);

  /* ----------------------------------
   * Selected month (derived correctly)
   * ---------------------------------- */
  const [userSelectedMonth, setUserSelectedMonth] = useState<string | null>(null);

  const selectedMonth = userSelectedMonth ?? months[0] ?? "";

  /* ----------------------------------
   * Filtered expenses (month-wise)
   * ---------------------------------- */
  const filteredExpenses = useMemo(() => {
    if (!selectedMonth) return [];
    return expenses.filter(e => e.month === selectedMonth);
  }, [expenses, selectedMonth]);


  // Load More State
  const [visibleCount, setVisibleCount] = useState(7);

  const { user } = useAuth();
  const { settings } = useSettings();
  const [isAdding, setIsAdding] = useState(false);

  const quickAddDirect = async (category: string, amount: number) => {
    if (!user) return toast.error("Sign in to add expenses");
    setIsAdding(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const month = date.slice(0, 7);
      const now = new Date();
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: Number(amount),
        date,
        category,
        note: "",
        month,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
      });
      toast.success("Expense added");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add expense");
    } finally {
      setIsAdding(false);
    }
  };

  const topCategories = useMemo(() => {
    const grouped = groupByCategory(filteredExpenses);
    return grouped.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [filteredExpenses]);

  const monthlyComparison = useMemo(() => {
    const byMonth = groupByMonth(expenses); // monthly totals
    const current = byMonth.find(m => m.month === selectedMonth)?.value ?? 0;
    const idx = byMonth.findIndex(m => m.month === selectedMonth);
    const prev = idx >= 0 && byMonth[idx + 1] ? byMonth[idx + 1].value : 0;
    const change = prev === 0 ? 0 : Math.round(((current - prev) / prev) * 100);
    return { current, prev, change };
  }, [expenses, selectedMonth]);

  return (
    <>
      {/* Month Selector Outside Motion Container for Fixed Positioning */}
      <MonthSelector
        months={months}
        value={selectedMonth}
        onChange={setUserSelectedMonth}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="min-h-screen pt-20 md:pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {/* LEFT – Quick Add & Month selector */}
          <div className="space-y-6">

            {/* Gamification Stats */}
            <motion.div variants={itemVariants}>
              <GamificationCard />
            </motion.div>

            {/* Subscriptions Card */}
            <Link to="/subscriptions" className="block mb-4">
              <motion.section
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/80 backdrop-blur-xl border border-white/60 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-xl text-indigo-600 group-hover:scale-110 transition-transform">
                    📅
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Subscriptions</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {subscriptions.filter(s => s.isActive).length} active
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  ➔
                </div>
              </motion.section>
            </Link>

            <motion.section variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">⚡</span>
                Quick Add
              </h3>
              <div className="mt-2 text-xs text-slate-500 font-medium ml-1">Tap a preset to add instantly</div>

              <div className="mt-4 flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 6).map(c => (
                  <button
                    key={c}
                    className={cn(
                      "px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 transition-all active:scale-95 disabled:opacity-50",
                      "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                    )}
                    onClick={() => quickAddDirect(c, 100)}
                    disabled={isAdding}
                  >
                    {c} • ₹100
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors" onClick={() => quickAddDirect('Food', 50)} disabled={isAdding}>₹50</button>
                <button className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors" onClick={() => quickAddDirect('Transport', 100)} disabled={isAdding}>₹100</button>
                <button className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-colors" onClick={() => quickAddDirect('Other', 200)} disabled={isAdding}>₹200</button>
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">This Month</h3>
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight">₹{monthlyComparison.current.toLocaleString()}</div>
              <div className={cn("mt-2 text-sm font-semibold flex items-center gap-1", monthlyComparison.change >= 0 ? 'text-red-500' : 'text-emerald-600')}>
                {monthlyComparison.change === 0
                  ? <span className="text-slate-500">No change vs last month</span>
                  : (
                    <>
                      <span className="p-0.5 rounded-full bg-current/10">{monthlyComparison.change > 0 ? '↑' : '↓'}</span>
                      {Math.abs(monthlyComparison.change)}% vs last month
                    </>
                  )
                }
              </div>

              {settings.monthlyBudget > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-500">Budget Usage</span>
                    <span className="text-slate-700">₹{settings.monthlyBudget.toLocaleString()}</span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", monthlyComparison.current > settings.monthlyBudget ? 'bg-red-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(100, Math.round((monthlyComparison.current / settings.monthlyBudget) * 100))}%` }}
                    />
                  </div>
                  <div className="mt-2 text-right text-xs font-bold text-slate-600">
                    {Math.round((monthlyComparison.current / settings.monthlyBudget) * 100) || 0}% used
                  </div>
                </div>
              )}
            </motion.section>
          </div>

          {/* MIDDLE – Top categories */}
          <div className="space-y-6">
            <motion.section variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">📊</span>
                Top Categories
              </h3>
              <div className="space-y-3">
                {topCategories.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8 italic">No expense data yet</p>
                ) : (
                  topCategories.map((t, i) => (
                    <div key={t.category} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{t.category}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">₹{t.value.toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.section>

            <motion.section variants={itemVariants} className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-500/20">
              <h3 className="text-sm font-bold opacity-90 uppercase tracking-wider mb-2">💡 Insight</h3>
              <div className="text-sm font-medium leading-relaxed opacity-95">
                {monthlyComparison.current === 0 ? (
                  'No spending this month yet — add an expense to get insights.'
                ) : (
                  monthlyComparison.change > 0
                    ? 'Spending is trending up. Check your top categories to see where your money is going.'
                    : 'Great job! You are spending less compared to last month. Keep it up!'
                )}
              </div>
            </motion.section>
          </div>

          {/* RIGHT – Recent transactions */}
          <div className="space-y-6">
            <motion.section variants={itemVariants} className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 h-full">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🕒</span>
                Recent
              </h3>
              <div className="space-y-0.5">
                {filteredExpenses.slice(0, visibleCount).length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-10 italic">No recent transactions</p>
                ) : (
                  filteredExpenses.slice(0, visibleCount).map((e, i) => (
                    <div key={e.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                          {/* Simple category icon based on first letter or map */}
                          {e.category[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800">{e.category}</div>
                          <div className="text-xs text-slate-500 font-medium">{e.note || e.time || 'No note'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">-₹{e.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{e.date}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {filteredExpenses.length > visibleCount && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer p-2"
                  >
                    View More ({filteredExpenses.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </motion.section>
          </div>
        </div>
      </motion.div>
    </>
  );
}
