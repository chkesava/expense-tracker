import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseMagicEntry } from "../utils/magicParser";
import type { ParsedExpense } from "../utils/magicParser";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Parses raw OCR text into structured expense data using Gemini AI.
 * Falls back to magicParser if AI is unavailable or fails.
 */
export async function parseReceiptText(text: string): Promise<ParsedExpense> {
  if (!GEMINI_API_KEY) {
    console.warn("VITE_GEMINI_API_KEY not found. Falling back to rule-based parsing.");
    return parseMagicEntry(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Explicitly using v1 to avoid v1beta 404s and using the stable flash model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: "v1" });

    const prompt = `
      Extract the following fields from this receipt text and return ONLY a valid JSON object.
      Fields:
      - amount (number)
      - merchant (string, use this for the 'note' field)
      - date (string, YYYY-MM-DD format)
      - category (string, choose from: Food, Travel, Shopping, Utilities, Entertainment, Health, Education, Other)

      Receipt Text:
      """
      ${text}
      """

      Rules:
      1. If amount is missing, return null for amount.
      2. If date is missing, return today's date (${new Date().toISOString().slice(0, 10)}).
      3. Return ONLY the JSON object, no other text.
      4. Note field should be the Merchant Name.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    
    const parsed = JSON.parse(jsonStr);

    return {
      amount: parsed.amount,
      date: parsed.date || new Date().toISOString().slice(0, 10),
      note: parsed.merchant || "Receipt Scan",
      category: parsed.category || "Other",
      confidence: 0.9,
    };
  } catch (error) {
    console.error("AI Parsing Error:", error);
    // Fallback to rule-based parsing
    return parseMagicEntry(text);
  }
}
