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
      className="max-w-3xl mx-auto pt-24 pb-20 px-4"
    >
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 p-6 md:p-8 rounded-3xl shadow-sm">
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
