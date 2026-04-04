import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth";
import { useAccounts } from "../hooks/useAccounts";
import { useExpenses } from "../hooks/useExpenses";
import { useCategorizationRules } from "../hooks/useCategorizationRules";

type ParsedRow = {
  amount: number;
  date: string;
  category: string;
  note: string;
  accountId?: string;
  month: string;
};

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export default function ImportPage() {
  const { user } = useAuth();
  const expenses = useExpenses();
  const { accounts } = useAccounts();
  const { rules } = useCategorizationRules();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const existingKeys = useMemo(() => new Set(expenses.map((expense) => `${expense.date}|${expense.amount}|${expense.category}|${expense.note ?? ""}`)), [expenses]);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      toast.error("CSV needs a header row and at least one expense row");
      return;
    }

    const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
    const amountIndex = headers.findIndex((item) => item === "amount");
    const dateIndex = headers.findIndex((item) => item === "date");
    const categoryIndex = headers.findIndex((item) => item === "category");
    const noteIndex = headers.findIndex((item) => item === "note");
    const accountIndex = headers.findIndex((item) => item === "account");

    if (amountIndex < 0 || dateIndex < 0) {
      toast.error("CSV must include amount and date columns");
      return;
    }

    const parsed = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const note = noteIndex >= 0 ? values[noteIndex] ?? "" : "";
      const explicitCategory = categoryIndex >= 0 ? values[categoryIndex] ?? "" : "";
      const matchedRule = !explicitCategory
        ? rules.find((rule) => note.toLowerCase().includes(rule.keyword.toLowerCase()))
        : undefined;
      const category = explicitCategory || matchedRule?.category || "Other";
      const accountName = accountIndex >= 0 ? values[accountIndex] ?? "" : "";
      const accountId = accounts.find((account) => account.name.toLowerCase() === accountName.toLowerCase())?.id;
      const date = values[dateIndex];

      return {
        amount: Number(values[amountIndex]),
        date,
        category,
        note,
        accountId,
        month: date.slice(0, 7),
      };
    }).filter((row) => row.amount > 0 && row.date);

    setRows(parsed);
    toast.success(`Loaded ${parsed.length} rows`);
  };

  const importRows = async () => {
    if (!user) return toast.error("Sign in to import");
    if (!rows.length) return toast.error("Load a CSV first");

    setIsImporting(true);
    try {
      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        const key = `${row.date}|${row.amount}|${row.category}|${row.note}`;
        if (existingKeys.has(key)) {
          skipped += 1;
          continue;
        }

        await addDoc(collection(db, "users", user.uid, "expenses"), {
          ...row,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          createdAt: serverTimestamp(),
        });
        imported += 1;
      }

      toast.success(`Imported ${imported} rows${skipped ? `, skipped ${skipped} duplicates` : ""}`);
      setRows([]);
    } catch (err) {
      console.error(err);
      toast.error("Failed to import CSV");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto pt-24 pb-24 px-4 min-h-screen space-y-6">
      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 transition-colors">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Import Expenses</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upload a CSV with `amount`, `date`, and optional `category`, `note`, `account` columns.</p>
        </div>

        <label className="block rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 text-center text-sm font-semibold text-blue-700 cursor-pointer hover:bg-blue-100/60 transition-colors">
          Choose CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />
        </label>

        <div className="rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-4 text-xs text-slate-500 dark:text-slate-400">
          Matching note rules are applied if a row has no category. Duplicate rows are skipped based on date, amount, category, and note.
        </div>
      </section>

      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Preview</h2>
          <button
            onClick={importRows}
            disabled={!rows.length || isImporting}
            className="min-h-11 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/10 transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {isImporting ? "Importing..." : `Import ${rows.length} rows`}
          </button>
        </div>

        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1 scrollbar-thin">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm italic text-slate-400">No CSV loaded yet.</p>
          ) : (
            rows.map((row, index) => (
               <div key={`${row.date}-${row.amount}-${index}`} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 transition-colors">
                 <div className="flex items-center justify-between gap-3">
                   <div>
                     <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{row.category}</div>
                     <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.note || "No note"}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-sm font-bold text-slate-900 dark:text-slate-100">₹{row.amount.toLocaleString()}</div>
                     <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{row.date}</div>
                   </div>
                 </div>
               </div>
            ))
          )}
        </div>
      </section>
    </motion.main>
  );
}
