import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTrips } from "../hooks/useTrips";
import { useCategories } from "../hooks/useCategories";
import type { TripCategoryBudget } from "../types/trip";
import { cn } from "../lib/utils";
import { 
  Plane, 
  Calendar, 
  IndianRupee, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  PieChart
} from "lucide-react";
import { toast } from "../lib/toast";

const steps = [
  { id: 1, title: "Destination", description: "Where are you going?" },
  { id: 2, title: "Dates", description: "When is the trip?" },
  { id: 3, title: "Budget", description: "Total spending limit" },
  { id: 4, title: "Categories", description: "Optional category limits" },
];

export default function CreateTripWizard() {
  const navigate = useNavigate();
  const { addTrip } = useTrips();
  const { categories } = useCategories();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [destination, setDestination] = useState("");
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [categoryBudgets, setCategoryBudgets] = useState<TripCategoryBudget[]>([]);

  const nextStep = () => {
    if (currentStep === 1 && !destination) return toast.error("Please enter a destination");
    if (currentStep === 2 && (!startDate || !endDate)) return toast.error("Please select dates");
    if (currentStep === 3 && !totalBudget) return toast.error("Please enter a budget");
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addTrip({
        destination,
        tripName,
        startDate,
        endDate,
        totalBudget: Number(totalBudget),
        status: "active",
      }, categoryBudgets);
      
      toast.success("Bon Voyage! Trip created.");
      navigate("/subscriptions"); // Redirect back to travel list
    } catch (error) {
      console.error(error);
      toast.error("Failed to create trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCategoryBudget = (category: string) => {
    const exists = categoryBudgets.find(cb => cb.category === category);
    if (exists) {
      setCategoryBudgets(prev => prev.filter(cb => cb.category !== category));
    } else {
      setCategoryBudgets(prev => [...prev, { category, limit: 0 }]);
    }
  };

  const updateCategoryLimit = (category: string, limit: number) => {
    setCategoryBudgets(prev => prev.map(cb => 
      cb.category === category ? { ...cb, limit } : cb
    ));
  };

  return (
    <div className="min-h-screen bg-muted/30 pt-20 pb-24 px-4 overflow-x-hidden">
      <div className="max-w-xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center px-2">
          {steps.map((step) => (
            <div key={step.id} className="relative flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500",
                currentStep >= step.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                  : "bg-card text-muted-foreground border border-border"
              )}>
                {currentStep > step.id ? <CheckCircle2 size={20} /> : step.id}
              </div>
              <div className="absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                {step.title}
              </div>
            </div>
          ))}
          <div className="absolute top-[108px] left-[calc(50%-140px)] w-[280px] h-[2px] bg-muted -z-10" />
          <div 
            className="absolute top-[108px] left-[calc(50%-140px)] h-[2px] bg-primary -z-10 transition-all duration-500" 
            style={{ width: `${(currentStep - 1) * 93}px` }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="border border-border bg-card rounded-[2.5rem] p-8 shadow-sm"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {steps[currentStep - 1].description}
              </h2>
            </div>

            {/* Step 1: Destination */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                      autoFocus
                      className="w-full bg-muted/40 border border-border rounded-2xl py-4 pl-12 pr-4 font-bold text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      placeholder="e.g. Paris, Goa, Tokyo"
                      value={destination}
                      onChange={e => setDestination(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Trip Name (Optional)</label>
                  <input
                    className="w-full bg-muted/40 border border-border rounded-2xl py-4 px-4 font-bold text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                    placeholder="e.g. Summer Vacation, Business Trip"
                    value={tripName}
                    onChange={e => setTripName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Dates */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Departure Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                      type="date"
                      className="w-full bg-muted/40 border border-border rounded-2xl py-4 pl-12 pr-4 font-bold text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Return Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                      type="date"
                      className="w-full bg-muted/40 border border-border rounded-2xl py-4 pl-12 pr-4 font-bold text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Budget */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Total Trip Budget</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input
                      type="number"
                      autoFocus
                      className="w-full bg-muted/40 border border-border rounded-[2rem] py-8 pl-14 pr-8 text-4xl font-black text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                      placeholder="0"
                      value={totalBudget}
                      onChange={e => setTotalBudget(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Category Budgets */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {categories.filter(c => !c.isArchived).map((c) => {
                    const cat = c.name;
                    const cb = categoryBudgets.find(b => b.category === cat);
                    return (
                      <div 
                        key={c.id}
                        className={cn(
                          "p-4 rounded-3xl border transition-all cursor-pointer flex flex-col gap-2",
                          cb ? "bg-primary/10 border-primary/20" : "bg-muted/40 border-border hover:border-border"
                        )}
                        onClick={() => toggleCategoryBudget(cat)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground">{cat}</span>
                          {cb && <CheckCircle2 size={16} className="text-primary" />}
                        </div>
                        {cb && (
                          <input
                            type="number"
                            className="bg-card border border-primary/20 rounded-xl px-3 py-1.5 text-sm font-bold w-full outline-none focus:ring-2 focus:ring-primary/20"
                            placeholder="Limit"
                            value={cb.limit || ""}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateCategoryLimit(cat, Number(e.target.value))}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-12 flex gap-4">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold bg-muted text-muted-foreground flex items-center justify-center gap-2 active:scale-95 transition-all outline-none"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
              )}
              <button
                onClick={currentStep === 4 ? handleSubmit : nextStep}
                disabled={isSubmitting}
                className="flex-[2] py-4 px-6 rounded-2xl font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all outline-none hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? "Creating Trip..." : (currentStep === 4 ? "Build Trip" : "Next")}
                {currentStep < 4 && <ArrowRight size={20} />}
                {currentStep === 4 && !isSubmitting && <Plane size={20} />}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
