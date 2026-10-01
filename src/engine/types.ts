import type { KeystrokeLog, TestSettings } from "@/types";

export type TestStatus = "idle" | "running" | "finished";

export type TestInput =
  | { type: "char"; char: string }
  | { type: "space" | "backspace" | "deleteWord" };

export interface EngineWordState {
  readonly target: string;
  readonly typed: string;
  readonly submitted: boolean;
}

export interface TestCounters {
  readonly correctKeystrokes: number;
  readonly incorrectKeystrokes: number;
  readonly extraKeystrokes: number;
  readonly backspaces: number;
}

export interface TestState {
  readonly words: readonly EngineWordState[];
  readonly currentWordIndex: number;
  readonly status: TestStatus;
  readonly startTimestampMs: number | null;
  readonly endTimestampMs: number | null;
  readonly lastTimestampMs: number | null;
  readonly settings: Readonly<TestSettings>;
  readonly keystrokeLog: KeystrokeLog;
  readonly counters: TestCounters;
}

export interface SeededRng {
  next: () => number;
  nextInt: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
}
