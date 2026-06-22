import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Calendar, Tag, CreditCard, ChevronRight, CheckCircle2, Mic, MicOff, Trash2, Save } from "lucide-react";
import { parseMagicEntry, parseMagicBatch, type ParsedExpense } from "../utils/magicParser";
import useOnline from "../hooks/useOnline";
import { parseNaturalLanguageEntry, askFinancialAdvisor, type ChatMessage } from "../services/aiService";
import { addDoc, collection, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-toastify";
import { cn } from "../lib/utils";
import { useCategorizationRules } from "../hooks/useCategorizationRules";
import { shouldSuggestSplit } from "../utils/proactiveSplits";
import { SplitSuggestionToast } from "./SplitSuggestionToast";

import { useExpenses } from "../hooks/useExpenses";
import { useCategoryBudgets } from "../hooks/useCategoryBudgets";
import { useFinancialGoals } from "../hooks/useFinancialGoals";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useAccounts } from "../hooks/useAccounts";
import { useTrips } from "../hooks/useTrips";
import { todayDateKey } from "../utils/dates";
import { COLORS } from "../utils/chartColors";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface MagicChatEntryProps {
  onSuccess?: () => void;
  defaultMode?: "record" | "advisor";
  hideModeSwitcher?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: "text-orange-500 bg-orange-500/10 border-orange-500/20",
  Travel: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  Shopping: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  Utilities: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  Entertainment: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  Health: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  Education: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  Other: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

interface ParsedContent {
  type: "text" | "chart";
  content: string;
  chartData?: {
    type: "bar" | "pie" | "line";
    title: string;
    data: { label: string; value: number }[];
  };
}

const quickSuggestions = [
  {
    tag: "Breakdown",
    label: "Show monthly category spending",
    query: "Show me a breakdown of my category spending for this month with a chart."
  },
  {
    tag: "Goals",
    label: "Check savings goals progress",
    query: "Am I on track to meet my savings goals? Give me a quick status update."
  },
  {
    tag: "Specifics",
    label: "How much spent on Food?",
    query: "How much did I spend on Food (or merchants like Swiggy) last week?"
  },
  {
    tag: "Advice",
    label: "Get budgeting recommendations",
    query: "Give me budget advice and cost-cutting recommendations based on my spending trends."
  }
];

export function parseAdvisorResponse(text: string): ParsedContent[] {
  const parts: ParsedContent[] = [];
  const chartRegex = /<chart\s+type="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/chart>/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = chartRegex.exec(text)) !== null) {
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      parts.push({ type: "text", content: textBefore });
    }
    
    const chartType = match[1] as "bar" | "pie" | "line";
    const title = match[2];
    const rawJson = match[3];
    
    try {
      const data = JSON.parse(rawJson.trim());
      parts.push({
        type: "chart",
        content: match[0],
        chartData: {
          type: chartType,
          title,
          data,
        },
      });
    } catch (e) {
      console.error("Failed to parse chart JSON:", e);
      parts.push({ type: "text", content: match[0] });
    }
    
    lastIndex = chartRegex.lastIndex;
  }
  
  const textAfter = text.substring(lastIndex);
  if (textAfter.trim() || parts.length === 0) {
    parts.push({ type: "text", content: textAfter });
  }
  
  return parts;
}

function parseBoldText(text: string) {
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <strong key={index} className="font-extrabold text-slate-900 dark:text-white">
          {part}
        </strong>
      );
    }
    return part;
  });
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  
  return (
    <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="text-xs font-black text-slate-900 dark:text-white mt-3 mb-1 uppercase tracking-wider">
              {trimmed.replace("### ", "")}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={idx} className="text-sm font-black text-slate-900 dark:text-white mt-4 mb-2 uppercase tracking-wide">
              {trimmed.replace("## ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={idx} className="text-base font-black text-slate-900 dark:text-white mt-4 mb-2">
              {trimmed.replace("# ", "")}
            </h2>
          );
        }
        
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span className="text-blue-500">•</span>
              <span>{parseBoldText(content)}</span>
            </div>
          );
        }
        
        if (trimmed === "") {
          return <div key={idx} className="h-2" />;
        }
        
        return <p key={idx}>{parseBoldText(line)}</p>;
      })}
    </div>
  );
}

function AdvisorChart({ chartData }: { chartData: { type: "bar" | "pie" | "line"; title: string; data: any[] } }) {
  const { type, title, data } = chartData;
  
  return (
    <div className="my-4 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-sm">
      <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-1">
        {title}
      </h5>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: 12,
                  border: "none",
                  color: "#fff",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
              <ChartTooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: 12,
                  border: "none",
                  color: "#fff",
                  fontSize: 11,
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} activeDot={{ r: 5 }} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  borderRadius: 12,
                  border: "none",
                  color: "#fff",
                  fontSize: 11,
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function MagicChatEntry({ onSuccess, defaultMode, hideModeSwitcher }: MagicChatEntryProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { rules } = useCategorizationRules();
  const { isOnline } = useOnline();
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [batchResults, setBatchResults] = useState<ParsedExpense[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isAiParsing, setIsAiParsing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Magic Advisor States
  const [mode, setMode] = useState<"record" | "advisor">(defaultMode || "record");
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("magic_advisor_chat");
    if (saved) {
      try {
        const parsedMsgs = JSON.parse(saved);
        return parsedMsgs.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [isThinking, setIsThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Financial Data Hooks
  const { expenses } = useExpenses();
  const { budgets } = useCategoryBudgets();
  const { goals } = useFinancialGoals();
  const { subscriptions } = useSubscriptions();
  const { accounts } = useAccounts();
  const { trips } = useTrips();

  // Scroll to bottom whenever messages or thinking state changes
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Compile Financial Context (Optimized for token boundaries and Free Tier limits)
  const compileFinancialContext = () => {
    const today = todayDateKey();
    const currentMonth = today.slice(0, 7);

    // Limit individual expenses to last 30 days and cap at 30 items to minimize context tokens
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const recentExpenses = expenses
      .filter((e) => e.date >= cutoffStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
      .map((e) => ({
        d: e.date,
        a: e.amount,
        c: e.category,
        n: e.note || "",
      }));

    // Limit monthly aggregates to the last 4 months
    const sortedMonths = Array.from(new Set(expenses.map((e) => e.month)))
      .sort()
      .reverse()
      .slice(0, 4);

    const monthlyAggregates: Record<string, Record<string, number>> = {};
    expenses.forEach((e) => {
      if (sortedMonths.includes(e.month)) {
        const m = e.month;
        if (!monthlyAggregates[m]) monthlyAggregates[m] = {};
        if (!monthlyAggregates[m][e.category]) monthlyAggregates[m][e.category] = 0;
        monthlyAggregates[m][e.category] += e.amount;
      }
    });

    const activeBudgets = budgets
      .filter((b) => b.month === currentMonth)
      .map((b) => {
        const spent = expenses
          .filter((e) => e.month === currentMonth && e.category === b.category)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          category: b.category,
          budget: b.amount,
          spent,
        };
      });

    const activeGoals = goals.map((g) => ({
      name: g.name,
      target: g.targetAmount,
      current: g.currentAmount,
      deadline: g.deadline || "None",
    }));

    const activeSubs = subscriptions
      .filter((s) => s.isActive)
      .map((s) => ({
        name: s.name,
        amount: s.amount,
        category: s.category || "Subscriptions",
        type: s.type,
      }));

    const activeAccounts = accounts.map((a) => ({
      name: a.name,
      creditLimit: a.creditLimit || null,
      openingBalance: a.openingBalance || 0,
    }));

    const activeTrips = trips
      .filter((t) => t.status === "active")
      .map((t) => ({
        destination: t.destination,
        tripName: t.tripName || t.destination,
        totalBudget: t.totalBudget,
        spentAmount: t.spentAmount,
        startDate: t.startDate,
        endDate: t.endDate,
      }));

    return {
      today,
      expenses: recentExpenses,
      budgets: activeBudgets,
      goals: activeGoals,
      subscriptions: activeSubs,
      accounts: activeAccounts,
      trips: activeTrips,
      monthlyAggregates,
    };
  };

  // Check speech support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");
        setInput(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
        toast.error("Speech recognition failed");
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = () => {
    if (!isSpeechSupported) return;
    
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      inputRef.current?.focus();
      recognitionRef.current?.start();
      setIsRecording(true);
      toast.info("Listening...", { autoClose: 2000, icon: <Mic className="text-blue-500 animate-pulse" /> });
    }
  };

  useEffect(() => {
    let active = true;
    let timerId: any = null;

    if (mode === "record" && input.trim().length > 2) {
      // Check if it's multiple lines
      if (input.includes("\n")) {
        const batch = parseMagicBatch(input);
        setBatchResults(batch);
        setParsed(null);
      } else {
        const result = parseMagicEntry(input);
        
        // Secondary category matching with user rules
        const normalizedInput = input.toLowerCase();
        const match = rules.find((rule) => normalizedInput.includes(rule.keyword.toLowerCase()));
        if (match) {
          result.category = match.category;
        }
        
        setParsed(result);
        setBatchResults([]);

        // Debounce AI Refinement if online and local parsing is not fully confident
        const isConfident = !!(result.amount && result.category !== "Other" && result.date === todayDateKey());
        
        if (isOnline && !isConfident) {
          setIsAiParsing(true);
          timerId = setTimeout(async () => {
            try {
              const aiResult = await parseNaturalLanguageEntry(input);
              if (active) {
                setParsed(aiResult);
              }
            } catch (error) {
              console.error("AI parsing failed, keeping rule-based results:", error);
            } finally {
              if (active) {
                setIsAiParsing(false);
              }
            }
          }, 1200); // 1.2s debounce to cushion typing speed and conserve free-tier limits
        } else {
          setIsAiParsing(false);
        }
      }
    } else {
      setParsed(null);
      setBatchResults([]);
      setIsAiParsing(false);
    }

    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [input, rules, isOnline, mode]);

  const handleAdvisorSubmit = async (queryText: string) => {
    if (!user || !queryText.trim()) return;

    setInput("");
    const userQuery = queryText.trim();
    const newUserMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: userQuery,
      timestamp: new Date()
    };

    setMessages((prev) => {
      const updated = [...prev, newUserMessage];
      localStorage.setItem("magic_advisor_chat", JSON.stringify(updated));
      return updated;
    });
    setIsThinking(true);

    try {
      const context = compileFinancialContext();
      const historyFormatted: ChatMessage[] = [...messages, newUserMessage].map((m) => ({
        role: m.role,
        parts: m.text,
      }));

      const response = await askFinancialAdvisor(userQuery, context, historyFormatted);

      const newModelMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: response,
        timestamp: new Date()
      };

      setMessages((prev) => {
        const updated = [...prev, newModelMessage];
        localStorage.setItem("magic_advisor_chat", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to query advisor");
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuickSelect = (queryText: string) => {
    handleAdvisorSubmit(queryText);
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("magic_advisor_chat");
    toast.success("Chat history cleared");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    // Handle Advisor Submit
    if (mode === "advisor") {
      return handleAdvisorSubmit(input);
    }

    // Handle Batch Submit
    if (batchResults.length > 0) {
      return handleBatchSubmit();
    }

    if (!parsed || !parsed.amount) return;
    const amount = parsed.amount;

    setIsSubmitting(true);
    try {
      const month = parsed.date.slice(0, 7);
      await addDoc(collection(db, "users", user.uid, "expenses"), {
        amount: parsed.amount,
        date: parsed.date,
        category: parsed.category,
        note: parsed.note,
        month,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
      });

      toast.success(`Saved: ₹${amount} in ${parsed.category}`, {
        icon: <CheckCircle2 className="text-emerald-500" />
      });

      // Proactive split suggestion
      if (shouldSuggestSplit(amount, parsed.note)) {
        toast.info(
          ({ closeToast }) => (
            <SplitSuggestionToast 
              amount={amount} 
              note={parsed.note} 
              category={parsed.category}
              onSplit={(data) => navigate("/split", { state: { tab: "management", ...data } })}
              closeToast={closeToast}
            />
          ),
          { 
            autoClose: 10000,
            icon: false,
            className: "p-0 overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900 shadow-xl"
          }
        );
      }

      setInput("");
      setParsed(null);
      setBatchResults([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add magic expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (!user || batchResults.length === 0) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      const userExpensesRef = collection(db, "users", user.uid, "expenses");
      const timestamp = serverTimestamp();
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      batchResults.forEach((item) => {
        const newDocRef = doc(userExpensesRef);
        batch.set(newDocRef, {
          amount: item.amount,
          date: item.date,
          category: item.category,
          note: item.note,
          month: item.date.slice(0, 7),
          time,
          createdAt: timestamp,
        });
      });

      await batch.commit();
      
      toast.success(`Successfully saved ${batchResults.length} items!`, {
        icon: <Sparkles className="text-blue-500" />
      });

      setInput("");
      setBatchResults([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save batch expenses");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 group">
      <motion.div 
        initial={false}
        animate={{ 
          scale: isFocused ? 1.02 : 1,
          y: isFocused ? -6 : 0
        }}
        className="relative"
      >
        {/* Google-style Multi-layered Glow (Aurora) - Persistent */}
        <div className="absolute inset-0 -z-20 overflow-visible">
          {/* Main Glow Aura */}
          <div className={cn(
            "absolute -inset-10 blur-[80px] rounded-full transition-opacity duration-1000",
            isFocused ? "opacity-60" : "opacity-30"
          )}>
            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-blue-500/30 animate-[aura-float_10s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 right-1/4 w-1/2 h-full bg-purple-500/30 animate-[aura-float_12s_ease-in-out_infinite_reverse]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-cyan-400/20 animate-[aura-float_8s_ease-in-out_infinite_offset]" />
          </div>
          
          {/* Focused Highlight blobs */}
          <motion.div
            animate={{ 
              opacity: isFocused ? 1 : 0.5,
              scale: isFocused ? 1 : 0.9 
            }}
            className="absolute -inset-4 blur-3xl rounded-[3rem] bg-gradient-to-r from-blue-600/10 via-indigo-500/10 to-purple-600/10 -z-10"
          />
        </div>

        {/* Moving Conic Border (Google AI Style) - Persistent */}
        <div className={cn(
          "absolute -inset-[2px] rounded-[2rem] overflow-hidden transition-opacity duration-500",
          isFocused ? "opacity-100" : "opacity-60"
        )}>
          <div className="absolute inset-[-200%] bg-[conic-gradient(from_0deg,transparent_0%,#3b82f6_25%,#8b5cf6_50%,#06b6d4_75%,transparent_100%)] animate-[glow-rotate_4s_linear_infinite]" />
        </div>
        
        <form 
          onSubmit={handleSubmit}
          className={cn(
            "relative bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-slate-800/80 rounded-[1.8rem] shadow-[0_20px_70px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-500",
            isFocused ? "shadow-blue-500/20" : ""
          )}
        >
          {/* Top Switch Header */}
          {!hideModeSwitcher ? (
            <div className="flex border-b border-slate-100 dark:border-slate-850 px-4 py-3 justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("record")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                    mode === "record"
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                >
                  <CreditCard size={12} />
                  <span>Record Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("advisor")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                    mode === "advisor"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  )}
                >
                  <Sparkles size={12} className={cn(mode === "advisor" && "animate-[sparkle-pulse_2s_infinite]")} />
                  <span>Ask Advisor</span>
                </button>
              </div>
              {mode === "advisor" && messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Clear Chat</span>
                </button>
              )}
            </div>
          ) : (
            messages.length > 0 && (
              <div className="flex justify-end border-b border-slate-100 dark:border-slate-850 px-4 py-2 bg-slate-50/50 dark:bg-slate-950/20">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Clear Chat</span>
                </button>
              </div>
            )
          )}

          {/* Chat Messages Container */}
          {mode === "advisor" && (
            <div 
              ref={chatScrollRef}
              className="max-h-[350px] overflow-y-auto px-4 py-4 space-y-4 border-b border-slate-100 dark:border-slate-800/60 scrollbar-none"
            >
              {messages.length === 0 ? (
                <div className="py-6 px-2 text-center flex flex-col items-center justify-center">
                  <div className="relative w-12 h-12 mb-4 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur-md opacity-30 animate-pulse" />
                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <Sparkles size={20} className="animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                    Financial Magic Advisor
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 max-w-sm mb-5">
                    Ask me about your spending trends, goal trajectories, active budgets, or specific merchants.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                    {quickSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickSelect(item.query)}
                        className="p-3 text-left rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-950/40 dark:hover:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 text-slate-650 dark:text-slate-350 transition-all hover:scale-[1.01] active:scale-[0.99] group flex flex-col justify-between"
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-550 dark:text-blue-400 mb-1">
                          {item.tag}
                        </span>
                        <span className="text-xs font-bold leading-snug text-slate-850 dark:text-slate-200 group-hover:text-blue-650 dark:group-hover:text-blue-405">
                          "{item.label}"
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => (
                    <div 
                      key={m.id} 
                      className={cn(
                        "flex flex-col max-w-[85%] rounded-[1.3rem]",
                        m.role === "user" 
                          ? "ml-auto bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-100 p-3.5 rounded-tr-none" 
                          : "bg-blue-50/20 dark:bg-slate-950/40 border border-blue-100/10 dark:border-slate-800/20 p-4 rounded-tl-none"
                      )}
                    >
                      {m.role === "user" ? (
                        <p className="text-sm font-bold leading-relaxed">{m.text}</p>
                      ) : (
                        <div className="space-y-2">
                          {parseAdvisorResponse(m.text).map((part, index) => (
                            <React.Fragment key={index}>
                              {part.type === "text" ? (
                                <FormattedText text={part.content} />
                              ) : part.chartData ? (
                                <AdvisorChart chartData={part.chartData} />
                              ) : null}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                      <span className={cn(
                        "text-[9px] font-semibold mt-1.5 uppercase tracking-wider opacity-60 text-right",
                        m.role === "user" ? "text-slate-500" : "text-slate-400"
                      )}>
                        {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {isThinking && (
                <div className="flex items-center gap-2 p-3.5 rounded-2xl rounded-tl-none bg-blue-50/20 dark:bg-slate-950/40 border border-blue-100/10 dark:border-slate-800/20 w-max animate-pulse">
                  <Sparkles size={14} className="text-blue-500 animate-spin" />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Advisor is thinking...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Text Area and Action Bar */}
          <div className="p-2.5 flex items-center gap-3">
            <div className="relative pl-4 group/icon">
              <motion.div
                animate={{
                  scale: isFocused ? [1, 1.2, 1] : [1, 1.1, 1],
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className={cn(
                  "transition-all duration-500",
                  (parsed?.amount || mode === "advisor") ? "text-blue-500" : "text-slate-400 dark:text-slate-600"
                )}
              >
                <div className={cn(
                  "absolute inset-0 blur-md bg-blue-500/40 rounded-full transition-opacity duration-500",
                  (parsed?.amount || mode === "advisor") || isFocused ? "opacity-100 animate-[sparkle-pulse_2s_infinite]" : "opacity-40"
                )} />
                <Sparkles size={24} className={cn("relative z-10", isAiParsing && "animate-spin text-indigo-500")} />
              </motion.div>
            </div>
            
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                mode === "advisor" 
                  ? "Ask Advisor: 'How much did I spend on Swiggy last week?'..." 
                  : "Record: 'Rs 500 for Starbucks today'..."
              }
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none py-4 text-slate-800 dark:text-slate-100 font-semibold text-lg placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-medium resize-none overflow-hidden min-h-[56px] flex items-center"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !input.includes('\n')) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              disabled={isSubmitting}
            />

            <div className="flex items-center gap-1.5 mr-1">
              {isSpeechSupported && !input && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={toggleRecording}
                  className={cn(
                    "p-3 rounded-2xl transition-all",
                    isRecording 
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/40" 
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-500"
                  )}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </motion.button>
              )}

              <AnimatePresence mode="wait">
                {((mode === "record" && (parsed?.amount || batchResults.length > 0)) || (mode === "advisor" && input.trim().length > 0)) && (
                  <motion.button
                    key="submit"
                    initial={{ scale: 0, opacity: 0, x: 20 }}
                    animate={{ scale: 1, opacity: 1, x: 0 }}
                    exit={{ scale: 0, opacity: 0, x: 20 }}
                    whileHover={{ scale: 1.1, rotate: draftMode ? 0 : 5 }}
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/40 group/btn"
                  >
                    {isSubmitting ? (
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      (mode === "record" && batchResults.length > 0) ? <Save size={20} /> : <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {mode === "record" && batchResults.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Batch Preview ({batchResults.length})</h4>
                    <button 
                      type="button"
                      onClick={() => { setInput(""); setBatchResults([]); }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {batchResults.map((item, idx) => (
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                            CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other
                          )}>
                            {item.category[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.note}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900 dark:text-white">₹{item.amount?.toLocaleString()}</div>
                          <div className="text-[9px] font-bold text-emerald-500">{new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchSubmit}
                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 group"
                  >
                    <span>Save All {batchResults.length} Expenses</span>
                    <Sparkles size={14} className="group-hover:animate-spin" />
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "record" && parsed && !batchResults.length && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
              >
                <div className="p-4 flex flex-wrap gap-2.5 items-center">
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all hover:border-blue-500/30">
                    <span className="text-blue-500 font-black">₹</span>
                    <span className="text-lg">{parsed.amount?.toLocaleString() || "?"}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm">
                    <Calendar size={14} className="text-emerald-500" />
                    {new Date(parsed.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 border rounded-xl text-sm font-bold shadow-sm transition-colors",
                    CATEGORY_COLORS[parsed.category] || CATEGORY_COLORS.Other
                  )}>
                    <Tag size={14} />
                    {parsed.category}
                  </div>

                  <div className={cn(
                    "ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all",
                    isAiParsing 
                      ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 animate-pulse"
                      : "bg-blue-50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10 text-blue-600 dark:text-blue-400"
                  )}>
                    <Sparkles size={12} className={cn(isAiParsing && "animate-spin")} />
                    <span>{isAiParsing ? "AI Refining..." : parsed.note}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
      
      {/* Footer Hints */}
      <AnimatePresence>
        {!isFocused && !parsed && mode === "record" && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest"
          >
            <div className="flex items-center gap-2 hover:text-blue-500 transition-colors cursor-default">
              <CreditCard size={12} />
              <span>₹1.5k for rent</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2 hover:text-emerald-500 transition-colors cursor-default">
              <Sparkles size={12} />
              <span>Pizza last Friday</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2 hover:text-purple-500 transition-colors cursor-default">
              <ChevronRight size={12} />
              <span>Netflix jan 12</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const draftMode = false;
