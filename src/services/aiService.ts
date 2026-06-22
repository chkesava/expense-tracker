import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseMagicEntry } from "../utils/magicParser";
import type { ParsedExpense } from "../utils/magicParser";
import { todayDateKey } from "../utils/dates";

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

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
      2. If date is missing, return today's date (${todayDateKey()}).
      3. Return ONLY the JSON object, no other text.
      4. Note field should be the Merchant Name.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    
    const parsed = JSON.parse(jsonStr);

    return {
      amount: parsed.amount,
      date: parsed.date || todayDateKey(),
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

/**
 * Parses raw natural language text into structured expense data using Gemini AI.
 * Falls back to magicParser if AI is unavailable or fails.
 */
export async function parseNaturalLanguageEntry(text: string): Promise<ParsedExpense> {
  if (!GEMINI_API_KEY) {
    return parseMagicEntry(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: "v1" });

    const prompt = `
      Extract the following fields from this natural language transaction entry and return ONLY a valid JSON object.
      Fields:
      - amount (number or null if not found)
      - note (string, the preserved descriptive name/merchant of what was bought or spent on, e.g. "Lunch with Mom", "Netflix subscription". Keep the details intact, do not strip important context.)
      - date (string, YYYY-MM-DD format)
      - category (string, choose from: Food, Rent, Travel, Shopping, Utilities, Entertainment, Health, Education, Other)

      User Input: "${text}"

      Rules:
      1. If amount is missing, return null for amount.
      2. If date is missing or relative (e.g. today, yesterday), compute the correct date. Today's date is ${todayDateKey()}.
      3. Return ONLY the JSON object, no other text.
      4. Make sure category is one of the valid categories listed above.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text().replace(/```json|```/g, "").trim();
    
    const parsed = JSON.parse(jsonStr);

    return {
      amount: parsed.amount,
      date: parsed.date || todayDateKey(),
      note: parsed.note || "No description",
      category: parsed.category || "Other",
      confidence: 0.95,
    };
  } catch (error) {
    console.error("AI NLP Parsing Error:", error);
    // Fallback to rule-based parsing
    return parseMagicEntry(text);
  }
}

export interface ChatMessage {
  role: "user" | "model";
  parts: string;
}

/**
 * Queries Gemini for natural language financial analysis and recommendations.
 */
export async function askFinancialAdvisor(
  question: string,
  contextData: {
    today: string;
    expenses: any[];
    budgets: any[];
    goals: any[];
    subscriptions: any[];
    accounts: any[];
    trips: any[];
    monthlyAggregates: Record<string, Record<string, number>>;
  },
  chatHistory: ChatMessage[]
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "AI Financial Advisor is currently offline. Please configure `VITE_GEMINI_API_KEY` in your environment.";
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const systemInstruction = `
You are "Magic Advisor", a premium conversational AI financial insights assistant for the user's expense tracker application.
Your goal is to help the user understand their finances, category spending, track budgets, savings goals, subscriptions, and active trips.

TODAY'S DATE: ${contextData.today}

USER FINANCIAL PROFILE & DATA:
---
ACCOUNTS:
${JSON.stringify(contextData.accounts)}

BUDGETS:
${JSON.stringify(contextData.budgets)}

GOALS:
${JSON.stringify(contextData.goals)}

SUBSCRIPTIONS:
${JSON.stringify(contextData.subscriptions)}

TRIPS:
${JSON.stringify(contextData.trips)}

RECENT INDIVIDUAL TRANSACTIONS (LAST 60 DAYS):
${JSON.stringify(contextData.expenses)}

MONTHLY SPENDING BY CATEGORY AGGREGATES:
${JSON.stringify(contextData.monthlyAggregates)}
---

DIRECTIONS & RULES:
1. Be a friendly, professional, and clear financial advisor.
2. Directly and precisely answer the user's query using the provided context. If they ask about a specific merchant (e.g., "Swiggy"), analyze the descriptions (notes) and dates in the RECENT INDIVIDUAL TRANSACTIONS.
3. Be proactive: if the user is close to exceeding a budget or missing a goal, alert them nicely.
4. When asked for spending breakdowns, comparisons, or trends, use interactive charts to wow the user.
   To output a chart, you MUST output a custom <chart> block in the exact XML-like format below:
   <chart type="bar|pie|line" title="Chart Title">
     [{"label": "Food", "value": 4500}, {"label": "Rent", "value": 15000}]
   </chart>
   The content inside the <chart> block must be a valid JSON array of objects, where each object has:
   - "label" (string): the label for that data point (e.g. category name, date, month, or week)
   - "value" (number): the numeric amount
   You can include multiple charts if relevant, but do not output charts if the user's request is a simple text question that doesn't benefit from visualization.
5. Use clean formatting with bold text, lists, and tables where appropriate.
6. Keep recommendations actionable and positive.
`;

    const model = genAI.getGenerativeModel(
      { model: "gemini-2.5-flash" },
      { apiVersion: "v1" }
    );

    const formattedHistory = [
      {
        role: "user",
        parts: [{ text: `SYSTEM INSTRUCTIONS & CONTEXT:\n${systemInstruction}\n\nPlease confirm you understand these instructions and context.` }]
      },
      {
        role: "model",
        parts: [{ text: "Understood. I am your Magic Advisor. I will act as a friendly, professional financial advisor, answer your queries using the provided financial context, and output charts in the requested XML format when appropriate." }]
      },
      ...chatHistory.map((h) => ({
        role: h.role,
        parts: [{ text: h.parts }],
      }))
    ];

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage(question);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm sorry, I encountered an error analyzing your finances. Please try again in a moment.";
  }
}

