import { useAuth } from "./hooks/useAuth";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, login, logout } = useAuth();

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

  return <Dashboard onLogout={logout} />;
}
