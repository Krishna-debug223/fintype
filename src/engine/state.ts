import type { TestSettings } from "@/types";

import type { TestState } from "./types";

/**
 * Create an idle deterministic test from non-empty target words and a complete
 * settings snapshot. No timer starts until the first accepted character.
 */
export function createTest(
  words: readonly string[],
  settings: TestSettings,
): TestState {
  if (
    words.length === 0 ||
    words.some((word) => word.length === 0 || /\s/u.test(word))
  ) {
    throw new RangeError(
      "A test requires non-empty target words without whitespace",
    );
  }

  return {
    words: words.map((target) => ({ target, typed: "", submitted: false })),
    currentWordIndex: 0,
    status: "idle",
    startTimestampMs: null,
    endTimestampMs: null,
    lastTimestampMs: null,
    settings: { ...settings, length: { ...settings.length } },
    keystrokeLog: [],
    counters: {
      correctKeystrokes: 0,
      incorrectKeystrokes: 0,
      extraKeystrokes: 0,
      backspaces: 0,
    },
  };
}
