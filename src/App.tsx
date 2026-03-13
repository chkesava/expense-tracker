import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect } from "react";

import AddExpense from "./pages/AddExpense";
import ExpenseListPage from "./pages/ExpenseListPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import Dashboard from "./pages/Dashboard";
import SeedDataPage from "./pages/SeedData";
import BottomNav from "./components/BottomNav";
import AppTour from "./components/common/AppTour";
import Header from "./components/Header";
import SettingsPage from "./pages/Settings";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import useSettings, { SettingsProvider } from "./hooks/useSettings";
import NotFound from "./pages/NotFound";
import { useSubscriptions } from "./hooks/useSubscriptions";

import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminUserDetail from "./admin/pages/AdminUserDetail";
import AdminRouteGuard from "./guards/AdminRouteGuard";

function AppContent() {
  const location = useLocation();
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const { processSubscriptions } = useSubscriptions();

  // Auto-process subscriptions on app load (when this component mounts)
  useEffect(() => {
    processSubscriptions();
  }, [processSubscriptions]);

  // -------- LOGIN SCREEN --------
  if (!user) {
    return (
      <div className="min-h-screen bg-page-gradient flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-sm bg-card-gradient border border-border p-8 rounded-2xl shadow-card-hover text-center"
        >
          <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-1">Expense Tracker</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Track your spending. Stay in control.
          </p>

          <button
            type="button"
            onClick={login}
            className="w-full bg-gradient-primary text-primary-foreground font-medium py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-glow hover:shadow-glow-lg transition-all hover:opacity-95 active:scale-[0.99]"
          >
            <img
              className="w-5 h-5 opacity-90"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt=""
            />
            <span>Sign in with Google</span>
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            Your data is private and secure
          </p>
        </motion.div>
      </div>
    );
  }

  // -------- APP ROUTES --------
  return (
    <>
      <div className="min-h-screen flex flex-col bg-page-gradient text-foreground">
        <Header />

        <div className="flex-1 w-full pb-24 md:pb-0">
          <AppTour />
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              {import.meta.env.DEV && (
                <Route path="/seed" element={<SeedDataPage />} />
              )}
              <Route path="/admin" element={<AdminRouteGuard><AdminDashboard /></AdminRouteGuard>} />
              <Route path="/admin/users" element={<AdminRouteGuard><AdminUsers /></AdminRouteGuard>} />
              <Route path="/admin/user/:userId" element={<AdminRouteGuard><AdminUserDetail /></AdminRouteGuard>} />

              <Route path="/" element={<Navigate to={`/${settings.defaultView || 'dashboard'}`} replace />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </div>

        <BottomNav />
      </div >
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
      <ToastContainer position="top-center" theme="light" autoClose={2000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </BrowserRouter>
  );
}
