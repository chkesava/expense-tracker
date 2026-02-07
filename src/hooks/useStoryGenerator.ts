import { useMemo } from 'react';
import type { Expense } from '../types/expense';
import { groupByCategory } from '../utils/analytics';

export interface StorySlide {
    id: string;
    type: 'intro' | 'total' | 'category' | 'focus' | 'outro';
    title: string;
    subtitle?: string;
    value?: string; // Main big text
    data?: any; // Extra data like charts or icons
    color: string; // Background gradient class or hex
}

export function useStoryGenerator(expenses: Expense[], month: string) {
    const slides = useMemo(() => {
        if (!expenses.length) return [];

        const generated: StorySlide[] = [];
        const monthName = new Date(month + '-01').toLocaleString('default', { month: 'long' });

        // 1. INTRO
        generated.push({
            id: 'intro',
            type: 'intro',
            title: `${monthName} Recap`,
            subtitle: "Let's see how you did!",
            color: "from-blue-600 to-indigo-700"
        });

        // 2. TOTAL SPEND
        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        generated.push({
            id: 'total',
            type: 'total',
            title: "Total Spent",
            value: `₹${total.toLocaleString()}`,
            subtitle: "Every rupee counts!",
            color: "from-emerald-600 to-teal-700"
        });

        // 3. TOP CATEGORY
        const byCategory = groupByCategory(expenses).sort((a, b) => b.value - a.value);
        if (byCategory.length > 0) {
            const top = byCategory[0];
            generated.push({
                id: 'category',
                type: 'category',
                title: "Top Category",
                value: top.category,
                subtitle: `You spent ₹${top.value.toLocaleString()} here.`,
                color: "from-purple-600 to-pink-700",
                data: { icon: top.category[0] }
            } as any);
        }

        // 4. OUTRO
        generated.push({
            id: 'outro',
            type: 'outro',
            title: "You're all caught up!",
            subtitle: "Keep tracking to unlock more insights.",
            color: "from-slate-800 to-slate-900"
        });

        return generated;
    }, [expenses, month]);

    return slides;
}
