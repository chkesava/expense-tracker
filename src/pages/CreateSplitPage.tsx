import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSplits } from "../hooks/useSplits";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Users, 
  IndianRupee, 
  Info,
  ChevronDown,
  LayoutGrid,
  Settings2,
  Receipt
} from "lucide-react";
import { cn } from "../lib/utils";
import { CATEGORIES } from "../types/expense";
import type { Participant } from "../types/split";

const containerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function CreateSplitPage() {
  const navigate = useNavigate();
  const { createSplit } = useSplits();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [category, setCategory] = useState("Other");
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Initialize with current user
  useEffect(() => {
    if (user && participants.length === 0) {
      setParticipants([
        { 
          name: "You", 
          amount: 0, 
          paid: true, 
          isCurrentUser: true, 
          userId: user.uid 
        }
      ]);
    }
  }, [user]);

  // Recalculate equal amounts when total or participant count changes
  useEffect(() => {
    if (splitType === "equal" && totalAmount && participants.length > 0) {
      const amountPerPerson = Number(totalAmount) / participants.length;
      setParticipants(prev => prev.map(p => ({ ...p, amount: amountPerPerson })));
    }
  }, [totalAmount, participants.length, splitType]);

  const handleAddParticipant = () => {
    setParticipants(prev => [
      ...prev, 
      { name: "", amount: 0, paid: false, isCurrentUser: false }
    ]);
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants[index].isCurrentUser) return;
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: any) => {
    setParticipants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validate = () => {
    if (!title) return "Please enter a title";
    if (!totalAmount || Number(totalAmount) <= 0) return "Please enter a valid total amount";
    if (participants.some(p => !p.name)) return "All participants must have a name";
    
    if (splitType === "custom") {
      const sum = participants.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      if (Math.abs(sum - Number(totalAmount)) > 0.01) {
        return `Custom amounts must sum to ₹${totalAmount} (Current: ₹${sum})`;
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      alert(error);
      return;
    }

    try {
      await createSplit({
        title,
        totalAmount: Number(totalAmount),
        splitType,
        category,
        participants: participants.map(p => ({
          ...p,
          amount: Number(p.amount)
        }))
      });
      navigate("/split");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.main
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-xl mx-auto px-4 pt-20 pb-28 space-y-8"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Create Split</h1>
          <p className="text-sm text-slate-500 font-medium">Split bills with friends easily</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <motion.div variants={itemVariants} className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Title</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Receipt size={18} />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dinner, Weekend Trip, etc."
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              />
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Total Amount</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <IndianRupee size={18} />
                </div>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Category</label>
              <div className="relative group">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-4 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none cursor-pointer"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown size={18} />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Split Type Selector */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Participants</h3>
            <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitType("equal")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  splitType === "equal" 
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                    : "text-slate-500"
                )}
              >
                <LayoutGrid size={14} />
                Equal
              </button>
              <button
                type="button"
                onClick={() => setSplitType("custom")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  splitType === "custom" 
                    ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" 
                    : "text-slate-500"
                )}
              >
                <Settings2 size={14} />
                Custom
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {participants.map((p, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm space-y-3 relative group"
                >
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleParticipantChange(index, "name", e.target.value)}
                        placeholder={p.isCurrentUser ? "You" : "Friend's Name"}
                        disabled={p.isCurrentUser}
                        className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 outline-none"
                      />
                      <input
                        type="text"
                        value={p.upiId || ""}
                        onChange={(e) => handleParticipantChange(index, "upiId", e.target.value)}
                        placeholder="UPI ID (optional)"
                        className="w-full bg-transparent border-none p-0 text-[10px] uppercase font-bold text-slate-500 placeholder:text-slate-400 focus:ring-0 outline-none"
                      />
                    </div>

                    <div className="w-24 relative group/amount">
                      <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none text-slate-400">
                        <span className="text-xs font-bold">₹</span>
                      </div>
                      <input
                        type="number"
                        value={p.amount || ""}
                        onChange={(e) => handleParticipantChange(index, "amount", e.target.value)}
                        disabled={splitType === "equal"}
                        placeholder="0"
                        className={cn(
                          "w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl py-2 pl-6 pr-2 text-sm font-black text-right transition-all outline-none font-sans",
                          splitType === "equal" ? "opacity-50" : "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                        )}
                      />
                    </div>

                    {!p.isCurrentUser && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(index)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              type="button"
              onClick={handleAddParticipant}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 hover:text-blue-500 hover:border-blue-500/30 hover:bg-blue-50/10 transition-all flex items-center justify-center gap-2 font-bold text-sm"
            >
              <Plus size={18} />
              Add Participant
            </button>
          </div>
        </motion.div>

        {splitType === "equal" && totalAmount && (
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl flex items-start gap-3">
            <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              Total ₹{totalAmount} will be split equally: ₹{(Number(totalAmount) / participants.length).toFixed(2)} each.
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 bg-blue-600 text-white font-black rounded-3xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all transform flex items-center justify-center gap-2"
        >
          Create Split Expense
        </button>
      </form>
    </motion.main>
  );
}
