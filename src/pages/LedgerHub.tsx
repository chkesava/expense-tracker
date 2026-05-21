import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ExpenseListPage from "./ExpenseListPage";
import SplitPage from "./SplitPage";
import SubscriptionsPage from "./SubscriptionsPage";
import TripsPage from "./TripsPage";
import CardsPage from "./CardsPage";
import AccountsPage from "./AccountsPage";
import { Wallet, Users, RefreshCw, Plane, CreditCard, Landmark } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";

type LedgerTab = "expenses" | "splits" | "subscriptions" | "travel" | "cards" | "accounts";

export default function LedgerHub() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<LedgerTab>(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") as LedgerTab;
    if (tab && ["expenses", "splits", "subscriptions", "travel", "cards", "accounts"].includes(tab)) return tab;
    return "expenses";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("tab", activeTab);
    navigate({ search: params.toString() }, { replace: true });
  }, [activeTab, navigate, location.search]);

  const tabs = [
    { id: "expenses", label: "Journal", icon: <Wallet size={16} /> },
    { id: "splits", label: "Splits", icon: <Users size={16} /> },
    { id: "subscriptions", label: "Recurring", icon: <RefreshCw size={16} /> },
    { id: "travel", label: "Travel", icon: <Plane size={16} /> },
    { id: "cards", label: "Cards", icon: <CreditCard size={16} /> },
    { id: "accounts", label: "Accounts", icon: <Landmark size={16} /> },
  ];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 pb-32 pt-24 md:px-6"
    >
      <PageHeader 
        title="Ledger Hub" 
        subtitle="Consolidated financial records and planning."
        icon={<Wallet size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as LedgerTab)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
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
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
