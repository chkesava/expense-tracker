import { Droplets, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface WaterWidgetProps {
  currentMl: number;
  targetMl: number;
  onAddWater: (amountMl: number) => void;
}

export default function WaterWidget({ currentMl, targetMl, onAddWater }: WaterWidgetProps) {
  const percent = Math.min((currentMl / (targetMl || 1)) * 100, 100);

  return (
    <div className="bg-card border border-border shadow-sm rounded-3xl p-6 relative overflow-hidden group">
      {/* Background Water Fill Effect */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-blue-500/10 transition-all duration-1000 ease-in-out -z-10"
        style={{ height: `${percent}%` }}
      />
      
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
            <Droplets size={24} className={percent >= 100 ? "fill-blue-500" : ""} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-baseline gap-1">
              Water <span className="text-xs font-normal text-muted-foreground ml-1">Today</span>
            </h3>
            <div className="text-2xl font-bold text-foreground">
              {currentMl} <span className="text-sm font-medium text-muted-foreground">/ {targetMl} ml</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onAddWater(250)}
            className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 py-2 rounded-xl transition-colors font-medium text-sm"
          >
            <Plus size={16} /> 250
          </button>
          <button
            onClick={() => onAddWater(500)}
            className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 py-2 rounded-xl transition-colors font-medium text-sm hidden sm:flex"
          >
            <Plus size={16} /> 500
          </button>
        </div>
      </div>
    </div>
  );
}
