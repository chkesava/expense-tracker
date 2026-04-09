import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Tag, X, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { CATEGORIES } from "../types/expense";
import Modal from "./common/Modal";

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onCategorize: (category: string) => void;
  userCategories: any[];
}

export default function BulkActionBar({ 
  selectedCount, 
  onClear, 
  onDelete, 
  onCategorize,
  userCategories 
}: BulkActionBarProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 border border-white/10"
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={onClear}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold">{selectedCount} Selected</span>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Bulk Actions</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
            >
              <Tag size={14} className="text-blue-400" />
              <span>Categorize</span>
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-colors"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </motion.div>
      </div>

      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Change Category"
      >
        <div className="p-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Update category for all <span className="font-bold text-slate-900 dark:text-white">{selectedCount}</span> selected expenses.
          </p>
          
          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {[...userCategories.map(c => c.name), ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  onCategorize(cat);
                  setShowCategoryModal(false);
                }}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all text-left group"
              >
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{cat}</span>
                <CheckCircle2 size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
