import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNutritionProfile } from "../../hooks/useNutritionProfile";
import type { NutritionProfile, GoalType, ActivityLevel, DietPreference } from "../../types/nutrition";
import { Save, Calculator } from "lucide-react";
import { toast } from "../../lib/toast";
import { motion } from "framer-motion";

export default function NutritionProfilePage() {
  const { profile, loading, updateProfileAndGoals, calculateNutritionGoals } = useNutritionProfile();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<NutritionProfile>>({
    age: 30,
    gender: 'male',
    heightCm: 175,
    weightKg: 70,
    targetWeightKg: 65,
    goal: 'fat_loss',
    activityLevel: 'moderate',
    dietPreference: 'anything',
    allergies: []
  });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  const isComplete = formData.age && formData.heightCm && formData.weightKg && formData.targetWeightKg;
  const previewGoals = isComplete ? calculateNutritionGoals(formData as NutritionProfile) : null;

  const handleChange = (field: keyof NutritionProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!isComplete) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      await updateProfileAndGoals(formData as NutritionProfile);
      toast.success("Profile saved!");
      if (!profile) {
        // Was first setup, redirect to home
        navigate("/");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save profile");
    }
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nutrition Profile</h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-600 transition-colors"
        >
          <Save size={18} /> Save
        </button>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
          <UserIcon /> Basic Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Age</label>
            <input type="number" value={formData.age || ''} onChange={e => handleChange('age', Number(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Gender</label>
            <select value={formData.gender} onChange={e => handleChange('gender', e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Height (cm)</label>
            <input type="number" value={formData.heightCm || ''} onChange={e => handleChange('heightCm', Number(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Weight (kg)</label>
            <input type="number" step="0.1" value={formData.weightKg || ''} onChange={e => handleChange('weightKg', Number(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground border-b border-border pb-2">
          <TargetIcon /> Goals & Activity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Primary Goal</label>
            <select value={formData.goal} onChange={e => handleChange('goal', e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2">
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="lean_bulk">Lean Bulk</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Target Weight (kg)</label>
            <input type="number" step="0.1" value={formData.targetWeightKg || ''} onChange={e => handleChange('targetWeightKg', Number(e.target.value))} className="w-full bg-background border border-border rounded-xl px-4 py-2" />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Activity Level</label>
            <select value={formData.activityLevel} onChange={e => handleChange('activityLevel', e.target.value)} className="w-full bg-background border border-border rounded-xl px-4 py-2">
              <option value="sedentary">Sedentary (Little to no exercise)</option>
              <option value="light">Lightly Active (Exercise 1-3 days/week)</option>
              <option value="moderate">Moderately Active (Exercise 3-5 days/week)</option>
              <option value="active">Active (Exercise 6-7 days/week)</option>
              <option value="very_active">Very Active (Hard exercise/sports)</option>
            </select>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewGoals && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400 border-b border-emerald-500/20 pb-2 mb-4">
              <Calculator size={20} /> Calculated Daily Targets
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-background/50 p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground">Calories</div>
                <div className="text-2xl font-bold text-foreground">{previewGoals.targetCalories}</div>
              </div>
              <div className="bg-background/50 p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground">Protein</div>
                <div className="text-xl font-bold text-blue-500">{previewGoals.proteinGrams}g</div>
              </div>
              <div className="bg-background/50 p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground">Carbs</div>
                <div className="text-xl font-bold text-amber-500">{previewGoals.carbsGrams}g</div>
              </div>
              <div className="bg-background/50 p-4 rounded-2xl">
                <div className="text-sm text-muted-foreground">Fat</div>
                <div className="text-xl font-bold text-red-500">{previewGoals.fatGrams}g</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simple icons to keep it self-contained
function UserIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
}

function TargetIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
}

function AnimatePresence({ children }: any) {
  return <>{children}</>;
}
