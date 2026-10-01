/** Content families supported by the product. */
export type Mode =
  "terms" | "office" | "numbers" | "excel" | "mixed" | "daily" | "custom";

/** A duration-limited test. */
export interface TimeTestLength {
  type: "time";
  seconds: 15 | 30 | 60 | 120;
}

/** A test limited by the number of target words. */
export interface WordTestLength {
  type: "words";
  words: 25 | 50 | 100;
}

export type TestLength = TimeTestLength | WordTestLength;
export type Difficulty = "easy" | "medium" | "hard";
export type Theme = "dark" | "light" | "terminal" | "wallstreet";
export type FontSize = "small" | "medium" | "large";
export type CaretStyle = "line" | "block" | "underline";

/** The full set of preferences required to reproduce a test. */
export interface TestSettings {
  mode: Mode;
  length: TestLength;
  punctuation: boolean;
  numbers: boolean;
  difficulty: Difficulty;
  stopOnError: boolean;
  confidenceMode: boolean;
  theme: Theme;
  fontSize: FontSize;
  caretStyle: CaretStyle;
}

export type CharState =
  "untyped" | "correct" | "incorrect" | "extra" | "missed";

/** Aggregate character counts captured when a test ends. */
export interface CharacterBreakdown {
  correct: number;
  incorrect: number;
  extra: number;
  missed: number;
}

/** A single point in the per-second speed series. */
export interface WpmSample {
  second: number;
  wpm: number;
  rawWpm: number;
}

/** Serializable output of a completed typing test. */
export interface TestResult {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  characterBreakdown: CharacterBreakdown;
  durationMs: number;
  wpmPerSecond: readonly WpmSample[];
  mode: Mode;
  settings: TestSettings;
  seed: string;
  createdAt: string;
}

export type RankTitle =
  "Intern" | "Analyst" | "Associate" | "VP" | "Director" | "MD";

/** A rank and its inclusive minimum WPM threshold. */
export interface Rank {
  title: RankTitle;
  minWpm: number;
}

/** A typed unit of test content. */
export interface ContentItem {
  id: string;
  mode: Mode;
  text: string;
  difficulty: Difficulty;
  tags: readonly string[];
}

/** A replayable key event recorded relative to the start of a test. */
export interface KeystrokeLogEntry {
  key: string;
  offsetMs: number;
}
