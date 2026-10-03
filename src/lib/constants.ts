import type {
  CaretStyle,
  Difficulty,
  FontSize,
  Mode,
  Rank,
  Theme,
} from "@/types/models";

/** All user-selectable content modes, in display order. */
export const MODES = [
  "terms",
  "office",
  "numbers",
  "excel",
  "mixed",
  "daily",
  "custom",
] as const satisfies readonly Mode[];

export const TIME_LENGTHS = [15, 30, 60, 120] as const;
export const WORD_LENGTHS = [25, 50, 100] as const;
export const DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
] as const satisfies readonly Difficulty[];
export const THEMES = [
  "dark",
  "light",
  "terminal",
  "wallstreet",
] as const satisfies readonly Theme[];
export const FONT_SIZES = [
  "small",
  "medium",
  "large",
  "xl",
] as const satisfies readonly FontSize[];
export const CARET_STYLES = [
  "line",
  "block",
  "underline",
] as const satisfies readonly CaretStyle[];

/**
 * Rank thresholds are inclusive minimum WPM values. Order is significant: keep
 * this array ascending whenever ranks are tuned.
 */
export const RANKS = [
  { title: "Intern", minWpm: 0 },
  { title: "Analyst", minWpm: 30 },
  { title: "Associate", minWpm: 45 },
  { title: "VP", minWpm: 60 },
  { title: "Director", minWpm: 75 },
  { title: "MD", minWpm: 90 },
] as const satisfies readonly Rank[];

export const APP_NAME = "FinType";
export const APP_DESCRIPTION =
  "Typing practice built around the language, numbers, and formulas used in finance.";
export const THEME_STORAGE_KEY = "fintype-theme";
export const DEFAULT_THEME: Theme = "dark";
