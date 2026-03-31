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

export interface Expense {
  id?: string;
  amount: number;
  category: string;
  note: string;
  date: string;
  month: string;
  time?: string;
  accountId?: string;
  createdAt: unknown;
}
