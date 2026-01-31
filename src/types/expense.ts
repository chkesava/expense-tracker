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
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id?: string;
  amount: number;
  category: Category;
  note: string;
  date: string;
  month: string;
  createdAt: unknown;
}
