"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { DEFAULT_THEME } from "@/lib/constants";
import { getLocalRepository } from "@/lib/storage";
import { applyTheme } from "@/lib/theme";
import type { Theme } from "@/types";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(() => {
    if (typeof window === "undefined") {
      return { highContrast: false, reducedMotion: "system" as const };
    }
    const settings = getLocalRepository().getSettings();
    return {
      highContrast: settings.highContrast,
      reducedMotion: settings.reducedMotion,
    };
  });
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const storedTheme = getLocalRepository().getSettings().theme;
    applyTheme(storedTheme, document.documentElement);
    return storedTheme;
  });

  useEffect(() => {
    const repository = getLocalRepository();
    const syncPreferences = () => {
      const settings = repository.getSettings();
      setPreferences({
        highContrast: settings.highContrast,
        reducedMotion: settings.reducedMotion,
      });
    };
    syncPreferences();
    return repository.subscribe(syncPreferences);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = preferences.highContrast ? "high" : "normal";
    root.dataset.motion = preferences.reducedMotion;
  }, [preferences]);

  const setTheme = useCallback((nextTheme: Theme) => {
    applyTheme(nextTheme, document.documentElement);
    const repository = getLocalRepository();
    repository.setSettings({ ...repository.getSettings(), theme: nextTheme });
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
