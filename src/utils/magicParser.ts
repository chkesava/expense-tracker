import { CATEGORIES } from "../types/expense";

export interface ParsedExpense {
  amount: number | null;
  date: string;
  note: string;
  category: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, { keywords: string[], weight: number }> = {
  Food: { 
    keywords: ["pizza", "dinner", "lunch", "breakfast", "burger", "starbucks", "coffee", "restaurant", "swiggy", "zomato", "cafe", "food", "eat", "grocery", "groceries", "milk", "bread", "chicken", "meat", "veg", "delivery", "kfc", "mcdonalds", "dominos", "subway"], 
    weight: 1 
  },
  Travel: { 
    keywords: ["uber", "ola", "taxi", "cab", "auto", "flight", "train", "bus", "travel", "rickshaw", "metro", "petrol", "gas", "diesel", "fuel", "parking", "toll", "rapido", "indigo", "air", "ticket"], 
    weight: 1 
  },
  Shopping: { 
    keywords: ["amazon", "flipkart", "clothes", "shoes", "mall", "buying", "bought", "shopping", "myntra", "ajio", "zara", "h&m", "nike", "adidas", "puma", "electronics", "laptop", "mobile", "phone", "gadget"], 
    weight: 1 
  },
  Utilities: { 
    keywords: ["electricity", "water", "gas", "bill", "recharge", "mobile", "internet", "wifi", "jio", "airtel", "vi", "broadband", "rent", "maintenance", "cleaning", "maid"], 
    weight: 1 
  },
  Entertainment: { 
    keywords: ["movie", "netflix", "hotstar", "cinema", "show", "concert", "booking", "entertainment", "game", "gaming", "steam", "ps5", "xbox", "pub", "bar", "club", "drinks", "alcohol", "wine", "beer"], 
    weight: 1 
  },
  Health: { 
    keywords: ["medicine", "doctor", "hospital", "pharmacy", "gym", "health", "workout", "fitness", "supplement", "proteins", "checkup", "clinic", "therapy"], 
    weight: 1 
  },
  Education: { 
    keywords: ["book", "course", "tuition", "fees", "school", "college", "exam", "udemy", "coursera", "skill", "learning", "stationery"], 
    weight: 1 
  },
};

const STOP_WORDS = ["a", "an", "the", "is", "of", "for", "at", "on", "to", "with", "from", "paid", "gave", "spent", "buy", "bought"];

const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

export function parseMagicEntry(text: string): ParsedExpense {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // 1. Extract Amount
  let amount: number | null = null;
  // Patterns: "500", "5.5k", "5 grand", "rs 500", "500rs", "₹500", "500 bucks"
  const amountPatterns = [
    /(?:rs|₹|\$|bucks)?\s?(\d+(?:\.\d+)?)\s?(k|grand|bucks|rs|₹|\$)?/i,
    /(\d+(?:\.\d+)?)\s?(?:k|grand|bucks|rs|₹|\$)/i
  ];

  for (const pattern of amountPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      let val = parseFloat(match[1]);
      const suffix = (match[2] || "").toLowerCase();
      if (suffix === "k") val *= 1000;
      if (suffix === "grand") val *= 1000;
      
      // Heuristic: Prefer the largest number that isn't a four-digit year (like 2024)
      if (!amount || (val > amount && val < 1000000 && (val < 1900 || val > 2100))) {
        amount = val;
      }
    }
  }

  // 2. Extract Date
  let date = new Date();
  let dateFound = false;

  // Relative: "today", "yesterday", "last night"
  if (normalized.includes("yesterday") || normalized.includes("last night")) {
    date.setDate(date.getDate() - 1);
    dateFound = true;
  } else if (normalized.includes("day before")) {
    date.setDate(date.getDate() - 2);
    dateFound = true;
  }
  
  // Relative days: "3 days ago"
  const agoMatch = normalized.match(/(\d+)\s+days?\s+ago/);
  if (agoMatch) {
    date.setDate(date.getDate() - parseInt(agoMatch[1]));
    dateFound = true;
  }

  // Last [Day]: "last friday"
  const lastDayMatch = normalized.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)/);
  if (lastDayMatch) {
    const targetDay = DAY_MAP[lastDayMatch[1]];
    const currentDay = date.getDay();
    let diff = currentDay - targetDay;
    if (diff <= 0) diff += 7;
    date.setDate(date.getDate() - diff);
    dateFound = true;
  }

  // Specific Date: "jan 12", "12th oct"
  const specificDateMatch = normalized.match(/(?:on\s+)?(\d+)(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
  if (specificDateMatch) {
    const day = parseInt(specificDateMatch[1]);
    const month = MONTH_MAP[specificDateMatch[2]];
    date.setMonth(month);
    date.setDate(day);
    dateFound = true;
  }

  const formattedDate = date.toISOString().slice(0, 10);

  // 3. Infer Category (Weighted Scoring)
  let category = "Other";
  let maxScore = 0;
  
  for (const [cat, info] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of info.keywords) {
      if (normalized.includes(kw)) {
        // Higher weight for exact matches vs sub-string
        const wordMatch = new RegExp(`\\b${kw}\\b`).test(normalized);
        score += wordMatch ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      category = cat;
    }
  }

  // 4. Extract & Clean Note
  // Remove known date/amount fragments
  let noteParts = words.filter(word => {
    // Skip if it's purely part of the amount or currency symbols
    const amountStr = amount?.toString();
    if (amountStr && (word.includes(amountStr) || ["k", "grand", "bucks", "rs", "₹", "$"].includes(word.toLowerCase()))) return false;
    // Skip common date words if date was found
    if (dateFound && ["today", "yesterday", "last", "night", "ago", "days", "day", ...Object.keys(DAY_MAP), ...Object.keys(MONTH_MAP)].includes(word.toLowerCase())) return false;
    // Skip stop words
    if (STOP_WORDS.includes(word.toLowerCase())) return false;
    return true;
  });

  let note = noteParts.join(" ").trim();
  
  // Final cleanup: remove trailing/leading punctuation
  note = note.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
  if (note) {
    note = note.charAt(0).toUpperCase() + note.slice(1);
  }

  return {
    amount,
    date: formattedDate,
    note: note || "No description",
    category,
    confidence: maxScore > 0 ? Math.min(maxScore / 5, 1) : 0.5
  };
}

export function parseMagicBatch(text: string): ParsedExpense[] {
  // Split by newlines or "and" if it seems to separate items
  // First, try newlines as the primary separator
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  const results: ParsedExpense[] = [];
  
  for (const line of lines) {
    const parsed = parseMagicEntry(line);
    // Only include if we found a valid amount, as that's the core of an expense
    if (parsed.amount !== null) {
      results.push(parsed);
    }
  }

  // Fallback: If no expenses found via newlines, try splitting by " and " 
  // but only if the text is relatively short (preventing false positives in long notes)
  if (results.length === 0 && text.toLowerCase().includes(" and ") && text.length < 200) {
    const parts = text.split(/\s+and\s+/i);
    for (const part of parts) {
      const parsed = parseMagicEntry(part);
      if (parsed.amount !== null) {
        results.push(parsed);
      }
    }
  }

  return results;
}
