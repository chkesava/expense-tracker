import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  | "glass-3d";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "expense-tracker-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Remove all possible theme classes
    const themeClasses = [
      "light", "dark", "theme-midnight", "theme-midnight-olive", 
      "theme-vintage-parchment", "theme-sakura-bloom", 
      "theme-cyberpunk", "theme-nordic", "theme-deep-sea", "theme-glass-3d"
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

  const value = useMemo(() => ({
    theme,
    setTheme: (nextTheme: Theme) => setThemeState(nextTheme),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
