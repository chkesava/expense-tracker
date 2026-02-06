import { useLocation } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";
import { motion } from "framer-motion";

export default function AddExpense() {
  const location = useLocation();
  const editingExpense = (location.state as any) ?? null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="max-w-xl mx-auto pt-20 pb-4 px-4 h-[calc(100vh-80px)] flex flex-col justify-center"
    >
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-5 rounded-[2rem] shadow-2xl shadow-indigo-500/10">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            {editingExpense ? '✏️' : '💸'}
          </span>
          {editingExpense ? 'Edit Expense' : 'New Expense'}
        </h2>

        <ExpenseForm editingExpense={editingExpense} />
      </div>
    </motion.main>
  );
}
