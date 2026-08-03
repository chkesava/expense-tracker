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
import { toast } from "../lib/toast";
import { Skeleton } from "../components/common/Skeleton";
import Amount from "../components/common/Amount";
import ConfirmDialog from "../components/common/ConfirmDialog";


export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, updateTrip, deleteTrip } = useTrips();
  const { expenses, loading } = useExpenses();
  
  const trip = trips.find(t => t.id === tripId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const tripExpenses = useMemo(() => 
    expenses.filter(e => e.tripId === tripId),
  [expenses, tripId]);

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-muted-foreground">
        <p>Trip not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Go Back</button>
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
      list.push({ type: "danger", message: <span>You are over budget by <Amount value={trip.spentAmount - trip.totalBudget} /></span> });
    }
    
    // Highest spending category
    const byCat = groupByCategory(tripExpenses);
    if (byCat.length > 0) {
      const highest = byCat.sort((a, b) => b.value - a.value)[0];
      list.push({ type: "info", message: <span>{highest.category} is your top expense category (<Amount value={highest.value} />)</span> });
    }

    if (tripExpenses.length === 0) {
      list.push({ type: "info", message: "No expenses recorded yet. Start tracking to see insights!" });
    }

    return list;
  }, [trip, tripExpenses, budgetUsedPercent, isOverBudget]);

  const handleDelete = async () => {
    await deleteTrip(trip.id!);
    toast.success("Trip removed");
    navigate("/subscriptions");
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
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex gap-2">
            <button 
              onClick={toggleStatus}
              className={cn(
                "p-2 rounded-xl border transition-all",
                trip.status === "completed" ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground border-border"
              )}
            >
              <CheckCircle2 size={20} />
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20"
              aria-label="Delete trip"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {trip.destination}
          </h1>
          {trip.tripName && (
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
              {trip.tripName}
            </p>
          )}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
              <Clock size={14} />
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              trip.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            )}>
              {trip.status}
            </div>
          </div>
        </div>
      </header>

      {/* Budget Card */}
      <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm mb-6">
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Total Spending</p>
                <h2 className="text-4xl font-black text-foreground">
                  <Amount value={trip.spentAmount} />
                </h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Budget</p>
                <p className="text-lg font-bold text-muted-foreground">
                  <Amount value={trip.totalBudget} />
                </p>
              </div>
            </div>

            <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetUsedPercent, 100)}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isOverBudget ? "bg-destructive" : budgetUsedPercent > 80 ? "bg-warning" : "bg-primary"
                )}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground px-1">
              <span>0%</span>
              <span className={isOverBudget ? "text-destructive" : ""}>{budgetUsedPercent.toFixed(1)}% USED</span>
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
                insight.type === "danger" ? "bg-destructive/10 border-destructive/20 text-destructive" :
                insight.type === "warning" ? "bg-warning/10 border-warning/20 text-warning" :
                "bg-primary/10 border-primary/20 text-primary"
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
        <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
            <PieChart size={16} />
            Category Breakdown
          </h3>
          <div className="h-64 mb-8">
            <CategoryPie data={groupByCategory(tripExpenses)} />
          </div>
          <CategoryBars expenses={tripExpenses} />
        </section>

        {/* Daily Trend */}
        <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-2">
            <TrendingUp size={16} />
            Spending Trend
          </h3>
          <div className="h-64">
            <DailyTrend data={groupByDay(tripExpenses)} />
          </div>
        </section>
        
        {/* Category Budget Progress */}
        {trip.categoryBudgets && trip.categoryBudgets.length > 0 && (
          <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Category Limits</h3>
            <div className="space-y-4">
              {trip.categoryBudgets.map(cb => {
                const catSpent = tripExpenses
                  .filter(e => e.category === cb.category)
                  .reduce((sum, e) => sum + e.amount, 0);
                const percent = (catSpent / cb.limit) * 100;
                
                return (
                  <div key={cb.category}>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-muted-foreground">{cb.category}</span>
                      <span className="text-muted-foreground"><Amount value={catSpent} /> / <Amount value={cb.limit} /></span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percent, 100)}%` }}
                        className={cn(
                          "h-full transition-all duration-1000",
                          percent > 100 ? "bg-destructive" : "bg-primary"
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
        className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 active:scale-95 transition-all z-20"
        aria-label="Add expense to trip"
      >
        <span className="text-2xl">+</span>
      </button>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this trip?"
        message="Expenses will be unlinked but not deleted."
        variant="destructive"
        confirmText="Delete trip"
        cancelText="Cancel"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await handleDelete();
        }}
      />
    </motion.main>
  );
}
