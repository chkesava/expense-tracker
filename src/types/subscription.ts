export interface Subscription {
    id?: string;
    name: string;
    amount: number;
    category: string;
    dayOfMonth: number; // 1-31
    isActive: boolean;
    lastProcessed: string; // "YYYY-MM"
    type: "subscription" | "emi";
    endMonth?: number; // 1-12
    endYear?: number;
    isCompleted?: boolean;
    accountId?: string;
    createdAt?: any;
}
