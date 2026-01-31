import ExpenseForm from "../components/ExpenseForm";

export default function AddExpense({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <header className="app-header">
        <div className="app-title">Add Expense</div>
        <button onClick={onLogout} className="logout-btn">
          Logout
        </button>
      </header>

      <main className="app-container">
        <ExpenseForm />
      </main>
    </>
  );
}
