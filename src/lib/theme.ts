import { DEFAULT_THEME, THEMES, THEME_STORAGE_KEY } from "@/lib/constants";
import type { Theme } from "@/types";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEMES.some((theme) => theme === value);
}

export function readThemePreference(storage: Pick<Storage, "getItem">): Theme {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
}

export function persistThemePreference(
  theme: Theme,
  storage: Pick<Storage, "setItem">,
): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyTheme(
  theme: Theme,
  root: Pick<HTMLElement, "dataset">,
): void {
  root.dataset.theme = theme;
}
