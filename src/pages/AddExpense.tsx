import { useLocation } from "react-router-dom";
import ExpenseForm from "../components/ExpenseForm";

export default function AddExpense() {
  const location = useLocation();
  const editingExpense = (location.state as any) ?? null;

  return (
    <main className="app-container">
      <ExpenseForm editingExpense={editingExpense} />
    </main>
  );
}
