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
export type FontSize = "small" | "medium" | "large" | "xl";
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
  /** Stable identifier used to regenerate this test's content. */
  seed: string;
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
  errors: number;
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
  /** Wall-clock metadata is attached by the persistence layer in a later stage. */
  createdAt: string | null;
}

/** A completed test retained by the local repository. */
export interface SavedTest {
  id: string;
  createdAt: string;
  mode: Mode;
  difficulty: Difficulty;
  length: TestLength;
  settings: Pick<
    TestSettings,
    "punctuation" | "numbers" | "stopOnError" | "confidenceMode"
  >;
  seed: string;
  wpm: number;
  rawWpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  characterBreakdown: CharacterBreakdown;
  durationMs: number;
  wpmPerSecond: readonly WpmSample[];
  rank: RankTitle;
  isPersonalBest: boolean;
  eligibleForLeaderboard: boolean;
  keystrokeLog?: KeystrokeLog;
  synced: boolean;
  schemaVersion: number;
  retryOfTestId: string | null;
}

export interface UserSettings {
  theme: Theme;
  fontSize: FontSize;
  caretStyle: CaretStyle;
  smoothCaret: boolean;
  showLiveWpm: boolean;
  showLiveAccuracy: boolean;
  showTimer: boolean;
  defaultMode: Mode;
  defaultLength: TestLength;
  difficulty: Difficulty;
  punctuation: boolean;
  numbers: boolean;
  stopOnError: boolean;
  confidenceMode: boolean;
  quickRestartKey: "tab-enter" | "escape";
  blindMode: boolean;
  reducedMotion: "system" | "on" | "off";
  highContrast: boolean;
  largerCaret: boolean;
}

export interface LocalProfile {
  localId: string;
  createdAt: string;
  totalTests: number;
  totalTimeMs: number;
}

export interface PersonalBest {
  testId: string;
  wpm: number;
  accuracy: number;
  createdAt: string;
}

export type PersonalBests = Readonly<Record<string, PersonalBest>>;

export interface DailyRecord {
  date: string;
  wpm: number;
  accuracy: number;
  testId: string;
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

/** A compact replayable key event recorded relative to the test start. */
export type KeystrokeLogEntry =
  | { type: "char"; char: string; t: number }
  | { type: "space" | "backspace" | "deleteWord"; t: number };

export type KeystrokeLog = readonly KeystrokeLogEntry[];
