import type { FoodItem } from "../types/nutrition";

export async function fetchBarcodeData(barcode: string): Promise<Partial<FoodItem> | null> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      const p = data.product;
      const nutriments = p.nutriments || {};
      
      // Defaulting to 100g/ml if specific serving size is missing
      const servingSize = p.serving_size || "100g/ml";
      const name = p.product_name || "Unknown Product";
      const brand = p.brands ? ` (${p.brands})` : "";

      return {
        name: `${name}${brand}`,
        quantity: servingSize,
        nutrients: {
          calories: nutriments["energy-kcal_100g"] || nutriments["energy-kcal"] || 0,
          protein: nutriments.proteins_100g || nutriments.proteins || 0,
          carbs: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
          fat: nutriments.fat_100g || nutriments.fat || 0,
          fiber: nutriments.fiber_100g || nutriments.fiber || 0,
        }
      };
    }
    return null;
  } catch (error) {
    console.error("OpenFoodFacts Error:", error);
    return null;
  }
}
