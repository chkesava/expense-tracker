import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ExpenseListPage from "./ExpenseListPage";
import SplitPage from "./SplitPage";
import SubscriptionsPage from "./SubscriptionsPage";
import TripsPage from "./TripsPage";
import CardsPage from "./CardsPage";
import AccountsPage from "./AccountsPage";
import InvestmentsPage from "./InvestmentsPage";
import PaymentRequestsPage from "./PaymentRequestsPage";
import { Wallet, Users, RefreshCw, Plane, CreditCard, Landmark, QrCode, TrendingUp } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import PageShell from "../components/layout/PageShell";

type LedgerTab = "expenses" | "splits" | "subscriptions" | "travel" | "cards" | "accounts" | "investments" | "collect";

export default function LedgerHub() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(location.search);
  const tabFromUrl = searchParams.get("tab");
  const activeTab = (tabFromUrl && ["expenses", "splits", "subscriptions", "travel", "cards", "accounts", "investments", "collect"].includes(tabFromUrl))
    ? (tabFromUrl as LedgerTab)
    : "expenses";

  const handleTabChange = (tabId: string) => {
    const params = new URLSearchParams(location.search);
    params.set("tab", tabId);
    navigate({ search: params.toString() }, { replace: true });
  };

  const tabs = [
    { id: "expenses", label: "Journal", icon: <Wallet size={16} /> },
    { id: "splits", label: "Splits", icon: <Users size={16} /> },
    { id: "subscriptions", label: "Recurring", icon: <RefreshCw size={16} /> },
    { id: "travel", label: "Travel", icon: <Plane size={16} /> },
    { id: "cards", label: "Cards", icon: <CreditCard size={16} /> },
    { id: "accounts", label: "Accounts", icon: <Landmark size={16} /> },
    { id: "investments", label: "Investments", icon: <TrendingUp size={16} /> },
    { id: "collect", label: "Collect", icon: <QrCode size={16} /> },
  ];

  return (
    <PageShell width="standard">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title="Ledger Hub"
          subtitle="Consolidated financial records and planning."
          icon={<Wallet size={24} />}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabAriaLabel="Ledger sections"
          tabLayoutId="ledger-tab-pill"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "expenses" && <ExpenseListPage hideHeader />}
            {activeTab === "splits" && <SplitPage hideHeader />}
            {activeTab === "subscriptions" && <SubscriptionsPage hideHeader />}
            {activeTab === "travel" && <TripsPage hideHeader />}
            {activeTab === "cards" && <CardsPage hideHeader />}
            {activeTab === "accounts" && <AccountsPage hideHeader />}
            {activeTab === "investments" && <InvestmentsPage hideHeader />}
            {activeTab === "collect" && <PaymentRequestsPage hideHeader />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageShell>
  );
}
