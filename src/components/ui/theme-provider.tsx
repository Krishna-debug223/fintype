"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { DEFAULT_THEME } from "@/lib/constants";
import {
  applyTheme,
  persistThemePreference,
  readThemePreference,
} from "@/lib/theme";
import type { Theme } from "@/types";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const storedTheme = readThemePreference(window.localStorage);
    applyTheme(storedTheme, document.documentElement);
    return storedTheme;
  });

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme, document.documentElement);
    persistThemePreference(nextTheme, window.localStorage);
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
