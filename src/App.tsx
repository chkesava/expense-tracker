import { BrowserRouter, Routes, Route, Navigate, useLocation, matchPath } from "react-router-dom";
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
import Header from "./components/Header";
import MobileActionDock from "./components/MobileActionDock";
import BottomNav from "./components/BottomNav";
import PrivacyLock from "./components/PrivacyLock";
import AnalysisLab from "./pages/AnalysisLab";
import SettingsPage from "./pages/Settings";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import useSettings, { SettingsProvider } from "./hooks/useSettings";
import SplitPage from "./pages/SplitPage";
import SplitDetailPage from "./pages/SplitDetailPage";
import CreateTripWizard from "./pages/CreateTripWizard";
import TripDetailPage from "./pages/TripDetailPage";
import NotFound from "./pages/NotFound";
import LedgerHub from "./pages/LedgerHub";
import AccountDetailPage from "./pages/AccountDetailPage";
import InsightsHub from "./pages/InsightsHub";
import VaultsPage from "./pages/VaultsPage";
import VaultDetailPage from "./pages/VaultDetailPage";
import PaymentRequestPage from "./pages/PaymentRequestPage";

import { useSubscriptions } from "./hooks/useSubscriptions";
import { useTheme } from "./hooks/useTheme";
import { ModalProvider, useModals } from "./hooks/useModals";
import { CelebrationProvider } from "./hooks/useCelebration";
import Modal from "./components/common/Modal";
import ExpenseForm from "./components/ExpenseForm";
import MonthDrawer from "./components/MonthDrawer";
import CelebrationOverlay from "./components/CelebrationOverlay";

import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminUserDetail from "./admin/pages/AdminUserDetail";
import AdminRouteGuard from "./guards/AdminRouteGuard";
import AuthPage from "./pages/AuthPage";

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const { processSubscriptions } = useSubscriptions();
  const isPublicPayPage =
    !!matchPath("/payment/:slug", location.pathname) ||
    !!matchPath("/pay/:slug", location.pathname);

  useEffect(() => {
    if (user) processSubscriptions();
  }, [processSubscriptions, user]);

  if (isPublicPayPage) {
    return <PaymentRequestPage />;
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        <motion.div
          key="auth"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-50"
        >
          <AuthPage />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full min-h-[100dvh]"
        >
          <PrivacyLock>
            <AppRoutes />
          </PrivacyLock>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import AuraBackground from "./components/layout/AuraBackground";

function AppRoutes() {
  const location = useLocation();
  const { settings } = useSettings();
  const { isAddExpenseOpen, setIsAddExpenseOpen } = useModals();

  return (
    <>
      <AuraBackground />
      <Modal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        title="Add Transaction"
      >
        <ExpenseForm onSuccess={() => setIsAddExpenseOpen(false)} />
      </Modal>

      <MonthDrawer />
      <CelebrationOverlay />

      {/* Global animated background */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 pointer-events-none transition-colors" />

      <div className="min-h-[100dvh] flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors overflow-x-clip">
        <Header />

        <div className="flex-1 w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to={`/${settings.defaultView || 'dashboard'}`} replace />} />
              <Route path="/add" element={<AddExpense />} />
              <Route path="/ledger" element={<LedgerHub />} />
              <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
              <Route path="/insights" element={<InsightsHub />} />
              <Route path="/vaults" element={<VaultsPage />} />
              <Route path="/vaults/:vaultId" element={<VaultDetailPage />} />

              {/* Legacy redirects */}
              <Route path="/expenses" element={<Navigate to="/ledger?tab=expenses" replace />} />
              <Route path="/split" element={<Navigate to="/ledger?tab=splits" replace />} />
              <Route path="/subscriptions" element={<Navigate to="/ledger?tab=subscriptions" replace />} />
              <Route path="/analytics" element={<Navigate to="/insights?tab=analytics" replace />} />
              <Route path="/analysis" element={<Navigate to="/insights?tab=search" replace />} />

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/collect" element={<Navigate to="/ledger?tab=collect" replace />} />
              <Route path="/split/:id" element={<SplitDetailPage />} />
              <Route path="/travel/new" element={<CreateTripWizard />} />
              <Route path="/travel/:tripId" element={<TripDetailPage />} />
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

        {settings.navigationStyle === 'bottom' ? <BottomNav /> : <MobileActionDock />}
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
          <ModalProvider>
            <CelebrationProvider>
              <AppContent />
            </CelebrationProvider>
          </ModalProvider>
        </SettingsProvider>
      </AuthProvider>
      <ToastContainer position="top-center" theme={theme === "dark" || theme === "glass-3d" ? "dark" : "light"} autoClose={2000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </BrowserRouter>
  );
}
