import { useState, useMemo } from "react";
import { useNutritionProfile } from "../../hooks/useNutritionProfile";
import { useDailyLog } from "../../hooks/useDailyLog";
import MacroRing from "../../components/nutrition/MacroRing";
import WaterWidget from "../../components/nutrition/WaterWidget";
import WorkoutWidget from "../../components/nutrition/WorkoutWidget";
import DynamicMealPlanner from "../../components/nutrition/planner/DynamicMealPlanner";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function NutritionDashboard() {
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const { goals } = useNutritionProfile();
  const { dailyLog, addWater, saveWorkout } = useDailyLog(selectedDateStr);

  const changeDate = (days: number) => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDateStr(`${yyyy}-${mm}-${dd}`);
  };

  const isToday = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return selectedDateStr === `${yyyy}-${mm}-${dd}`;
  }, [selectedDateStr]);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-6 flex flex-col gap-6 relative">
      {/* Date Selector */}
      <div className="flex items-center justify-between bg-card border border-border shadow-sm rounded-full p-2 px-4 sticky top-16 md:top-20 z-10 backdrop-blur-xl bg-card/90">
        <button 
          onClick={() => changeDate(-1)}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Calendar size={18} className="text-emerald-500" />
          <input 
            type="date"
            value={selectedDateStr}
            onChange={(e) => setSelectedDateStr(e.target.value)}
            className="bg-transparent border-none focus:outline-none focus:ring-0 text-center font-semibold cursor-pointer max-w-[140px]"
          />
          {isToday && <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Today</span>}
        </div>

        <button 
          onClick={() => changeDate(1)}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex flex-col mb-2">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-3xl p-6 flex items-center justify-between overflow-x-auto gap-4 scrollbar-none mb-2">
        <MacroRing 
          label="Calories"
          current={dailyLog?.nutritionSummary.calories || 0}
          target={goals?.targetCalories || 2000}
          unit="kcal"
          color="text-emerald-500"
          bgColor="text-emerald-500/10"
          size={84}
          strokeWidth={8}
        />
        <MacroRing 
          label="Protein"
          current={dailyLog?.nutritionSummary.protein || 0}
          target={goals?.proteinGrams || 150}
          unit="g"
          color="text-blue-500"
          bgColor="text-blue-500/10"
        />
        <MacroRing 
          label="Carbs"
          current={dailyLog?.nutritionSummary.carbs || 0}
          target={goals?.carbsGrams || 200}
          unit="g"
          color="text-amber-500"
          bgColor="text-amber-500/10"
        />
        <MacroRing 
          label="Fat"
          current={dailyLog?.nutritionSummary.fat || 0}
          target={goals?.fatGrams || 65}
          unit="g"
          color="text-red-500"
          bgColor="text-red-500/10"
        />
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-4 mb-2">
        <div className="flex-1">
          <WaterWidget 
            currentMl={dailyLog?.waterLoggedMl || 0}
            targetMl={goals?.waterMl || 2500}
            onAddWater={addWater}
          />
        </div>
        <div className="flex-1">
          <WorkoutWidget
            duration={dailyLog?.workoutSummary?.durationMinutes || 0}
            caloriesBurned={dailyLog?.workoutSummary?.caloriesBurned || 0}
            onSaveWorkout={saveWorkout}
          />
        </div>
      </div>

      <div className="w-full">
        <DynamicMealPlanner dateStr={selectedDateStr} />
      </div>
    </div>
  );
}
