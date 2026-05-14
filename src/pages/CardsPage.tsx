import { useMemo } from "react";
import { motion } from "framer-motion";
import { CreditCard, CalendarDays, TrendingUp } from "lucide-react";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import Amount from "../components/common/Amount";

function getBillingCycleDates(billDay: number) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDate = today.getDate();

  let previousBillDate: Date;
  let nextBillDate: Date;

  if (currentDate >= billDay) {
    // We are past the bill generation day for this month
    previousBillDate = new Date(currentYear, currentMonth, billDay);
    nextBillDate = new Date(currentYear, currentMonth + 1, billDay);
  } else {
    // We haven't reached the bill generation day for this month yet
    previousBillDate = new Date(currentYear, currentMonth - 1, billDay);
    nextBillDate = new Date(currentYear, currentMonth, billDay);
  }

  return { previousBillDate, nextBillDate };
}

export default function CardsPage({ hideHeader }: { hideHeader?: boolean }) {
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();

  const creditCards = useMemo(() => {
    return accounts.filter((a) => {
      const typeName = accountTypes.find((t) => t.id === a.typeId)?.name || "";
      return typeName.toLowerCase().includes("credit") && a.billGenerationDay;
    });
  }, [accounts, accountTypes]);

  const cardsData = useMemo(() => {
    return creditCards.map((card) => {
      const { previousBillDate, nextBillDate } = getBillingCycleDates(card.billGenerationDay!);
      
      const cycleExpenses = expenses.filter(e => {
        if (e.accountId !== card.id) return false;
        const expDate = new Date(e.date);
        return expDate >= previousBillDate && expDate < nextBillDate;
      });

      const amountGenerated = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);

      const daysRemaining = Math.ceil((nextBillDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

      return {
        ...card,
        previousBillDate,
        nextBillDate,
        amountGenerated,
        daysRemaining
      };
    });
  }, [creditCards, expenses]);

  if (cardsData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10">
          <CreditCard className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-black text-slate-900 dark:text-white">No Credit Cards Found</h3>
        <p className="mt-2 max-w-sm text-sm font-medium text-slate-500 dark:text-slate-400">
          Go to Settings &gt; Accounts and set a Bill Generation Day for your credit card accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Credit Cards</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage billing cycles and unbilled amounts.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cardsData.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            className="relative flex flex-col overflow-hidden rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl border border-white/10 dark:border-white/5"
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            }}
          >
            {/* Decorative background elements */}
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-inner">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black tracking-widest uppercase text-white shadow-sm">{card.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Credit Account</p>
                  </div>
                </div>
              </div>

              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 drop-shadow-sm">Unbilled Amount</p>
                <div className="mt-2 text-4xl sm:text-5xl font-black tracking-tighter drop-shadow-md">
                  <Amount value={card.amountGenerated} />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-400">
                  Cycle started <span className="text-slate-300">{card.previousBillDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </p>
              </div>

              <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Bill Date</p>
                  <p className="text-sm sm:text-base font-black mt-1 tracking-wider">
                    {card.nextBillDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generates In</p>
                  <p className="text-sm sm:text-base font-black mt-1 text-blue-400 tracking-wider">
                    {card.daysRemaining} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
