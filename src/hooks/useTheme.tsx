import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { db } from "../firebase";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

type Theme = 
  | "light" 
  | "dark" 
  | "midnight" 
  | "midnight-olive" 
  | "vintage-parchment" 
  | "sakura-bloom" 
  | "cyberpunk" 
  | "nordic" 
  | "deep-sea"
  | "glass-3d"
  | "claymorphism";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "expense-tracker-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { realUser } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "light";
  });

  // Listen to Firestore settings changes to sync theme
  useEffect(() => {
    if (!realUser) return;

    const ref = doc(db, "users", realUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.theme) {
          setThemeState(data.theme as Theme);
        }
      }
    });

    return () => unsub();
  }, [realUser]);

  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme classes
    const themeClasses = [
      "light", "dark", "theme-midnight", "theme-midnight-olive", 
      "theme-vintage-parchment", "theme-sakura-bloom", 
      "theme-cyberpunk", "theme-nordic", "theme-deep-sea", "theme-glass-3d",
      "theme-claymorphism"
    ];
    root.classList.remove(...themeClasses);
    root.classList.remove("dark");
    
    // Add the appropriate class
    if (theme === "dark" || theme === "light") {
      root.classList.add(theme);
    } else {
      root.classList.add(`theme-${theme}`);
      if (["midnight", "midnight-olive", "cyberpunk", "deep-sea", "glass-3d"].includes(theme)) {
        root.classList.add("dark");
      }
    }
    
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = async (nextTheme: Theme) => {
    setThemeState(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    if (realUser) {
      try {
        const ref = doc(db, "users", realUser.uid);
        await setDoc(ref, { theme: nextTheme }, { merge: true });
      } catch (err) {
        console.error("Failed to sync theme to Firestore", err);
      }
    }
  };

  const value = useMemo(() => ({
    theme,
    setTheme,
  }), [theme, realUser]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
