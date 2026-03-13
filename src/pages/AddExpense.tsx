import { useLocation } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";
import { motion } from "framer-motion";
import type { Expense } from "../types/expense";

export default function AddExpense() {
  const location = useLocation();
  const editingExpense = (location.state as Expense | null) ?? null;

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="max-w-lg mx-auto pt-20 pb-24 px-4 bg-page-gradient min-h-screen"
    >
      <div className="bg-card-gradient border border-border rounded-2xl p-6 shadow-card-hover">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          {editingExpense?.id ? "Edit expense" : "New expense"}
        </h2>
        <ExpenseForm editingExpense={editingExpense} />
      </div>
    </motion.main>
  );
}
