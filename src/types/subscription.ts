import type { Category } from "./expense";

export interface Subscription {
    id?: string;
    name: string;
    amount: number;
    category: Category;
    dayOfMonth: number; // 1-31
    isActive: boolean;
    lastProcessed: string; // "YYYY-MM"
    createdAt?: any;
}
