export type VaultExpense = {
  id?: string;
  vaultId: string;
  amount: number;
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  createdAt?: unknown;
  createdBy: string;
  paidBy: string;
  splitBetween: string[]; // member uids who share this expense equally
};
