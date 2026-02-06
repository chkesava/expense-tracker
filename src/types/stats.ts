export interface UserStats {
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string; // ISO date string YYYY-MM-DD
    points: number;
    level: number;
    badges: string[];
}

export const LEVEL_THRESHOLDS = {
    1: 0,
    2: 100,
    3: 300,
    4: 600,
    5: 1000,
    6: 2000,
};

export const BADGES = {
    NO_SPEND: { id: 'no_spend', icon: '🛡️', name: 'No Spend Day' },
    STREAK_7: { id: 'streak_7', icon: '🔥', name: '7 Day Streak' },
    SAVER_PRO: { id: 'saver_pro', icon: '💰', name: 'Saver Pro' },
};
