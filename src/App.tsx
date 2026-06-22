import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "./utils/lazyWithRetry";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Header from "./components/Header";
import MobileActionDock from "./components/MobileActionDock";
import BottomNav from "./components/BottomNav";
import PrivacyLock from "./components/PrivacyLock";
import useSettings, { SettingsProvider } from "./hooks/useSettings";

import { useSubscriptions } from "./hooks/useSubscriptions";
import { useTheme } from "./hooks/useTheme";
import { ModalProvider, useModals } from "./hooks/useModals";
import { CelebrationProvider } from "./hooks/useCelebration";
import Modal from "./components/common/Modal";
import ExpenseForm from "./components/ExpenseForm";
import MonthDrawer from "./components/MonthDrawer";
import CelebrationOverlay from "./components/CelebrationOverlay";
import AddAccountEntryModal from "./components/AddAccountEntryModal";

import AdminRouteGuard from "./guards/AdminRouteGuard";
import AuthPage from "./pages/AuthPage";
import AuraBackground from "./components/layout/AuraBackground";
import { LedgerStateProvider } from "./hooks/useLedgerState";

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const LedgerHub = lazyWithRetry(() => import("./pages/LedgerHub"));
const InsightsHub = lazyWithRetry(() => import("./pages/InsightsHub"));
const SettingsPage = lazyWithRetry(() => import("./pages/Settings"));
const AddExpense = lazyWithRetry(() => import("./pages/AddExpense"));
const SeedDataPage = lazyWithRetry(() => import("./pages/SeedData"));
const SplitDetailPage = lazyWithRetry(() => import("./pages/SplitDetailPage"));
const CreateTripWizard = lazyWithRetry(() => import("./pages/CreateTripWizard"));
const TripDetailPage = lazyWithRetry(() => import("./pages/TripDetailPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const AccountDetailPage = lazyWithRetry(() => import("./pages/AccountDetailPage"));
const InvestmentDetailPage = lazyWithRetry(() => import("./pages/InvestmentDetailPage"));
const VaultsPage = lazyWithRetry(() => import("./pages/VaultsPage"));
const VaultDetailPage = lazyWithRetry(() => import("./pages/VaultDetailPage"));
const PaymentRequestPage = lazyWithRetry(() => import("./pages/PaymentRequestPage"));
const AdminDashboard = lazyWithRetry(() => import("./admin/pages/AdminDashboard"));
const AdminUsers = lazyWithRetry(() => import("./admin/pages/AdminUsers"));
const AdminUserDetail = lazyWithRetry(() => import("./admin/pages/AdminUserDetail"));

function RouteFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center px-6">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

function PaySlugRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/payment/${slug}`} replace />;
}

function AppContent() {
  const { user } = useAuth();
  const { processSubscriptions } = useSubscriptions();

  useEffect(() => {
    if (user) processSubscriptions();
  }, [processSubscriptions, user]);

  useEffect(() => {
    sessionStorage.removeItem("chunk-reload-attempted");
  }, []);

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

function AppRoutes() {
  const location = useLocation();
  const { settings } = useSettings();
  const {
    isAddExpenseOpen,
    setIsAddExpenseOpen,
    editingExpense,
    setEditingExpense,
    editingIncome,
    setEditingIncome,
    accountEntryAccount,
    setAccountEntryAccount,
  } = useModals();
  const closeTransactionEditor = () => {
    setEditingExpense(null);
    setEditingIncome(null);
  };

  return (
    <>
      <AuraBackground />
      {isAddExpenseOpen && (
        <Modal
          isOpen={isAddExpenseOpen}
          onClose={() => setIsAddExpenseOpen(false)}
          title="Add Transaction"
        >
          <ExpenseForm onSuccess={() => setIsAddExpenseOpen(false)} />
        </Modal>
      )}
      <Modal
        isOpen={!!editingExpense || !!editingIncome}
        onClose={closeTransactionEditor}
        title="Edit Transaction"
      >
        <ExpenseForm
          editingExpense={editingExpense}
          editingIncome={editingIncome}
          onSuccess={closeTransactionEditor}
        />
      </Modal>
      {accountEntryAccount && (
        <AddAccountEntryModal
          isOpen={!!accountEntryAccount}
          onClose={() => setAccountEntryAccount(null)}
          account={accountEntryAccount}
        />
      )}

      <MonthDrawer />
      <CelebrationOverlay />

      {/* Global animated background */}
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-background via-background to-muted/40 pointer-events-none transition-colors" />

      <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-foreground transition-colors overflow-x-clip">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <Header />

        <div id="main-content" className="flex-1 w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
          <AnimatePresence>
            <Suspense fallback={<RouteFallback />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Navigate to={`/${settings.defaultView || 'dashboard'}`} replace />} />
                <Route path="/add" element={<AddExpense />} />
                <Route path="/ledger" element={<LedgerHub />} />
                <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
                <Route path="/investments/:investmentId" element={<InvestmentDetailPage />} />
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
            </Suspense>
          </AnimatePresence>
        </div>

        {settings.navigationStyle === 'bottom' ? <BottomNav /> : <MobileActionDock />}
      </div>
    </>
  );
}

export default function App() {
  const { theme } = useTheme();
  const darkToastThemes = new Set(["dark", "midnight", "midnight-olive", "cyberpunk", "deep-sea", "glass-3d"]);
  const toastTheme = darkToastThemes.has(theme) ? "dark" : "light";
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ModalProvider>
          <LedgerStateProvider>
            <CelebrationProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/payment/:slug" element={<PaymentRequestPage />} />
                  <Route path="/pay/:slug" element={<PaySlugRedirect />} />
                  <Route path="*" element={<AppContent />} />
                </Routes>
              </Suspense>
            </CelebrationProvider>
          </LedgerStateProvider>
        </ModalProvider>
      </SettingsProvider>
      <ToastContainer position="top-center" theme={toastTheme} autoClose={2000} hideProgressBar newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </BrowserRouter>
  );
}
