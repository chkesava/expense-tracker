export type SplitType = "equal" | "custom";

export interface Participant {
  name: string;
  amount: number;
  paid: boolean;
  upiId?: string;
  isCurrentUser: boolean;
  userId?: string; // Optional, if they have an account
}

export interface Split {
  id?: string;
  title: string;
  totalAmount: number;
  splitType: SplitType;
  participants: Participant[];
  createdBy: string; // userId
  createdAt: number;
  settled: boolean;
  notes?: string;
  category?: string; // e.g. "Food", "Travel"
}
