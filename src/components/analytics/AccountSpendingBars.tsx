import type { Expense, Account } from "../../types/expense";
import { groupByAccount } from "../../utils/analytics";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export default function AccountSpendingBars({ 
  expenses, 
  accounts 
}: { 
  expenses: Expense[], 
  accounts: Account[] 
}) {
  if (!expenses.length) return null;

  const grouped = groupByAccount(expenses);
  const grandTotal = grouped.reduce((sum, g) => sum + g.value, 0);

  // Map to names and sort
  const sorted = grouped
    .map(g => {
      const account = accounts.find(a => a.id === g.accountId);
      return {
        name: account?.name || (g.accountId === "unknown" ? "No Account" : "Unknown"),
        amount: g.value,
        id: g.accountId
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-4">
      {sorted.map((item, index) => {
        const percent = grandTotal === 0 ? 0 : Math.round((item.amount / grandTotal) * 100);
        
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group"
          >
            <div className="flex justify-between text-sm font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {item.name}
              </span>
              <span className="text-slate-500 dark:text-slate-400">{percent}%</span>
            </div>

            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="h-full rounded-full shadow-sm bg-emerald-500/80"
              />
            </div>
            <div className="mt-1 text-xs text-slate-400 font-medium text-right opacity-0 group-hover:opacity-100 transition-opacity">
              ₹{item.amount.toLocaleString()}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
