import { useState, useEffect } from "react";
import { Reorder, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import MealCard from "./MealCard";
import type { Meal } from "../../../types/nutrition";
import { useDailyLog } from "../../../hooks/useDailyLog";

interface DynamicMealPlannerProps {
  dateStr: string;
}

export default function DynamicMealPlanner({ dateStr }: DynamicMealPlannerProps) {
  const { 
    dailyLog, 
    meals, 
    loading, 
    initializeDay, 
    reorderMeals, 
    renameMeal, 
    deleteMeal, 
    addMealSlot 
  } = useDailyLog(dateStr);

  const [localMeals, setLocalMeals] = useState<Meal[]>([]);

  // Sync local state for drag and drop with Firestore state
  useEffect(() => {
    setLocalMeals(meals);
  }, [meals]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading planner...</div>;
  }

  if (!dailyLog) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-3xl text-center shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-3">Ready for today?</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          How many meals are you planning to eat today? You can always change this later.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {[2, 3, 4, 5, 6].map(num => (
            <button
              key={num}
              onClick={() => initializeDay(num)}
              className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
        </div>
        <button
          onClick={() => initializeDay(1)}
          className="text-sm font-medium text-emerald-500 hover:underline"
        >
          Just 1 meal (OMAD)
        </button>
      </div>
    );
  }

  const handleReorder = (newOrder: Meal[]) => {
    setLocalMeals(newOrder);
    reorderMeals(newOrder);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-foreground">Today's Plan</h2>
        <span className="text-sm font-medium text-muted-foreground">
          {localMeals.length} meals
        </span>
      </div>

      <Reorder.Group 
        axis="y" 
        values={localMeals} 
        onReorder={handleReorder}
        className="flex flex-col gap-4"
      >
        <AnimatePresence>
          {localMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              dateStr={dateStr}
              onRename={renameMeal}
              onDelete={deleteMeal}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      <button
        onClick={addMealSlot}
        className="mt-2 w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-3xl text-muted-foreground hover:text-emerald-500 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all font-medium"
      >
        <Plus size={20} /> Add Meal Slot
      </button>
    </div>
  );
}
