import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";
import PayCreditBillModal from "../components/PayCreditBillModal";
import { useAccountPayments } from "../hooks/useAccountPayments";
import { useAccounts } from "../hooks/useAccounts";
import { useAccountTypes } from "../hooks/useAccountTypes";
import { useExpenses } from "../hooks/useExpenses";
import Amount from "../components/common/Amount";
import { isCreditAccount } from "../utils/accountKind";
import {
  computeCreditUsage,
  getCreditBillHistory,
  toLocalDateKey,
} from "../utils/accountBalance";

export default function CardsPage({ hideHeader }: { hideHeader?: boolean }) {
  const { accounts } = useAccounts();
  const { accountTypes } = useAccountTypes();
  const { expenses } = useExpenses();
  const { payments } = useAccountPayments();
  const [payRequest, setPayRequest] = useState<{
    cardId: string;
    suggestedAmount?: number;
    suggestedNote?: string;
    targetCycleStart?: string;
    targetCycleEnd?: string;
  } | null>(null);

  const formatCycleRange = (from: Date, to: Date) =>
    `${from.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} - ${to.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

  const creditCards = useMemo(() => {
    return accounts.filter((a) => {
      const typeName = accountTypes.find((t) => t.id === a.typeId)?.name || "";
      return isCreditAccount(typeName) && a.billGenerationDay;
    });
  }, [accounts, accountTypes]);

  const cardsData = useMemo(() => {
    return creditCards.map((card) => {
      const usage = computeCreditUsage(card, expenses, payments);
      return {
        ...card,
        ...usage,
        billHistory: getCreditBillHistory(card, expenses, payments, 6),
      };
    });
  }, [creditCards, expenses, payments]);

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
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full">
              {(() => {
                const latestOutstandingBill = card.billHistory.find(
                  (bill) => bill.outstandingAmount > 0
                );
                return (
                  <>
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

              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 drop-shadow-sm">Unbilled Amount</p>
                <div className="mt-2 text-4xl sm:text-5xl font-black tracking-tighter drop-shadow-md">
                  <Amount value={card.usedThisCycle} />
                </div>
                {card.creditLimit != null && (
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Available: <span className="text-slate-200"><Amount value={card.availableCredit} /></span>
                    {" · "}Limit: <Amount value={card.creditLimit} />
                  </p>
                )}
                {card.paidThisCycle > 0 && (
                  <p className="mt-1 text-xs font-bold text-emerald-400">
                    Paid this cycle: <Amount value={card.paidThisCycle} />
                  </p>
                )}
              </div>

              {card.billHistory.length > 0 && (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Previous bills
                  </p>
                  <div className="mt-2 space-y-2">
                    {card.billHistory.slice(0, 3).map((bill) => (
                      <div key={bill.id} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-300">
                          {formatCycleRange(bill.cycleStart, bill.cycleEnd)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-200">
                          Bill: <Amount value={bill.billedAmount} /> · Paid: <Amount value={bill.paidAmount} />
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400">
                          Outstanding: <Amount value={bill.outstandingAmount} />
                        </p>
                        {bill.outstandingAmount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPayRequest({
                                cardId: card.id,
                                suggestedAmount: bill.outstandingAmount,
                                suggestedNote: `Bill payment — ${formatCycleRange(
                                  bill.cycleStart,
                                  bill.cycleEnd
                                )}`,
                                targetCycleStart: toLocalDateKey(bill.cycleStart),
                                targetCycleEnd: toLocalDateKey(bill.cycleEnd),
                              })
                            }
                            className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors"
                          >
                            Pay this bill
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Limit resets</p>
                  <p className="text-sm sm:text-base font-black mt-1 tracking-wider">
                    {card.nextResetDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">In</p>
                  <p className="text-sm sm:text-base font-black mt-1 text-blue-400 tracking-wider">
                    {card.daysRemaining} days
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {latestOutstandingBill ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPayRequest({
                        cardId: card.id,
                        suggestedAmount: latestOutstandingBill.outstandingAmount,
                        suggestedNote: `Bill payment — ${formatCycleRange(
                          latestOutstandingBill.cycleStart,
                          latestOutstandingBill.cycleEnd
                        )}`,
                        targetCycleStart: toLocalDateKey(latestOutstandingBill.cycleStart),
                        targetCycleEnd: toLocalDateKey(latestOutstandingBill.cycleEnd),
                      })
                    }
                    className="w-full rounded-xl bg-white/15 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/25 transition-colors"
                  >
                    Pay bill from account
                  </button>
                ) : null}
                <Link
                  to={`/accounts/${card.id}`}
                  className="text-center text-[10px] font-black uppercase tracking-widest text-blue-300 hover:text-white transition-colors"
                >
                  View history →
                </Link>
              </div>
                  </>
                );
              })()}
            </div>
          </motion.div>
        ))}
      </div>
      {payRequest && (() => {
        const card = cardsData.find((c) => c.id === payRequest.cardId);
        if (!card) return null;
        return (
          <PayCreditBillModal
            key={`${card.id}-${payRequest.suggestedAmount ?? "none"}-${payRequest.suggestedNote ?? "none"}`}
            isOpen
            onClose={() => setPayRequest(null)}
            creditAccountId={card.id}
            creditAccountName={card.name}
            suggestedAmount={payRequest.suggestedAmount}
            suggestedNote={payRequest.suggestedNote}
            targetCycleStart={payRequest.targetCycleStart}
            targetCycleEnd={payRequest.targetCycleEnd}
          />
        );
      })()}
    </div>
  );
}
