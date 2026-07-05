import { useState, useEffect } from "react";
import { doc, collection, onSnapshot, writeBatch, query, orderBy, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { DailyLogSummary, Meal } from "../types/nutrition";

export function useDailyLog(dateStr: string) {
  const { user } = useAuth();
  const [dailyLog, setDailyLog] = useState<DailyLogSummary | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !dateStr) {
      setDailyLog(null);
      setMeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    const mealsRef = collection(db, `users/${user.uid}/daily_logs/${dateStr}/meals`);
    const mealsQuery = query(mealsRef, orderBy("order", "asc"));

    const unsubscribeLog = onSnapshot(logRef, (docSnap) => {
      if (docSnap.exists()) {
        setDailyLog(docSnap.data() as DailyLogSummary);
      } else {
        setDailyLog(null);
      }
    });

    const unsubscribeMeals = onSnapshot(mealsQuery, (querySnap) => {
      const fetchedMeals = querySnap.docs.map(d => d.data() as Meal);
      setMeals(fetchedMeals);
      setLoading(false); // Only set loading false once meals are loaded
    });

    return () => {
      unsubscribeLog();
      unsubscribeMeals();
    };
  }, [user, dateStr]);

  const initializeDay = async (mealCount: number) => {
    if (!user) return;
    
    const batch = writeBatch(db);
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    
    const initialLog: DailyLogSummary = {
      date: dateStr,
      mealCount,
      nutritionSummary: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      waterLoggedMl: 0,
      workoutSummary: { durationMinutes: 0, caloriesBurned: 0 }
    };
    
    batch.set(logRef, initialLog);

    const defaultNames = ["Breakfast", "Lunch", "Dinner", "Snack 1", "Snack 2", "Snack 3"];
    
    for (let i = 0; i < mealCount; i++) {
      const mealId = crypto.randomUUID();
      const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
      
      const newMeal: Meal = {
        id: mealId,
        name: defaultNames[i] || `Meal ${i + 1}`,
        order: i,
        foods: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
      };
      
      batch.set(mealRef, newMeal);
    }

    await batch.commit();
  };

  const reorderMeals = async (reorderedMeals: Meal[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    
    reorderedMeals.forEach((meal, index) => {
      const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${meal.id}`);
      batch.update(mealRef, { order: index });
    });

    await batch.commit();
  };

  const renameMeal = async (mealId: string, newName: string) => {
    if (!user) return;
    const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
    const batch = writeBatch(db);
    batch.update(mealRef, { name: newName });
    await batch.commit();
  };

  const deleteMeal = async (mealId: string) => {
    if (!user || !dailyLog) return;
    
    const batch = writeBatch(db);
    const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
    batch.delete(mealRef);

    // Update the meal count on the daily log
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    batch.update(logRef, { mealCount: dailyLog.mealCount - 1 });

    // We also should reorder the remaining meals, but listening to the snapshot might be enough.
    // However, to keep orders contiguous:
    const remainingMeals = meals.filter(m => m.id !== mealId);
    remainingMeals.forEach((meal, index) => {
      const mRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${meal.id}`);
      batch.update(mRef, { order: index });
    });

    await batch.commit();
  };

  const addMealSlot = async () => {
    if (!user || !dailyLog) return;

    const batch = writeBatch(db);
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    
    const mealId = crypto.randomUUID();
    const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
    
    const newOrder = meals.length;
    const newMeal: Meal = {
      id: mealId,
      name: `Meal ${newOrder + 1}`,
      order: newOrder,
      foods: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    };

    batch.set(mealRef, newMeal);
    batch.update(logRef, { mealCount: dailyLog.mealCount + 1 });

    await batch.commit();
  };

  const addWater = async (amountMl: number) => {
    if (!user || !dailyLog) return;
    
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    await updateDoc(logRef, {
      waterLoggedMl: (dailyLog.waterLoggedMl || 0) + amountMl
    });
  };

  const saveWorkout = async (durationMinutes: number, caloriesBurned: number) => {
    if (!user || !dailyLog) return;
    
    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    await updateDoc(logRef, {
      workoutSummary: {
        durationMinutes: (dailyLog.workoutSummary?.durationMinutes || 0) + durationMinutes,
        caloriesBurned: (dailyLog.workoutSummary?.caloriesBurned || 0) + caloriesBurned
      }
    });
  };

  const saveFoodsToMeal = async (mealId: string, newFoods: any[]) => {
    if (!user || !dailyLog) return;
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    const batch = writeBatch(db);
    
    // Calculate new totals for the meal
    const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
    const updatedFoods = [...meal.foods, ...newFoods.map(f => ({ ...f, id: crypto.randomUUID() }))];
    
    const newMealTotals = updatedFoods.reduce((acc, f) => ({
      calories: acc.calories + (f.nutrients?.calories || 0),
      protein: acc.protein + (f.nutrients?.protein || 0),
      carbs: acc.carbs + (f.nutrients?.carbs || 0),
      fat: acc.fat + (f.nutrients?.fat || 0),
      fiber: acc.fiber + (f.nutrients?.fiber || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    batch.update(mealRef, {
      foods: updatedFoods,
      totals: newMealTotals
    });

    // Calculate diff to apply to daily log
    const diff = {
      calories: newMealTotals.calories - meal.totals.calories,
      protein: newMealTotals.protein - meal.totals.protein,
      carbs: newMealTotals.carbs - meal.totals.carbs,
      fat: newMealTotals.fat - meal.totals.fat,
      fiber: newMealTotals.fiber - meal.totals.fiber,
    };

    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    batch.update(logRef, {
      "nutritionSummary.calories": dailyLog.nutritionSummary.calories + diff.calories,
      "nutritionSummary.protein": dailyLog.nutritionSummary.protein + diff.protein,
      "nutritionSummary.carbs": dailyLog.nutritionSummary.carbs + diff.carbs,
      "nutritionSummary.fat": dailyLog.nutritionSummary.fat + diff.fat,
      "nutritionSummary.fiber": (dailyLog.nutritionSummary.fiber || 0) + diff.fiber,
    });

    await batch.commit();
  };

  const removeFoodFromMeal = async (mealId: string, foodId: string) => {
    if (!user || !dailyLog) return;
    const meal = meals.find(m => m.id === mealId);
    if (!meal) return;

    const foodToRemove = meal.foods.find(f => f.id === foodId);
    if (!foodToRemove) return;

    const batch = writeBatch(db);
    
    // Calculate new totals for the meal by subtracting the food
    const mealRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}/meals/${mealId}`);
    const updatedFoods = meal.foods.filter(f => f.id !== foodId);
    
    const newMealTotals = updatedFoods.reduce((acc, f) => ({
      calories: acc.calories + (f.nutrients?.calories || 0),
      protein: acc.protein + (f.nutrients?.protein || 0),
      carbs: acc.carbs + (f.nutrients?.carbs || 0),
      fat: acc.fat + (f.nutrients?.fat || 0),
      fiber: acc.fiber + (f.nutrients?.fiber || 0),
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    batch.update(mealRef, {
      foods: updatedFoods,
      totals: newMealTotals
    });

    // Calculate diff to apply to daily log (subtracting)
    const diff = {
      calories: newMealTotals.calories - meal.totals.calories,
      protein: newMealTotals.protein - meal.totals.protein,
      carbs: newMealTotals.carbs - meal.totals.carbs,
      fat: newMealTotals.fat - meal.totals.fat,
      fiber: newMealTotals.fiber - meal.totals.fiber,
    };

    const logRef = doc(db, `users/${user.uid}/daily_logs/${dateStr}`);
    batch.update(logRef, {
      "nutritionSummary.calories": dailyLog.nutritionSummary.calories + diff.calories,
      "nutritionSummary.protein": dailyLog.nutritionSummary.protein + diff.protein,
      "nutritionSummary.carbs": dailyLog.nutritionSummary.carbs + diff.carbs,
      "nutritionSummary.fat": dailyLog.nutritionSummary.fat + diff.fat,
      "nutritionSummary.fiber": (dailyLog.nutritionSummary.fiber || 0) + diff.fiber,
    });

    await batch.commit();
  };

  return {
    dailyLog,
    meals,
    loading,
    initializeDay,
    reorderMeals,
    renameMeal,
    deleteMeal,
    addMealSlot,
    saveFoodsToMeal,
    removeFoodFromMeal,
    addWater,
    saveWorkout
  };
}
