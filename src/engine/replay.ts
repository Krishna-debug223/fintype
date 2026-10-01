import type { KeystrokeLog, TestResult, TestSettings } from "@/types";

import { applyInput, finishTest } from "./input";
import { getResult } from "./metrics";
import { createTest } from "./state";
import type { TestInput } from "./types";

function toInput(entry: KeystrokeLog[number]): TestInput {
  return entry.type === "char"
    ? { type: "char", char: entry.char }
    : { type: entry.type };
}

/**
 * Recreate a result by feeding a compact relative-time log through the same
 * reducer used by the live client. Time tests finish at their configured deadline.
 */
export function replay(
  words: readonly string[],
  settings: TestSettings,
  keystrokeLog: KeystrokeLog,
): TestResult {
  let state = createTest(words, settings);
  keystrokeLog.forEach((entry) => {
    state = applyInput(state, toInput(entry), entry.t);
  });

  if (
    state.status === "running" &&
    state.startTimestampMs !== null &&
    settings.length.type === "time"
  ) {
    state = finishTest(
      state,
      state.startTimestampMs + settings.length.seconds * 1000,
    );
  }
  return getResult(state);
}
