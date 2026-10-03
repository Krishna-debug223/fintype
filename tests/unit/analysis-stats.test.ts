import { describe, expect, it } from "vitest";

import {
  applyInput,
  createTest,
  getCharMistakes,
  getSymbolAccuracy,
  getWordStats,
} from "@/engine";
import { getActiveStreak, getBestPerBucket } from "@/lib/stats";
import type { SavedTest, TestSettings } from "@/types";

const settings: TestSettings = {
  mode: "terms",
  length: { type: "words", words: 25 },
  punctuation: true,
  numbers: true,
  difficulty: "medium",
  stopOnError: false,
  confidenceMode: false,
  theme: "dark",
  fontSize: "medium",
  caretStyle: "line",
  seed: "analysis",
};

function sampleState() {
  let state = createTest(["A1$"], settings);
  state = applyInput(state, { type: "char", char: "a" }, 100);
  state = applyInput(state, { type: "char", char: "1" }, 200);
  state = applyInput(state, { type: "char", char: "!" }, 300);
  return state;
}

function saved(createdAt: string, wpm: number): SavedTest {
  return {
    id: createdAt,
    createdAt,
    mode: "terms",
    difficulty: "medium",
    length: { type: "time", seconds: 60 },
    settings: {
      punctuation: true,
      numbers: true,
      stopOnError: false,
      confidenceMode: false,
    },
    seed: createdAt,
    wpm,
    rawWpm: wpm,
    accuracy: 100,
    consistency: 90,
    errors: 0,
    characterBreakdown: { correct: 1, incorrect: 0, extra: 0, missed: 0 },
    durationMs: 60_000,
    wpmPerSecond: [],
    rank: "Intern",
    isPersonalBest: false,
    eligibleForLeaderboard: true,
    synced: false,
    schemaVersion: 2,
    retryOfTestId: null,
  };
}

describe("engine analysis", () => {
  it("returns finite word and character-family analysis", () => {
    const state = sampleState();
    const words = getWordStats(state);
    expect(words[0]?.typed).toBe("a1!");
    expect(getCharMistakes(state)[0]?.character).toBe("A");
    expect(getSymbolAccuracy(state)).toEqual({
      letters: 0,
      digits: 100,
      symbols: 0,
    });
    expect(getWordStats(createTest(["empty-check"], settings))).toEqual([]);
  });
});

describe("stats", () => {
  it("finds bucket bests and local qualifying streaks", () => {
    const tests = [
      saved("2026-01-01T12:00:00.000Z", 40),
      saved("2026-01-02T12:00:00.000Z", 55),
    ];
    expect(getBestPerBucket(tests)[0]?.wpm).toBe(55);
    const streak = getActiveStreak(tests, new Date("2026-01-02T18:00:00.000Z"));
    expect(streak.current).toBe(2);
    expect(streak.longest).toBe(2);
  });
});
