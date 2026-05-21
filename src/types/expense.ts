export const CATEGORIES = [
  "Food",
  "Rent",
  "Travel",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Electrical",
  "Health",
  "Education",
  "Gifts",
  "Subscriptions",
  "Insurance",
  "Brother Related",
  "EMIS",
  "Other",
] as const;

export const INCOME_SOURCES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Business",
  "Rental",
  "Other",
] as const;

export interface Category {
  id: string;
  name: string;
  createdAt?: unknown;
}

export interface AccountType {
  id: string;
  name: string;
  createdAt?: unknown;
}

export interface Account {
  id: string;
  name: string;
  typeId: string;
  billGenerationDay?: number;
  creditLimit?: number;
  openingBalance?: number;
  balanceInitialized?: boolean;
  createdAt?: unknown;
}

export type AccountKind = "credit" | "bank" | "other";

/** Credit card bill paid from a savings/bank account — not an expense */
export interface AccountPayment {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note?: string;
  createdAt?: unknown;
}

export interface AccountActivity {
  id: string;
  date: string;
  amount: number;
  type: "debit" | "credit";
  note?: string;
  category?: string;
  source?: string;
  linkedExpenseId?: string;
  linkedIncomeId?: string;
  linkedPaymentId?: string;
  isBillPayment?: boolean;
  counterpartyName?: string;
  runningBalance?: number;
}

export interface CategoryBudget {
  id: string;
  category: string;
  amount: number;
  month: string;
  createdAt?: unknown;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  createdAt?: unknown;
}

export interface CategorizationRule {
  id: string;
  keyword: string;
  category: string;
  createdAt?: unknown;
}

export interface Expense {
  id?: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  month: string;
  time?: string;
  accountId?: string;
  budgetGroupId?: string;
  splitId?: string; // ID of the split this expense belongs to
  tripId?: string | null; // ID of the trip this expense belongs to
  vaultId?: string | null; // ID of the shared vault this expense belongs to
  isRecurring?: boolean;
  isAudited?: boolean;
  createdAt: unknown;
}

export interface Income {
  id?: string;
  amount: number;
  source: string;
  note: string;
  date: string;
  month: string;
  accountId?: string;
  createdAt: unknown;
}
