import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import AddExpense from "./pages/AddExpense";
import ExpenseListPage from "./pages/ExpenseListPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import BottomNav from "./components/BottomNav";

export default function App() {
  const { user, login, logout } = useAuth();

  // -------- LOGIN SCREEN --------
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Expense Tracker</h1>
          <p className="auth-subtitle">
            Track your spending. Stay in control.
          </p>

          <button onClick={login} className="google-btn">
            <img
              className="google-icon"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            Sign in with Google
          </button>

          <div className="auth-footer">
            Your data is private and secure
          </div>
        </div>
      </div>
    );
  }

  // -------- APP ROUTES --------
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/add" />} />
          <Route path="/add" element={<AddExpense onLogout={logout} />} />
          <Route path="/expenses" element={<ExpenseListPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Routes>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
