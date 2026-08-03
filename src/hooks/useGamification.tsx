import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./useAuth";
import type { UserStats } from "../types/stats";
import { LEVEL_THRESHOLDS } from "../types/stats";
import { toast } from "react-toastify";
import { useCelebration } from "./useCelebration";
import { formatDateKey, todayDateKey } from "../utils/dates";
import { scheduleIdleWork } from "../utils/scheduleIdle";

const DEFAULT_STATS: UserStats = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: "",
  points: 0,
  level: 1,
  badges: [],
  shields: 0,
  fires: 0,
  focusStreak: 0,
  focusWins: 0,
  monthlyRecords: {},
};

type GamificationContextType = {
  stats: UserStats;
  loading: boolean;
  addXP: (amount: number) => Promise<void>;
};

const GamificationContext = createContext<GamificationContextType | undefined>(
  undefined
);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const { triggerCelebration } = useCelebration();

  useEffect(() => {
    if (!user) {
      setStats(DEFAULT_STATS);
      setLoading(false);
      return;
    }

    const statsRef = doc(db, "users", user.uid, "stats", "summary");

    const unsubscribe = onSnapshot(
      statsRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserStats;
          setStats({ ...DEFAULT_STATS, ...data });
        } else {
          setDoc(statsRef, DEFAULT_STATS, { merge: true });
          setStats(DEFAULT_STATS);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to gamification stats:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addXP = useCallback(
    async (amount: number) => {
      if (!user) return;

      try {
        const statsRef = doc(db, "users", user.uid, "stats", "summary");
        const docSnap = await getDoc(statsRef);

        let currentStats = DEFAULT_STATS;
        if (docSnap.exists()) {
          currentStats = {
            ...DEFAULT_STATS,
            ...(docSnap.data() as UserStats),
          };
        }

        let newPoints = currentStats.points + amount;
        let newLevel = currentStats.level;

        for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
          if (newPoints >= threshold) {
            newLevel = Math.max(newLevel, Number(lvl));
          }
        }

        if (newLevel > currentStats.level) {
          toast.success(`🎉 Level Up! You are now Level ${newLevel}!`);
          triggerCelebration("level-up");
        }

        await setDoc(
          statsRef,
          {
            points: newPoints,
            level: newLevel,
          },
          { merge: true }
        );
      } catch (error) {
        console.error("Failed to add XP:", error);
      }
    },
    [user, triggerCelebration]
  );

  useEffect(() => {
    if (!user || loading) return;
    if (stats.lastLoginDate === todayDateKey()) return;

    return scheduleIdleWork(
      () => {
        void checkDailyProgress();
      },
      { timeoutMs: 4000, fallbackDelayMs: 2000 }
    );

    async function checkDailyProgress() {
      const today = todayDateKey();

      if (stats.lastLoginDate === today) return;

      try {
        const statsRef = doc(db, "users", user!.uid, "stats", "summary");

        const docSnap = await getDoc(statsRef);
        const currentStats = docSnap.exists()
          ? { ...DEFAULT_STATS, ...(docSnap.data() as UserStats) }
          : DEFAULT_STATS;

        if (currentStats.lastLoginDate === today) return;

        const lastDate = currentStats.lastLoginDate;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatDateKey(yesterday);
        const lastMonthStr = yesterdayStr.slice(0, 7);

        const expensesRef = collection(db, "users", user!.uid, "expenses");
        const q = query(expensesRef, where("date", "==", yesterdayStr));
        const snapshot = await getDocs(q);
        const spentMoneyYesterday = !snapshot.empty;

        let newShields = currentStats.shields;
        let newFires = currentStats.fires;
        let newFocusStreak = currentStats.focusStreak || 0;
        let newFocusWins = currentStats.focusWins || 0;
        let xpToAdd = 0;

        const focusRef = doc(db, "users", user!.uid, "focus", "active");
        const focusSnap = await getDoc(focusRef);

        if (focusSnap.exists()) {
          const focusData = focusSnap.data();
          if (focusData.status === "active") {
            if (
              yesterdayStr >= focusData.startDate.split("T")[0] &&
              yesterdayStr <= focusData.endDate.split("T")[0]
            ) {
              const focusQ = query(
                expensesRef,
                where("date", "==", yesterdayStr),
                where("category", "==", focusData.category)
              );
              const focusExpenses = await getDocs(focusQ);
              let dailyFocusSpend = 0;
              focusExpenses.forEach(
                (d) => (dailyFocusSpend += Number(d.data().amount))
              );

              if (dailyFocusSpend <= focusData.dailyLimit) {
                newFocusStreak += 1;
                newFocusWins += 1;
                xpToAdd += 50;
                triggerCelebration("focus-win");
                console.log(
                  "🎯 Focus Goal Met!",
                  dailyFocusSpend,
                  "/",
                  focusData.dailyLimit
                );
              } else {
                newFocusStreak = 0;
                console.log("❌ Focus Goal Failed", dailyFocusSpend);
              }
            }
          }
        }

        if (lastDate === yesterdayStr) {
          if (spentMoneyYesterday) {
            newFires += 1;
            newShields = 0;
            xpToAdd += 10;
            triggerCelebration("streak-fire");
            console.log("🔥 Fire Streak Increased!");
          } else {
            newShields += 1;
            newFires = 0;
            xpToAdd += 50;
            triggerCelebration("streak-shield");
            console.log("🛡️ Shield Streak Increased!");
          }
        } else {
          const dayDifference =
            (new Date(today).getTime() - new Date(lastDate).getTime()) /
            (1000 * 3600 * 24);

          if (dayDifference > 1) {
            newShields = 0;
            newFires = 0;
            xpToAdd += 5;
          } else {
            xpToAdd += 5;
          }
        }

        const monthlyRecords = { ...currentStats.monthlyRecords };
        if (!monthlyRecords[lastMonthStr]) {
          monthlyRecords[lastMonthStr] = {
            maxShields: 0,
            maxFires: 0,
            totalShields: 0,
            totalFires: 0,
          };
        }

        const mStats = monthlyRecords[lastMonthStr];
        if (spentMoneyYesterday) mStats.totalFires++;
        else mStats.totalShields++;

        mStats.maxShields = Math.max(mStats.maxShields, newShields);
        mStats.maxFires = Math.max(mStats.maxFires, newFires);

        let newPoints = currentStats.points + xpToAdd;
        let newLevel = currentStats.level;
        for (const [lvl, threshold] of Object.entries(LEVEL_THRESHOLDS)) {
          if (newPoints >= threshold) {
            newLevel = Math.max(newLevel, Number(lvl));
          }
        }

        await setDoc(
          statsRef,
          {
            ...currentStats,
            lastLoginDate: today,
            shields: newShields,
            fires: newFires,
            points: newPoints,
            level: newLevel,
            focusStreak: newFocusStreak,
            focusWins: newFocusWins,
            monthlyRecords,
          },
          { merge: true }
        );

        console.log("Daily gamification processed!");
      } catch (err) {
        console.error("Failed to run daily gamification check:", err);
      }
    }
  }, [user, loading, stats.lastLoginDate, triggerCelebration]);

  const value = useMemo(
    () => ({ stats, loading, addXP }),
    [stats, loading, addXP]
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error(
      "useGamification must be used within a GamificationProvider"
    );
  }
  return context;
}
