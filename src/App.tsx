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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-[0_20px_40px_-5px_rgb(0,0,0,0.1)] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

          <div className="mb-8">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl shadow-sm rotate-3"
            >
              💸
            </motion.div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Expense Tracker</h1>
            <p className="text-slate-500 text-lg">
              Track your spending. <br /> Stay in control.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={login}
            className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md text-slate-700 font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 group"
          >
            <img
              className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300"
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
            />
            <span>Sign in with Google</span>
          </motion.button>

          <div className="mt-8 text-xs text-slate-400 font-medium">
            Your data is private and secure
          </div>
        </motion.div>
      </div>
    );
  }

  // -------- APP ROUTES --------
  return (
    <>
      {/* Global animated background */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-slate-50 to-blue-50/50 pointer-events-none" />

      <div className="min-h-screen flex flex-col font-sans text-slate-900">
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
