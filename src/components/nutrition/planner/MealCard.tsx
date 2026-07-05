import { useState } from "react";
import { motion } from "framer-motion";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, MoreVertical, Trash2, Edit2, ChevronRight, Apple } from "lucide-react";
import type { Meal } from "../../../types/nutrition";
import { cn } from "../../../lib/utils";
import { useNavigate } from "react-router-dom";

interface MealCardProps {
  meal: Meal;
  dateStr: string;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

export default function MealCard({ meal, dateStr, onRename, onDelete }: MealCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(meal.name);
  const [showMenu, setShowMenu] = useState(false);
  const dragControls = useDragControls();
  const navigate = useNavigate();

  const handleSaveRename = () => {
    if (editName.trim() && editName !== meal.name) {
      onRename(meal.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveRename();
    if (e.key === 'Escape') {
      setEditName(meal.name);
      setIsEditing(false);
    }
  };

  const totalCalories = meal.totals?.calories || 0;
  const foodCount = meal.foods?.length || 0;

  return (
    <Reorder.Item
      value={meal}
      id={meal.id}
      dragListener={false}
      dragControls={dragControls}
      className="relative w-full bg-card border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-3 group select-none"
    >
      <div className="flex items-center gap-3">
        <div
          className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={20} />
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              className="w-full bg-background border border-emerald-500/50 rounded-lg px-2 py-1 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          ) : (
            <h3 className="text-lg font-semibold text-foreground truncate flex items-center gap-2">
              {meal.name}
              {foodCount > 0 && <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{foodCount} items</span>}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalCalories}</span>
            <span className="text-xs text-muted-foreground ml-1">kcal</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute right-0 top-full mt-2 w-40 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  <button
                    onClick={() => { setShowMenu(false); setIsEditing(true); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-muted text-sm font-medium transition-colors"
                  >
                    <Edit2 size={16} /> Rename
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); onDelete(meal.id); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-destructive/10 text-destructive text-sm font-medium transition-colors"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pl-9 pt-2 border-t border-border/50">
        <div className="flex gap-4 text-xs font-medium text-muted-foreground">
          <span className="text-blue-500/80">P: {Math.round((meal.totals?.protein || 0) * 10) / 10}g</span>
          <span className="text-amber-500/80">C: {Math.round((meal.totals?.carbs || 0) * 10) / 10}g</span>
          <span className="text-red-500/80">F: {Math.round((meal.totals?.fat || 0) * 10) / 10}g</span>
        </div>
        <button 
          onClick={() => navigate(`/meal/${dateStr}/${meal.id}`)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:text-emerald-600 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full"
        >
          {foodCount > 0 ? 'Edit Log' : 'Add Food'}
          <ChevronRight size={14} />
        </button>
      </div>
    </Reorder.Item>
  );
}
