import { useTrips } from "../hooks/useTrips";
import { motion } from "framer-motion";
import { MapPin, Calendar, Plus, ChevronRight, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import Amount from "../components/common/Amount";
import { Skeleton } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import Button from "../components/ui/Button";

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
            <h1 className="text-2xl font-black tracking-tight text-foreground">Travel Hub</h1>
            <p className="text-xs font-medium text-muted-foreground">Manage trip budgets and tagged expenses.</p>
          </div>
          <Button type="button" icon={<Plus size={18} />} onClick={() => navigate("/travel/new")}>
            New Trip
          </Button>
        </div>
      )}

      {trips.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7" />}
          title="No trips planned yet"
          description="Start tracking your travel expenses by creating a trip."
          actionLabel="Plan first trip"
          onAction={() => navigate("/travel/new")}
        />
      ) : (
        <>
          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Journeys</h3>
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
                <Calendar size={16} className="text-muted-foreground" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Past Adventures</h3>
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
            className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-90 transition-transform z-40 lg:hidden"
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
        isPast ? "opacity-75 grayscale-[0.5] hover:grayscale-0" : "hover:border-primary/50"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              isPast ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
            )}>
              <MapPin size={16} />
            </div>
            <h4 className="font-black text-foreground truncate max-w-[150px]">{trip.destination}</h4>
          </div>
          <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Calendar size={10} />
            {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:text-primary transition-colors">
          <ChevronRight size={16} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Spent Amount</p>
            <div className={cn("text-lg font-black", isOverBudget ? "text-destructive" : "text-foreground")}>
              <Amount value={spent} />
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Budget</p>
            <p className="text-xs font-black text-muted-foreground"><Amount value={budget} /></p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isOverBudget ? "bg-destructive" : "bg-primary"
              )}
            />
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase tracking-tighter">
            <span className={cn(isOverBudget ? "text-destructive" : "text-primary")}>{progress}% used</span>
            <span className="text-muted-foreground">{isOverBudget ? "Over budget" : <><Amount value={budget - spent} /> left</>}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
