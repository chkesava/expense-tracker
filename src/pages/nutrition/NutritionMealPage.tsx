import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDailyLog } from "../../hooks/useDailyLog";
import { analyzeNutrition } from "../../services/aiService";
import { fetchBarcodeData } from "../../services/openFoodFactsService";
import BarcodeScanner from "../../components/nutrition/BarcodeScanner";
import { ArrowLeft, Sparkles, Check, Trash2, ScanBarcode, X } from "lucide-react";
import { toast } from "../../lib/toast";
import type { FoodItem, Meal } from "../../types/nutrition";

export default function NutritionMealPage() {
  const { dateStr, mealId } = useParams<{ dateStr: string; mealId: string }>();
  const navigate = useNavigate();
  const { meals, loading, saveFoodsToMeal, removeFoodFromMeal } = useDailyLog(dateStr || "");

  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [parsedFoods, setParsedFoods] = useState<Partial<FoodItem>[]>([]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading meal...</div>;
  }

  const meal = meals.find((m: Meal) => m.id === mealId);

  if (!meal) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Meal not found.</p>
        <button onClick={() => navigate(-1)} className="text-emerald-500 hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    try {
      const data = await analyzeNutrition(inputText);
      if (data && data.foods && Array.isArray(data.foods)) {
        setParsedFoods(data.foods);
        setInputText(""); // Clear input on success
      } else {
        toast.error("AI couldn't understand that food.");
      }
    } catch (error) {
      toast.error("Failed to analyze food. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleScanSuccess = async (barcode: string) => {
    setIsScanning(false); // Close scanner on success
    setIsAnalyzing(true);
    try {
      const data = await fetchBarcodeData(barcode);
      if (data) {
        setParsedFoods(prev => [...prev, data]);
        toast.success(`Found: ${data.name}`);
      } else {
        toast.error("Product not found in OpenFoodFacts database.");
      }
    } catch (error) {
      toast.error("Failed to fetch product data.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveParsedFood = (index: number) => {
    setParsedFoods((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveToLog = async () => {
    if (parsedFoods.length === 0) return;

    try {
      await saveFoodsToMeal(mealId!, parsedFoods);
      setParsedFoods([]);
      toast.success("Added to your log!");
    } catch (error) {
      toast.error("Failed to save to log.");
    }
  };

  const handleDeleteLoggedFood = async (foodId: string) => {
    try {
      await removeFoodFromMeal(mealId!, foodId);
      toast.success("Food removed");
    } catch (error) {
      toast.error("Failed to remove food");
    }
  };

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto py-6 flex flex-col gap-6">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{meal.name}</h1>
          <p className="text-muted-foreground text-sm">Log what you ate</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-card border border-border rounded-3xl p-2 shadow-sm flex flex-col gap-2 relative focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g. 2 scrambled eggs, 1 slice of whole wheat toast, and a black coffee"
          className="w-full bg-transparent border-none resize-none p-4 min-h-[100px] text-foreground focus:outline-none"
        />
        <div className="flex justify-between items-center p-2 border-t border-border/50">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors font-medium text-sm"
          >
            {isScanning ? (
              <><X size={18} /> Cancel Scan</>
            ) : (
              <><ScanBarcode size={18} /> Scan Barcode</>
            )}
          </button>
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white px-5 py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20"
          >
            {isAnalyzing ? (
              <span className="animate-pulse">Thinking...</span>
            ) : (
              <>
                <Sparkles size={18} /> Parse with AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barcode Scanner UI */}
      {isScanning && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <BarcodeScanner 
            onScanSuccess={handleScanSuccess} 
            onScanFailure={() => {}} 
          />
        </div>
      )}

      {/* Review Parsed Foods Area */}
      {parsedFoods.length > 0 && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            Review Estimation <span className="text-xs font-normal bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">Not saved yet</span>
          </h3>
          <div className="flex flex-col gap-3">
            {parsedFoods.map((food, idx) => (
              <div key={idx} className="bg-card border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                     {/* We could make this an input to edit the name inline, but keeping it simple for now */}
                    <span className="font-medium text-foreground block truncate">{food.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{food.nutrients?.calories} kcal</span>
                    <button 
                      onClick={() => handleRemoveParsedFood(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium bg-muted/50 p-2 rounded-xl border border-border/50">
                  <div className="flex flex-col"><span className="text-muted-foreground">Protein</span><span className="text-blue-500 text-sm">{food.nutrients?.protein}g</span></div>
                  <div className="flex flex-col"><span className="text-muted-foreground">Carbs</span><span className="text-amber-500 text-sm">{food.nutrients?.carbs}g</span></div>
                  <div className="flex flex-col"><span className="text-muted-foreground">Fat</span><span className="text-red-500 text-sm">{food.nutrients?.fat}g</span></div>
                  <div className="flex flex-col"><span className="text-muted-foreground">Fiber</span><span className="text-purple-500 text-sm">{food.nutrients?.fiber || 0}g</span></div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveToLog}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all mt-2"
          >
            <Check size={24} /> Confirm & Save to Log
          </button>
        </div>
      )}

      {/* Already Logged Foods */}
      {meal.foods && meal.foods.length > 0 && parsedFoods.length === 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <h3 className="font-semibold text-foreground border-b border-border pb-2">Already Logged</h3>
          <div className="flex flex-col gap-3">
            {meal.foods.map((food: FoodItem, idx: number) => (
              <div key={idx} className="flex items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-sm group">
                <div className="flex-1">
                  <h4 className="font-medium">{food.name}</h4>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span className="text-blue-500/80">P: {food.nutrients.protein}g</span>
                    <span className="text-amber-500/80">C: {food.nutrients.carbs}g</span>
                    <span className="text-red-500/80">F: {food.nutrients.fat}g</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-emerald-600">{food.nutrients.calories} kcal</div>
                  <button
                    onClick={() => handleDeleteLoggedFood(food.id)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
