import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { NutritionProfile, NutritionGoals } from "../types/nutrition";

export function calculateNutritionGoals(profile: NutritionProfile): NutritionGoals {
  const { weightKg, heightCm, age, gender, activityLevel, goal } = profile;

  // Mifflin-St Jeor Equation
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') bmr += 5;
  else if (gender === 'female') bmr -= 161;
  else bmr -= 78; // average for 'other'

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  
  const maintenanceCalories = Math.round(bmr * activityMultipliers[activityLevel]);
  let targetCalories = maintenanceCalories;

  switch (goal) {
    case 'fat_loss': targetCalories -= 500; break;
    case 'muscle_gain': targetCalories += 300; break;
    case 'lean_bulk': targetCalories += 200; break;
    case 'maintenance': default: break;
  }

  // Basic Macro Split
  // Protein: ~2g per kg of body weight
  const proteinGrams = Math.round(weightKg * 2);
  
  // Fat: 25% of target calories (9 cals per gram)
  const fatGrams = Math.round((targetCalories * 0.25) / 9);
  
  // Carbs: Remaining calories (4 cals per gram)
  const remainingCals = targetCalories - (proteinGrams * 4) - (fatGrams * 9);
  const carbsGrams = Math.max(0, Math.round(remainingCals / 4));

  // Water: ~35ml per kg
  const waterMl = Math.round(weightKg * 35);

  return {
    maintenanceCalories,
    targetCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    waterMl
  };
}

export function useNutritionProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setGoals(null);
      setLoading(false);
      return;
    }

    const profileRef = doc(db, `users/${user.uid}/profile/nutrition`);
    const goalsRef = doc(db, `users/${user.uid}/goals/nutrition`);

    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as NutritionProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    const unsubscribeGoals = onSnapshot(goalsRef, (docSnap) => {
      if (docSnap.exists()) {
        setGoals(docSnap.data() as NutritionGoals);
      } else {
        setGoals(null);
      }
    });

    return () => {
      unsubscribeProfile();
      unsubscribeGoals();
    };
  }, [user]);

  const updateProfileAndGoals = async (newProfile: NutritionProfile) => {
    if (!user) return;
    
    const calculatedGoals = calculateNutritionGoals(newProfile);
    
    const profileRef = doc(db, `users/${user.uid}/profile/nutrition`);
    const goalsRef = doc(db, `users/${user.uid}/goals/nutrition`);

    await setDoc(profileRef, newProfile);
    await setDoc(goalsRef, calculatedGoals);
  };

  return {
    profile,
    goals,
    loading,
    updateProfileAndGoals,
    calculateNutritionGoals // Expose for previewing before saving
  };
}
