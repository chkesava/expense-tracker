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
  createdAt?: unknown;
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
  isRecurring?: boolean;
  createdAt: unknown;
}
