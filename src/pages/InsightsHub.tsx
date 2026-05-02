import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Search } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import AnalyticsPage from "./AnalyticsPage";
import AnalysisLab from "./AnalysisLab";

type InsightsTab = "analytics" | "search";

export default function InsightsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<InsightsTab>(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab") as InsightsTab;
    if (tab && ["analytics", "search"].includes(tab)) return tab;
    return "analytics";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    params.set("tab", activeTab);
    navigate({ search: params.toString() }, { replace: true });
  }, [activeTab, navigate, location.search]);

  const tabs = [
    { id: "analytics", label: "Performance", icon: <BarChart3 size={16} /> },
    { id: "search", label: "Discovery", icon: <Search size={16} /> },
  ];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl px-4 pb-32 pt-24 md:px-6"
    >
      <PageHeader 
        title="Insights Hub" 
        subtitle="Advanced financial analytics and discovery."
        icon={<BarChart3 size={24} />}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as InsightsTab)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "analytics" && <AnalyticsPage hideHeader />}
          {activeTab === "search" && <AnalysisLab hideHeader />}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}
