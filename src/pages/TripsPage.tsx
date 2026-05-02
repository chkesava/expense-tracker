import { useTrips } from "../hooks/useTrips";
import { motion } from "framer-motion";
import { MapPin, Calendar, Plus, ChevronRight, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import Amount from "../components/common/Amount";
import { Skeleton } from "../components/common/Skeleton";

export default function TripsPage({ hideHeader = false }: { hideHeader?: boolean }) {
  const { trips, loading } = useTrips();
  const navigate = useNavigate();

  const activeTrips = trips.filter(t => t.status === "active");
  const pastTrips = trips.filter(t => t.status !== "active");

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-3xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Quick Stats & Action */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Travel Hub</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Manage trip budgets and tagged expenses.</p>
          </div>
          <button
            onClick={() => navigate("/travel/new")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus size={18} />
            New Trip
          </button>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
            <MapPin size={32} />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">No trips planned yet</h2>
          <p className="text-sm text-slate-500 mt-1">Start tracking your travel expenses by creating a trip.</p>
          <button
            onClick={() => navigate("/travel/new")}
            className="mt-6 px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm shadow-xl"
          >
            Plan First Trip
          </button>
        </div>
      ) : (
        <>
          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp size={16} className="text-blue-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Current Journeys</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/travel/${trip.id}`)} />
                ))}
              </div>
            </div>
          )}

          {/* Past Trips */}
          {pastTrips.length > 0 && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 px-2">
                <Calendar size={16} className="text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Past Adventures</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} isPast onClick={() => navigate(`/travel/${trip.id}`)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Add FAB for mobile when in Trips page */}
      {trips.length > 0 && hideHeader && (
          <button
            onClick={() => navigate("/travel/new")}
            className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/40 active:scale-90 transition-transform z-40 lg:hidden"
          >
            <Plus size={28} />
          </button>
      )}
    </div>
  );
}

function TripCard({ trip, onClick, isPast = false }: { trip: any, onClick: () => void, isPast?: boolean }) {
  const spent = trip.spentAmount || 0;
  const budget = trip.budget || 0;
  const progress = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const isOverBudget = spent > budget;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bento-card p-5 cursor-pointer border transition-all duration-300",
        isPast ? "opacity-75 grayscale-[0.5] hover:grayscale-0" : "hover:border-blue-500/50"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              isPast ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
            )}>
              <MapPin size={16} />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white truncate max-w-[150px]">{trip.destination}</h4>
          </div>
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Calendar size={10} />
            {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/50 text-slate-400 group-hover:text-blue-500 transition-colors">
          <ChevronRight size={16} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Spent Amount</p>
            <div className={cn("text-lg font-black", isOverBudget ? "text-rose-500" : "text-slate-900 dark:text-white")}>
              <Amount value={spent} />
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Budget</p>
            <p className="text-xs font-black text-slate-600 dark:text-slate-300"><Amount value={budget} /></p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isOverBudget ? "bg-rose-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
              )}
            />
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter">
            <span className={cn(isOverBudget ? "text-rose-500" : "text-blue-500")}>{progress}% used</span>
            <span className="text-slate-400">{isOverBudget ? "Over budget" : <><Amount value={budget - spent} /> left</>}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
