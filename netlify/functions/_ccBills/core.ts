/**
 * Keep in sync with the mobile repo:
 * shared/utils/{billingCycle,autoCreditCardBills,money,dates}.ts
 *
 * Statement closes ON generation day D. Window is (previous D + 1) → D.
 * A card that closes on the 20th bills 21 Jul → 20 Aug.
 */

export const AUTO_CREDIT_CARD_BILL_NOTE = "Auto-created from cycle spend";
export const CREDIT_CARD_PAYMENT_WINDOW_DAYS = 5;
const AUTO_BILL_MIN_DUE_RATE = 0.05;
const REDATE_TOLERANCE_DAYS = 3;

export type AccountSlice = {
  id: string;
  typeId: string;
  billGenerationDay?: unknown;
};

export type ExpenseSlice = {
  accountId?: string;
  date: string;
  amount: number;
};

export type BillSlice = {
  id: string;
  accountId: string;
  statementDate: string;
  statementAmount: number;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  note?: string;
  amountPaid?: number;
  status?: string;
};

export type BillDraft = {
  accountId: string;
  statementAmount: number;
  minimumDueAmount: number;
  statementDate: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  note: string;
};

export type BillRefreshPatch = {
  billId: string;
  statementAmount: number;
  minimumDueAmount: number;
  statementDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
};

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function todayDateKey(timezone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(dateStr: string, days: number): string {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + days);
  return toLocalDateKey(date);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampBillDay(year: number, monthIndex: number, billDay: number): number {
  return Math.min(Math.max(1, billDay), daysInMonth(year, monthIndex));
}

function billDateForMonth(year: number, monthIndex: number, billDay: number): Date {
  return new Date(year, monthIndex, clampBillDay(year, monthIndex, billDay));
}

export function normalizeBillGenerationDay(value: unknown): number | null {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.min(31, Math.floor(parsed));
}

function isDateKeyInInclusiveRange(dateKey: string, start: Date, end: Date): boolean {
  return dateKey >= toLocalDateKey(start) && dateKey <= toLocalDateKey(end);
}

function dayAfter(date: Date): Date {
  return parseLocalDate(shiftDateKey(toLocalDateKey(date), 1));
}

export function getClosedBillingCycle(billDay: number, asOf: Date) {
  const currentMonth = asOf.getMonth();
  const currentYear = asOf.getFullYear();
  const currentDate = asOf.getDate();
  const effectiveBillDay = clampBillDay(currentYear, currentMonth, billDay);
  const previousBillDate =
    currentDate >= effectiveBillDay
      ? billDateForMonth(currentYear, currentMonth, billDay)
      : billDateForMonth(currentYear, currentMonth - 1, billDay);
  const cycleEnd = previousBillDate;
  const cycleStart = dayAfter(
    billDateForMonth(cycleEnd.getFullYear(), cycleEnd.getMonth() - 1, billDay)
  );
  return { cycleStart, cycleEnd };
}

function daysBetweenDateKeys(from: string, to: string): number {
  const a = new Date(`${from}T12:00:00Z`);
  const b = new Date(`${to}T12:00:00Z`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isCreditType(typeName: string): boolean {
  return typeName.toLowerCase().includes("credit");
}

function minimumDueForStatement(statementAmount: number): number {
  return Math.min(
    statementAmount,
    roundMoney(statementAmount * AUTO_BILL_MIN_DUE_RATE)
  );
}

export function computeCreditCardBillStatus(input: {
  today: string;
  dueDate: string;
  amountPaid: number;
  statementAmount: number;
}): string {
  const statement = Math.max(0, Number(input.statementAmount) || 0);
  const paid = Math.max(0, Number(input.amountPaid) || 0);
  if (statement > 0 && paid >= statement) return "PAID";
  if (paid > 0 && paid < statement) return "PARTIALLY_PAID";
  if (input.today > input.dueDate) return "OVERDUE";
  if (input.today === input.dueDate) return "DUE_TODAY";
  const daysUntil = daysBetweenDateKeys(input.today, input.dueDate);
  if (daysUntil >= 0 && daysUntil <= 3) return "DUE_SOON";
  return "UPCOMING";
}

function previewClosedCycle(input: {
  account: AccountSlice;
  typeName: string;
  expenses: ExpenseSlice[];
  today: string;
}): BillDraft | null {
  if (!isCreditType(input.typeName)) return null;
  const billDay = normalizeBillGenerationDay(input.account.billGenerationDay);
  if (billDay == null) return null;

  const asOf = parseLocalDate(input.today);
  const { cycleStart, cycleEnd } = getClosedBillingCycle(billDay, asOf);
  const statementDate = toLocalDateKey(cycleEnd);
  if (input.today < statementDate) return null;

  const statementAmount = roundMoney(
    input.expenses
      .filter(
        (expense) =>
          expense.accountId === input.account.id &&
          isDateKeyInInclusiveRange(expense.date, cycleStart, cycleEnd)
      )
      .reduce((sum, expense) => sum + expense.amount, 0)
  );
  if (statementAmount <= 0) return null;

  return {
    accountId: input.account.id,
    statementAmount,
    minimumDueAmount: minimumDueForStatement(statementAmount),
    statementDate,
    dueDate: shiftDateKey(statementDate, CREDIT_CARD_PAYMENT_WINDOW_DAYS),
    billingPeriodStart: toLocalDateKey(cycleStart),
    billingPeriodEnd: statementDate,
    note: AUTO_CREDIT_CARD_BILL_NOTE,
  };
}

export function planCreditCardBillJobs(input: {
  accounts: AccountSlice[];
  typeNameById: Map<string, string>;
  expenses: ExpenseSlice[];
  existingBills: BillSlice[];
  today: string;
}): { drafts: BillDraft[]; patches: BillRefreshPatch[] } {
  const drafts: BillDraft[] = [];
  const seen = new Set(
    input.existingBills.map((bill) => `${bill.accountId}:${bill.statementDate}`)
  );

  for (const account of input.accounts) {
    const draft = previewClosedCycle({
      account,
      typeName: input.typeNameById.get(account.typeId) || "",
      expenses: input.expenses,
      today: input.today,
    });
    if (!draft) continue;
    const key = `${draft.accountId}:${draft.statementDate}`;
    if (seen.has(key)) continue;
    const nearbyAutoBill = input.existingBills.some(
      (bill) =>
        bill.accountId === draft.accountId &&
        bill.status !== "CANCELLED" &&
        Math.abs(daysBetweenDateKeys(bill.statementDate, draft.statementDate)) <=
          REDATE_TOLERANCE_DAYS
    );
    if (nearbyAutoBill) continue;
    seen.add(key);
    drafts.push(draft);
  }

  const patches: BillRefreshPatch[] = [];
  for (const account of input.accounts) {
    const draft = previewClosedCycle({
      account,
      typeName: input.typeNameById.get(account.typeId) || "",
      expenses: input.expenses,
      today: input.today,
    });
    if (!draft) continue;

    const candidates = input.existingBills.filter(
      (bill) =>
        bill.accountId === account.id &&
        Boolean(bill.id) &&
        bill.status !== "PAID" &&
        bill.status !== "CANCELLED" &&
        (bill.note || "") === AUTO_CREDIT_CARD_BILL_NOTE
    );
    const existing =
      candidates.find((bill) => bill.statementDate === draft.statementDate) ||
      candidates.find(
        (bill) =>
          Math.abs(daysBetweenDateKeys(bill.statementDate, draft.statementDate)) <=
          REDATE_TOLERANCE_DAYS
      );
    if (!existing?.id) continue;

    const unchanged =
      existing.statementAmount === draft.statementAmount &&
      existing.billingPeriodStart === draft.billingPeriodStart &&
      existing.billingPeriodEnd === draft.billingPeriodEnd &&
      existing.statementDate === draft.statementDate;
    if (unchanged) continue;

    patches.push({
      billId: existing.id,
      statementAmount: draft.statementAmount,
      minimumDueAmount: draft.minimumDueAmount,
      statementDate: draft.statementDate,
      billingPeriodStart: draft.billingPeriodStart,
      billingPeriodEnd: draft.billingPeriodEnd,
      dueDate: draft.dueDate,
    });
  }

  return { drafts, patches };
}
