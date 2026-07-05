import { Routes, Route, Navigate } from "react-router-dom";
import AuraBackground from "../../components/layout/AuraBackground";
import NutritionHeader from "../../components/nutrition/NutritionHeader";
import NutritionBottomNav from "../../components/nutrition/NutritionBottomNav";
import NutritionProfilePage from "./NutritionProfilePage";
import NutritionDashboard from "./NutritionDashboard";
import NutritionMealPage from "./NutritionMealPage";
import BodyTrackingPage from "./BodyTrackingPage";
import NutritionAnalyticsPage from "./NutritionAnalyticsPage";
import { useNutritionProfile } from "../../hooks/useNutritionProfile";

export default function NutritionApp() {
  const { profile, loading } = useNutritionProfile();

  if (loading) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <AuraBackground />
      <div className="fixed inset-0 z-[-1] bg-gradient-to-br from-background via-background to-muted/40 pointer-events-none transition-colors" />

      <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-foreground transition-colors overflow-x-clip">
        <NutritionHeader />
        
        <div id="main-content" className="flex-1 w-full pt-[calc(4rem+2rem)] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 flex flex-col px-4">
          <Routes>
            <Route path="/" element={
              profile ? (
                <NutritionDashboard />
              ) : (
                <Navigate to="/profile" replace />
              )
            } />
            <Route path="/profile" element={<NutritionProfilePage />} />
            <Route path="/body" element={<BodyTrackingPage />} />
            <Route path="/analytics" element={<NutritionAnalyticsPage />} />
            <Route path="/meal/:dateStr/:mealId" element={<NutritionMealPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <NutritionBottomNav />
      </div>
    </>
  );
}
