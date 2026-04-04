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
import Header from "./components/Header";
import SettingsPage from "./pages/Settings";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import ImportPage from "./pages/ImportPage";
import useSettings, { SettingsProvider } from "./hooks/useSettings";
import NotFound from "./pages/NotFound";
import { useSubscriptions } from "./hooks/useSubscriptions";
import { useTheme } from "./hooks/useTheme";

import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminUserDetail from "./admin/pages/AdminUserDetail";
import AdminRouteGuard from "./guards/AdminRouteGuard";
import AuthPage from "./pages/AuthPage";

function AppContent() {
  const location = useLocation();
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const { processSubscriptions } = useSubscriptions();

  // Auto-process subscriptions on app load (when this component mounts)
  useEffect(() => {
    processSubscriptions();
  }, [processSubscriptions]);

  // -------- AUTH SCREEN --------
  if (!user) {
    return <AuthPage />;
  }

  // -------- APP ROUTES --------
  return (
    <>
      {/* Global animated background */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 pointer-events-none transition-colors" />

      <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
        <Header />

        <div className="flex-1 w-full pb-24 md:pb-0">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to={`/${settings.defaultView || 'dashboard'}`} replace />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/expenses" element={<ExpenseListPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/subscriptions" element={<SubscriptionsPage />} />
              <Route path="/import" element={<ImportPage />} />
              {import.meta.env.DEV && (
                <Route path="/seed" element={<SeedDataPage />} />
              )}
              <Route path="/admin" element={<AdminRouteGuard><AdminDashboard /></AdminRouteGuard>} />
              <Route path="/admin/users" element={<AdminRouteGuard><AdminUsers /></AdminRouteGuard>} />
              <Route path="/admin/user/:userId" element={<AdminRouteGuard><AdminUserDetail /></AdminRouteGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </div>

        <BottomNav />
      </div>
    </>
  );
}

export default function App() {
  const { theme } = useTheme();
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
      <ToastContainer position="top-center" theme={theme === "dark" ? "dark" : "light"} autoClose={2000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </BrowserRouter>
  );
}
