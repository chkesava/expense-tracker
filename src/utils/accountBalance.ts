import type {
  Account,
  AccountActivity,
  AccountPayment,
  Expense,
  Income,
} from "../types/expense";
import { getAccountKind } from "./accountKind";
import { getBillingCycleDates, getDaysUntilReset } from "./billingCycle";

function paymentsFromAccount(accountId: string, payments: AccountPayment[]) {
  return payments.filter((p) => p.fromAccountId === accountId);
}

function paymentsToAccount(accountId: string, payments: AccountPayment[]) {
  return payments.filter((p) => p.toAccountId === accountId);
}

function paymentsInBillingCycle(
  accountId: string,
  payments: AccountPayment[],
  previousBillDate: Date,
  nextBillDate: Date
) {
  return paymentsToAccount(accountId, payments).filter((p) => {
    const d = new Date(p.date);
    return d >= previousBillDate && d < nextBillDate;
  });
}

export function computeBankBalance(
  account: Account,
  expenses: Expense[],
  incomes: Income[],
  payments: AccountPayment[] = []
): number {
  const opening = account.openingBalance ?? 0;
  const totalExpenses = expenses
    .filter((e) => e.accountId === account.id)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes = incomes
    .filter((i) => i.accountId === account.id)
    .reduce((sum, i) => sum + i.amount, 0);
  const billPaymentsOut = paymentsFromAccount(account.id, payments).reduce(
    (sum, p) => sum + p.amount,
    0
  );
  return opening + totalIncomes - totalExpenses - billPaymentsOut;
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

export function buildAccountActivities(
  account: Account,
  typeName: string,
  expenses: Expense[],
  incomes: Income[],
  payments: AccountPayment[] = [],
  accountNameById?: Record<string, string>
): AccountActivity[] {
  const accountExpenses = expenses.filter((e) => e.accountId === account.id);
  const accountIncomes = incomes.filter((i) => i.accountId === account.id);
  const kind = getAccountKind(typeName);

  const outgoingPayments = paymentsFromAccount(account.id, payments);
  const incomingPayments = paymentsToAccount(account.id, payments);

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
    ...outgoingPayments.map((p) => ({
      id: p.id,
      date: p.date,
      amount: p.amount,
      type: "debit" as const,
      note: p.note || "Credit card bill payment",
      isBillPayment: true,
      linkedPaymentId: p.id,
      counterpartyName: accountNameById?.[p.toAccountId] ?? "Credit card",
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
          counterpartyName: accountNameById?.[p.fromAccountId] ?? "Bank account",
        }))
      : []),
  ];

  activities.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (kind === "bank") {
    const opening = account.openingBalance ?? 0;
    let running = opening;
    const chronological = [...activities].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
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
  excludeId?: string
): number | null {
  const kind = getAccountKind(typeName);
  if (kind === "bank") {
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
      payments
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
  amount: number
): number {
  return computeBankBalance(fromAccount, expenses, incomes, payments) - amount;
}
