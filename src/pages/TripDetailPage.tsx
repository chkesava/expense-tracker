import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTrips } from "../hooks/useTrips";
import { useExpenses } from "../hooks/useExpenses";
import { groupByCategory } from "../utils/analytics";
import { groupByDay } from "../utils/groupByDay";
import { cn } from "../lib/utils";
import CategoryPie from "../components/charts/CategoryPie";
import DailyTrend from "../components/charts/DailyTrend";
import CategoryBars from "../components/analytics/CategoryBars";
import { 
  ArrowLeft, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  MoreVertical,
  Trash2,
  Lock,
  PieChart
} from "lucide-react";
import { toast } from "react-toastify";
import { Skeleton } from "../components/common/Skeleton";

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, updateTrip, deleteTrip } = useTrips();
  const { expenses, loading } = useExpenses();
  
  const trip = trips.find(t => t.id === tripId);
  const tripExpenses = useMemo(() => 
    expenses.filter(e => e.tripId === tripId),
  [expenses, tripId]);

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500">
        <p>Trip not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 font-bold">Go Back</button>
      </div>
    );
  }

  const budgetUsedPercent = (trip.spentAmount / trip.totalBudget) * 100;
  const isOverBudget = budgetUsedPercent > 100;

  // Smart Insights
  const insights = useMemo(() => {
    const list = [];
    if (budgetUsedPercent > 80 && budgetUsedPercent <= 100) {
      list.push({ type: "warning", message: "You've used over 80% of your budget!" });
    }
    if (isOverBudget) {
      list.push({ type: "danger", message: `You are over budget by ₹${(trip.spentAmount - trip.totalBudget).toLocaleString()}` });
    }
    
    // Highest spending category
    const byCat = groupByCategory(tripExpenses);
    if (byCat.length > 0) {
      const highest = byCat.sort((a, b) => b.value - a.value)[0];
      list.push({ type: "info", message: `${highest.category} is your top expense category (₹${highest.value.toLocaleString()})` });
    }

    if (tripExpenses.length === 0) {
      list.push({ type: "info", message: "No expenses recorded yet. Start tracking to see insights!" });
    }

    return list;
  }, [trip, tripExpenses, budgetUsedPercent, isOverBudget]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this trip? Expenses will be unlinked but not deleted.")) {
      await deleteTrip(trip.id!);
      toast.success("Trip removed");
      navigate("/subscriptions");
    }
  };

  const toggleStatus = async () => {
    await updateTrip(trip.id!, { status: trip.status === "active" ? "completed" : "active" });
    toast.success(`Trip marked as ${trip.status === "active" ? "Completed" : "Active"}`);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto pt-24 pb-24 px-4 min-h-screen"
    >
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={toggleStatus}
              className={cn(
                "p-2 rounded-xl border transition-all",
                trip.status === "completed" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
              )}
            >
              <CheckCircle2 size={20} />
            </button>
            <button 
              onClick={handleDelete}
              className="p-2 rounded-xl bg-red-50 text-red-500 border border-red-100"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {trip.destination}
          </h1>
          {trip.tripName && (
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">
              {trip.tripName}
            </p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-full text-xs font-bold">
              <Clock size={14} />
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              trip.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            )}>
              {trip.status}
            </div>
          </div>
        </div>
      </header>

      {/* Budget Card */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm mb-6">
        {loading ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-3 w-12 ml-auto" />
                <Skeleton className="h-5 w-24 ml-auto" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Spending</p>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white">
                  ₹{trip.spentAmount.toLocaleString()}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Budget</p>
                <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
                  ₹{trip.totalBudget.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="relative w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isOverBudget ? "bg-red-500" : budgetUsedPercent > 80 ? "bg-amber-500" : "bg-blue-600"
                )}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
              <span>0%</span>
              <span className={isOverBudget ? "text-red-500" : ""}>{budgetUsedPercent.toFixed(1)}% USED</span>
              <span>100%</span>
            </div>
          </>
        )}
      </section>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <section className="flex flex-col gap-3 mb-8">
          {insights.map((insight, i) => (
            <motion.div 
              key={i}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "p-4 rounded-2xl border flex items-center gap-3",
                insight.type === "danger" ? "bg-red-50 border-red-100 text-red-600" :
                insight.type === "warning" ? "bg-amber-50 border-amber-100 text-amber-600" :
                "bg-blue-50 border-blue-100 text-blue-600"
              )}
            >
              {insight.type === "danger" ? <AlertCircle size={20} /> : 
               insight.type === "warning" ? <AlertCircle size={20} /> : <TrendingUp size={20} />}
              <p className="text-sm font-bold">{insight.message}</p>
            </motion.div>
          ))}
        </section>
      )}

      {/* Analytics */}
      <div className="space-y-6">
        {/* Category Pie */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <PieChart size={16} />
            Category Breakdown
          </h3>
          <div className="h-64 mb-8">
            <CategoryPie data={groupByCategory(tripExpenses)} />
          </div>
          <CategoryBars expenses={tripExpenses} />
        </section>

        {/* Daily Trend */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
            <TrendingUp size={16} />
            Spending Trend
          </h3>
          <div className="h-64">
            <DailyTrend data={groupByDay(tripExpenses)} />
          </div>
        </section>
        
        {/* Category Budget Progress */}
        {trip.categoryBudgets && trip.categoryBudgets.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Category Limits</h3>
            <div className="space-y-4">
              {trip.categoryBudgets.map(cb => {
                const catSpent = tripExpenses
                  .filter(e => e.category === cb.category)
                  .reduce((sum, e) => sum + e.amount, 0);
                const percent = (catSpent / cb.limit) * 100;
                
                return (
                  <div key={cb.category}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-600 dark:text-slate-300">{cb.category}</span>
                      <span className="text-slate-400">₹{catSpent} / ₹{cb.limit}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percent, 100)}%` }}
                        className={cn(
                          "h-full transition-all duration-1000",
                          percent > 100 ? "bg-red-500" : "bg-blue-400"
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* FAB - Quick Link to Add Expense for this trip */}
      <button
        onClick={() => navigate("/add-expense", { state: { tripId: trip.id } })}
        className="fixed bottom-28 right-6 w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20 active:scale-95 transition-all z-20"
      >
        <span className="text-2xl">+</span>
      </button>
    </motion.main>
  );
}
