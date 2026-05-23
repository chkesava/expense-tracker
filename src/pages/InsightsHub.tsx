import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Search, CalendarDays } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import AnalyticsPage from "./AnalyticsPage";
import AnalysisLab from "./AnalysisLab";
import YearlyAnalytics from "./YearlyAnalytics";
import PageShell from "../components/layout/PageShell";

type InsightsTab = "analytics" | "yearly" | "search";

export default function InsightsHub() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<InsightsTab>(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") as InsightsTab;
    if (tab && ["analytics", "yearly", "search"].includes(tab)) return tab;
    return "analytics";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("tab", activeTab);
    navigate({ search: params.toString() }, { replace: true });
  }, [activeTab, navigate, location.search]);

  const tabs = [
    { id: "analytics", label: "Performance", icon: <BarChart3 size={16} /> },
    { id: "yearly",    label: "Yearly",      icon: <CalendarDays size={16} /> },
    { id: "search",    label: "Discovery",   icon: <Search size={16} /> },
  ];

  return (
    <PageShell width="standard">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          title="Insights Hub"
          subtitle="Advanced financial analytics and discovery."
          icon={<BarChart3 size={24} />}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as InsightsTab)}
          tabAriaLabel="Insights sections"
          tabLayoutId="insights-tab-pill"
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
            {activeTab === "analytics" && <AnalyticsPage hideHeader />}
            {activeTab === "yearly" && <YearlyAnalytics />}
            {activeTab === "search" && <AnalysisLab hideHeader />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </PageShell>
  );
}
