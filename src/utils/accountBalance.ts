import type {
  Account,
  AccountActivity,
  AccountEntry,
  AccountPayment,
  Expense,
  Income,
} from "../types/expense";
import { getAccountKind } from "./accountKind";
import { getBillingCycleDates, getDaysUntilReset } from "./billingCycle";
import { parseLocalDate, toLocalDateKey, billDateForMonth } from "./dates";

export { toLocalDateKey } from "./dates";

function paymentBelongsToCycle(
  payment: AccountPayment,
  cycleStart: Date,
  cycleEnd: Date
): boolean {
  const startKey = toLocalDateKey(cycleStart);
  const endKey = toLocalDateKey(cycleEnd);
  if (payment.appliedCycleStart || payment.appliedCycleEnd) {
    return (
      payment.appliedCycleStart === startKey &&
      payment.appliedCycleEnd === endKey
    );
  }
  const note = payment.note || "";
  const noteRangeMatch = note.match(/(.+?)\s-\s(.+)$/);
  if (noteRangeMatch) {
    const parsedStart = new Date(noteRangeMatch[1].replace(/^.*?—\s*/, "").trim());
    const parsedEnd = new Date(noteRangeMatch[2].trim());
    if (
      Number.isFinite(parsedStart.getTime()) &&
      Number.isFinite(parsedEnd.getTime())
    ) {
      return (
        toLocalDateKey(parsedStart) === startKey &&
        toLocalDateKey(parsedEnd) === endKey
      );
    }
  }
  const d = parseLocalDate(payment.date);
  return d >= cycleStart && d < cycleEnd;
}

function paymentsFromAccount(accountId: string, payments: AccountPayment[]) {
  return payments.filter((p) => p.fromAccountId === accountId);
}

function paymentsToAccount(accountId: string, payments: AccountPayment[]) {
  return payments.filter((p) => p.toAccountId === accountId);
}

function getPaymentCounterpartyName(
  payment: AccountPayment,
  direction: "incoming" | "outgoing",
  accountNameById?: Record<string, string>
): string {
  if (payment.sourceType === "external" || payment.fromAccountId === "external") {
    return "Already paid";
  }
  if (direction === "outgoing") {
    return accountNameById?.[payment.toAccountId] ?? "Credit card";
  }
  return accountNameById?.[payment.fromAccountId] ?? "Bank account";
}

function entriesForAccount(accountId: string, entries: AccountEntry[]) {
  return entries.filter((e) => e.accountId === accountId);
}

function isOnOrAfter(date: string, baseline?: string): boolean {
  if (!baseline) return true;
  return date >= baseline;
}

function paymentsInBillingCycle(
  accountId: string,
  payments: AccountPayment[],
  cycleStart: Date,
  cycleEnd: Date
) {
  return paymentsToAccount(accountId, payments).filter((p) => {
    return paymentBelongsToCycle(p, cycleStart, cycleEnd);
  });
}

export function computeBankBalance(
  account: Account,
  expenses: Expense[],
  incomes: Income[],
  payments: AccountPayment[] = [],
  entries: AccountEntry[] = []
): number {
  const opening = account.openingBalance ?? 0;
  const baseline = account.balanceAsOfDate;
  const totalExpenses = expenses
    .filter((e) => e.accountId === account.id && isOnOrAfter(e.date, baseline))
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = incomes
    .filter((i) => i.accountId === account.id && isOnOrAfter(i.date, baseline))
    .reduce((sum, i) => sum + i.amount, 0);
  const billPaymentsOut = paymentsFromAccount(account.id, payments)
    .filter((p) => isOnOrAfter(p.date, baseline))
    .reduce((sum, p) => sum + p.amount, 0);
  const manualAdjustments = entriesForAccount(account.id, entries).reduce(
    (sum, entry) =>
      isOnOrAfter(entry.date, baseline)
        ? sum + (entry.direction === "credit" ? entry.amount : -entry.amount)
        : sum,
    0
  );
  return opening + totalIncomes - totalExpenses - billPaymentsOut + manualAdjustments;
}

export function computeCreditUsage(
  account: Account,
  expenses: Expense[],
  payments: AccountPayment[] = []
): {
  usedThisCycle: number;
  availableCredit: number;
  nextResetDate: Date;
  daysRemaining: number;
  paidThisCycle: number;
} {
  const billDay = account.billGenerationDay ?? 1;
  const { previousBillDate, nextBillDate } = getBillingCycleDates(billDay);

  const cycleExpenses = expenses.filter((e) => {
    if (e.accountId !== account.id) return false;
    const expDate = new Date(e.date);
    return expDate >= previousBillDate && expDate < nextBillDate;
  });

  const cyclePayments = paymentsInBillingCycle(
    account.id,
    payments,
    previousBillDate,
    nextBillDate
  );

  const expenseTotal = cycleExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidThisCycle = cyclePayments.reduce((sum, p) => sum + p.amount, 0);
  const usedThisCycle = Math.max(0, expenseTotal - paidThisCycle);
  const limit = account.creditLimit ?? 0;
  const availableCredit = Math.max(0, limit - usedThisCycle);

  return {
    usedThisCycle,
    availableCredit,
    nextResetDate: nextBillDate,
    daysRemaining: getDaysUntilReset(nextBillDate),
    paidThisCycle,
  };
}

export type CreditBillStatus = "unpaid" | "partiallyPaid" | "paid";

export interface CreditBillSummary {
  id: string;
  accountId: string;
  cycleStart: Date;
  cycleEnd: Date;
  billedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: CreditBillStatus;
}

export function getCreditBillHistory(
  account: Account,
  expenses: Expense[],
  payments: AccountPayment[] = [],
  cycles = 6
): CreditBillSummary[] {
  const billDay = account.billGenerationDay ?? 1;
  const { previousBillDate } = getBillingCycleDates(billDay);
  const history: CreditBillSummary[] = [];

  for (let i = 0; i < cycles; i += 1) {
    const cycleEndMonth = previousBillDate.getMonth() - i;
    const cycleEndYear = previousBillDate.getFullYear();
    const cycleEnd = billDateForMonth(cycleEndYear, cycleEndMonth, billDay);
    const cycleStart = billDateForMonth(cycleEndYear, cycleEndMonth - 1, billDay);

    const billedAmount = expenses
      .filter((e) => {
        if (e.accountId !== account.id) return false;
        const d = parseLocalDate(e.date);
        return d >= cycleStart && d < cycleEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const paidAmount = payments
      .filter((p) => {
        if (p.toAccountId !== account.id) return false;
        return paymentBelongsToCycle(p, cycleStart, cycleEnd);
      })
      .reduce((sum, p) => sum + p.amount, 0);

    if (billedAmount <= 0 && paidAmount <= 0) {
      continue;
    }

    const outstandingAmount = Math.max(0, billedAmount - paidAmount);
    const status: CreditBillStatus =
      outstandingAmount === 0
        ? "paid"
        : paidAmount > 0
          ? "partiallyPaid"
          : "unpaid";

    history.push({
      id: `${account.id}-${toLocalDateKey(cycleStart)}`,
      accountId: account.id,
      cycleStart,
      cycleEnd,
      billedAmount,
      paidAmount,
      outstandingAmount,
      status,
    });
  }

  return history;
}

export function buildAccountActivities(
  account: Account,
  typeName: string,
  expenses: Expense[],
  incomes: Income[],
  payments: AccountPayment[] = [],
  entries: AccountEntry[] = [],
  accountNameById?: Record<string, string>
): AccountActivity[] {
  const baseline = account.balanceAsOfDate;
  const shouldApplyBaseline = getAccountKind(typeName) !== "credit";
  const withinBaseline = (date: string) =>
    !shouldApplyBaseline || isOnOrAfter(date, baseline);

  const accountExpenses = expenses.filter(
    (e) => e.accountId === account.id && withinBaseline(e.date)
  );
  const accountIncomes = incomes.filter(
    (i) => i.accountId === account.id && withinBaseline(i.date)
  );
  const accountEntries = entriesForAccount(account.id, entries).filter((entry) =>
    withinBaseline(entry.date)
  );
  const kind = getAccountKind(typeName);

  const outgoingPayments = paymentsFromAccount(account.id, payments).filter((p) =>
    withinBaseline(p.date)
  );
  const incomingPayments = paymentsToAccount(account.id, payments).filter((p) =>
    withinBaseline(p.date)
  );

  const activities: AccountActivity[] = [
    ...accountExpenses.map((e, idx) => ({
      id: e.id ?? `expense-${e.date}-${idx}`,
      date: e.date,
      amount: e.amount,
      type: "debit" as const,
      note: e.note,
      category: e.category,
      linkedExpenseId: e.id,
    })),
    ...accountIncomes.map((i, idx) => ({
      id: i.id ?? `income-${i.date}-${idx}`,
      date: i.date,
      amount: i.amount,
      type: "credit" as const,
      note: i.note,
      source: i.source,
      linkedIncomeId: i.id,
    })),
    ...accountEntries.map((entry) => ({
      id: `entry-${entry.id}`,
      date: entry.date,
      amount: entry.amount,
      type: entry.direction,
      note:
        entry.note ||
        (entry.direction === "credit" ? "Manual funds added" : "Manual account debit"),
      linkedAccountEntryId: entry.id,
      isManualEntry: true,
    })),
    ...outgoingPayments.map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      type: "debit" as const,
      note: p.note || "Credit card bill payment",
      isBillPayment: true,
      linkedPaymentId: p.id,
      counterpartyName: getPaymentCounterpartyName(p, "outgoing", accountNameById),
    })),
    ...(kind === "credit"
      ? incomingPayments.map((p) => ({
          id: `payment-in-${p.id}`,
          date: p.date,
          amount: p.amount,
          type: "credit" as const,
          note: p.note || "Bill payment received",
          isBillPayment: true,
          linkedPaymentId: p.id,
          counterpartyName: getPaymentCounterpartyName(p, "incoming", accountNameById),
        }))
      : []),
  ];

  activities.sort(
    (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  if (kind !== "credit") {
    const opening = account.openingBalance ?? 0;
    let running = opening;
    const chronological = [...activities].sort((a, b) => {
      const diff = parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime();
      if (diff !== 0) return diff;
      if (a.type !== b.type) return a.type === "credit" ? -1 : 1;
      return 0;
    });
    for (const act of chronological) {
      if (act.type === "debit") running -= act.amount;
      else running += act.amount;
      act.runningBalance = running;
    }
  }

  return activities;
}

export function previewBalanceAfterTransaction(
  account: Account,
  typeName: string,
  expenses: Expense[],
  incomes: Income[],
  transactionType: "expense" | "income",
  amount: number,
  payments: AccountPayment[] = [],
  entries: AccountEntry[] = [],
  excludeId?: string
): number | null {
  const kind = getAccountKind(typeName);
  if (kind !== "credit") {
    const filteredExpenses = excludeId
      ? expenses.filter((e) => e.id !== excludeId)
      : expenses;
    const filteredIncomes = excludeId
      ? incomes.filter((i) => i.id !== excludeId)
      : incomes;
    let balance = computeBankBalance(
      account,
      filteredExpenses,
      filteredIncomes,
      payments,
      entries
    );
    if (transactionType === "expense") balance -= amount;
    else balance += amount;
    return balance;
  }
  if (kind === "credit" && transactionType === "expense" && account.billGenerationDay) {
    const { availableCredit } = computeCreditUsage(account, expenses, payments);
    return availableCredit - amount;
  }
  return null;
}

export function previewBalanceAfterBillPayment(
  fromAccount: Account,
  expenses: Expense[],
  incomes: Income[],
  payments: AccountPayment[],
  entries: AccountEntry[],
  amount: number
): number {
  return computeBankBalance(fromAccount, expenses, incomes, payments, entries) - amount;
}
