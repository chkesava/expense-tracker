import { useState } from "react";
import { Flame, Activity, X } from "lucide-react";
import { toast } from "react-toastify";

interface WorkoutWidgetProps {
  duration: number;
  caloriesBurned: number;
  onSaveWorkout: (duration: number, caloriesBurned: number) => void;
}

export default function WorkoutWidget({ duration, caloriesBurned, onSaveWorkout }: WorkoutWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [durationInput, setDurationInput] = useState("");
  const [caloriesInput, setCaloriesInput] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseInt(durationInput);
    const c = parseInt(caloriesInput);
    
    if (isNaN(d) || isNaN(c) || d <= 0 || c <= 0) {
      return toast.error("Please enter valid positive numbers");
    }

    onSaveWorkout(d, c);
    setDurationInput("");
    setCaloriesInput("");
    setIsAdding(false);
    toast.success("Workout logged!");
  };

  return (
    <div className="bg-card border border-border shadow-sm rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
            <Flame size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Activity</h3>
            <p className="text-sm text-muted-foreground">{duration} mins • {caloriesBurned} kcal burned</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 transition-colors"
        >
          {isAdding ? <X size={20} /> : <Activity size={20} />}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="flex gap-3 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-border/50">
          <input 
            type="number"
            placeholder="Mins"
            value={durationInput}
            onChange={(e) => setDurationInput(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-20"
            required
          />
          <input 
            type="number"
            placeholder="Calories"
            value={caloriesInput}
            onChange={(e) => setCaloriesInput(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1"
            required
          />
          <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors">
            Log
          </button>
        </form>
      )}
    </div>
  );
}
