import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useTrips } from "../hooks/useTrips";
import { CATEGORIES } from "../types/expense";
import { cn } from "../lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { 
  Plane, 
  CreditCard, 
  MapPin, 
  TrendingUp, 
  Plus, 
  Calendar,
  ChevronRight,
  Clock
} from "lucide-react";

type ViewMode = "subscriptions" | "travel";

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { trips, loading: tripsLoading } = useTrips();
  
  const [view, setView] = useState<ViewMode>("subscriptions");
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Subscription Form State
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("Subscriptions");
  const [day, setDay] = useState("1");
  const [isDisabled, setIsDisabled] = useState(false);
  const [countDown, setCountDown] = useState(0);

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || isDisabled) return;

    await addSubscription({
      name,
      amount: Number(amount),
      category,
      dayOfMonth: Number(day),
      isActive: true,
    });

    setName("");
    setAmount("");
    setDay("1");
    setIsDisabled(true);
    setCountDown(5);

    const timer = setInterval(() => {
      setCountDown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl mx-auto pt-24 pb-24 px-4 min-h-screen relative"
    >
      {/* Header & View Toggle */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Plans
          </h1>
          <button
            onClick={() => view === "subscriptions" ? setIsAddingSub(!isAddingSub) : navigate("/travel/new")}
            className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-1 rounded-2xl flex relative h-12">
          <motion.div
            layoutId="activeTab"
            className="absolute top-1 bottom-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm z-0"
            style={{ width: "calc(50% - 4px)", left: view === "subscriptions" ? "4px" : "calc(50% + 1px)" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
          <button
            onClick={() => setView("subscriptions")}
            className={cn(
              "flex-1 z-10 font-bold text-sm transition-colors",
              view === "subscriptions" ? "text-blue-600" : "text-slate-400"
            )}
          >
            Recurring
          </button>
          <button
            onClick={() => setView("travel")}
            className={cn(
              "flex-1 z-10 font-bold text-sm transition-colors",
              view === "travel" ? "text-blue-600" : "text-slate-400"
            )}
          >
            Travel
          </button>
        </div>
      </header>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {view === "subscriptions" ? (
          <motion.div
            key="subs"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
          >
            {/* Add Subscription Form */}
            <AnimatePresence>
              {isAddingSub && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-8 overflow-hidden"
                  onSubmit={handleSubSubmit}
                >
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Service Name</label>
                      <input
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-800 dark:text-white outline-none"
                        placeholder="e.g. Netflix, Rent"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                        <div className="relative mt-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-4 py-2.5 font-semibold text-slate-800 dark:text-white outline-none"
                            placeholder="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Day of Month</label>
                        <select
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 mt-1 font-semibold text-slate-800 dark:text-white outline-none"
                          value={day}
                          onChange={e => setDay(e.target.value)}
                        >
                          {[...Array(31)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isDisabled}
                      className={cn(
                        "w-full font-bold py-3 rounded-xl mt-2 transition-all",
                        isDisabled ? "bg-slate-100 dark:bg-slate-800 text-slate-400" : "bg-slate-900 dark:bg-blue-600 text-white"
                      )}
                    >
                      {isDisabled ? `Added! Wait ${countDown}s...` : "Save Subscription"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {subscriptions.length === 0 && !isAddingSub ? (
                <div className="text-center py-12 opacity-50">
                  <CreditCard className="mx-auto mb-4 text-slate-300" size={48} />
                  <p className="font-bold">No subscriptions yet.</p>
                  <p className="text-sm">Tap "+" to automate recurring bills.</p>
                </div>
              ) : (
                subscriptions.map(sub => (
                  <motion.div
                    layout
                    key={sub.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 border rounded-[2rem] p-5 shadow-sm transition-all",
                      sub.isActive ? "border-slate-100 dark:border-slate-800" : "opacity-60 grayscale"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black text-lg">
                          {sub.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">{sub.name}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Day {sub.dayOfMonth} • {sub.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 dark:text-white">₹{sub.amount}</div>
                        <button
                          onClick={() => updateSubscription(sub.id!, { isActive: !sub.isActive })}
                          className={cn("text-[9px] font-black mt-1 px-2 py-0.5 rounded-full border", sub.isActive ? "text-emerald-500 border-emerald-100" : "text-slate-400 border-slate-200")}
                        >
                          {sub.isActive ? "ACTIVE" : "PAUSED"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="travel"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            {trips.length === 0 ? (
              <div className="text-center py-12 opacity-50">
                <Plane className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="font-bold">No travel plans yet.</p>
                <p className="text-sm">Plan your next adventure by tapping "+".</p>
                <button 
                  onClick={() => navigate("/travel/new")}
                  className="mt-6 font-bold text-blue-600 border border-blue-100 px-6 py-2 rounded-xl"
                >
                  Create Trip
                </button>
              </div>
            ) : (
              trips.map(trip => (
                <motion.div
                  layout
                  key={trip.id}
                  onClick={() => navigate(`/travel/${trip.id}`)}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{trip.destination}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar size={12} />
                        {new Date(trip.startDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 dark:text-white">₹{trip.spentAmount.toLocaleString()}</p>
                      <p className="text-[10px] font-bold text-slate-400">OF ₹{trip.totalBudget.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((trip.spentAmount / trip.totalBudget) * 100, 100)}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        (trip.spentAmount / trip.totalBudget) > 1 ? "bg-red-500" : (trip.spentAmount / trip.totalBudget) > 0.8 ? "bg-amber-500" : "bg-blue-600"
                      )}
                    />
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                      <Clock size={12} />
                      {trip.status}
                    </div>
                    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
