"use client";

import { create } from "zustand";

import type { TestLength, TestResult } from "@/types";
import type { TestStatus } from "@/engine";

export type TestLengthKey =
  | "time:15"
  | "time:30"
  | "time:60"
  | "time:120"
  | "words:25"
  | "words:50"
  | "words:100";

export const TEST_LENGTH_STORAGE_KEY = "fintype-test-length";
export const DEFAULT_TEST_LENGTH_KEY: TestLengthKey = "time:30";

const VALID_LENGTH_KEYS: readonly TestLengthKey[] = [
  "time:15",
  "time:30",
  "time:60",
  "time:120",
  "words:25",
  "words:50",
  "words:100",
];

interface TestSessionStore {
  settings: {
    mode: "terms";
    lengthKey: TestLengthKey;
  };
  hydrated: boolean;
  uiStatus: TestStatus;
  result: TestResult | null;
  hydrate: () => void;
  setLengthKey: (length: TestLengthKey) => void;
  setSession: (status: TestStatus, result: TestResult | null) => void;
}

/** Return true when a persisted value is a supported test length. */
export function isTestLengthKey(value: unknown): value is TestLengthKey {
  return (
    typeof value === "string" && VALID_LENGTH_KEYS.some((key) => key === value)
  );
}

/** Convert the compact persisted key into the shared discriminated union. */
export function parseTestLength(key: TestLengthKey): TestLength {
  const [type, rawValue] = key.split(":") as ["time" | "words", string];
  const value = Number(rawValue);
  return type === "time"
    ? { type: "time", seconds: value as 15 | 30 | 60 | 120 }
    : { type: "words", words: value as 25 | 50 | 100 };
}

/** Read a saved length safely, falling back when storage is blocked or invalid. */
export function readTestLength(
  storage: Pick<Storage, "getItem">,
): TestLengthKey {
  try {
    const saved = storage.getItem(TEST_LENGTH_STORAGE_KEY);
    return isTestLengthKey(saved) ? saved : DEFAULT_TEST_LENGTH_KEY;
  } catch {
    return DEFAULT_TEST_LENGTH_KEY;
  }
}

/** Persist a selected length without allowing storage failures to interrupt play. */
export function persistTestLength(
  key: TestLengthKey,
  storage: Pick<Storage, "setItem">,
): void {
  try {
    storage.setItem(TEST_LENGTH_STORAGE_KEY, key);
  } catch {
    // Privacy modes can deny storage; the in-memory selection still works.
  }
}

export const useTestSessionStore = create<TestSessionStore>((set) => ({
  settings: { mode: "terms", lengthKey: DEFAULT_TEST_LENGTH_KEY },
  hydrated: false,
  uiStatus: "idle",
  result: null,
  hydrate: () => {
    const lengthKey = readTestLength(window.localStorage);
    set({
      settings: { mode: "terms", lengthKey },
      hydrated: true,
    });
  },
  setLengthKey: (lengthKey) => {
    persistTestLength(lengthKey, window.localStorage);
    set({ settings: { mode: "terms", lengthKey } });
  },
  setSession: (uiStatus, result) => set({ uiStatus, result }),
}));
