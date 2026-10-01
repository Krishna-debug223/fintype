import type { CharacterBreakdown, TestResult, WpmSample } from "@/types";

import { getWordCharStates } from "./char-states";
import { applyInput } from "./input";
import { createTest } from "./state";
import { characterCount, toCharacters } from "./text";
import type { TestInput, TestState } from "./types";

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveDuration(state: TestState, timestampMs?: number): number {
  if (state.startTimestampMs === null) return 0;
  if (state.status === "finished" && state.endTimestampMs !== null) {
    return Math.max(0, state.endTimestampMs - state.startTimestampMs);
  }

  const lastTimestamp = timestampMs ?? state.lastTimestampMs;
  if (lastTimestamp === null) return 0;
  const elapsed = Math.max(0, lastTimestamp - state.startTimestampMs);
  return state.settings.length.type === "time"
    ? Math.min(elapsed, state.settings.length.seconds * 1000)
    : elapsed;
}

function countNetCharacters(state: TestState): number {
  let correctCharacters = 0;

  state.words.forEach((word, index) => {
    const completed = word.submitted || index < state.currentWordIndex;
    if (completed) {
      if (word.typed === word.target)
        correctCharacters += characterCount(word.target) + 1;
      return;
    }

    if (index === state.currentWordIndex) {
      const target = toCharacters(word.target);
      const typed = toCharacters(word.typed);
      correctCharacters += typed.reduce(
        (total, character, characterIndex) =>
          total + (target[characterIndex] === character ? 1 : 0),
        0,
      );
    }
  });

  return correctCharacters;
}

function countRawCharacters(state: TestState): number {
  return state.keystrokeLog.reduce(
    (total, entry) =>
      total + (entry.type === "char" || entry.type === "space" ? 1 : 0),
    0,
  );
}

function calculateRate(characterTotal: number, durationMs: number): number {
  if (durationMs <= 0 || characterTotal <= 0) return 0;
  return round(characterTotal / 5 / (durationMs / 60_000));
}

function toInput(entry: TestState["keystrokeLog"][number]): TestInput {
  return entry.type === "char"
    ? { type: "char", char: entry.char }
    : { type: entry.type };
}

/** Count final correct, incorrect, extra, and missed characters from word state. */
export function getCharacterBreakdown(state: TestState): CharacterBreakdown {
  const breakdown: CharacterBreakdown = {
    correct: 0,
    incorrect: 0,
    extra: 0,
    missed: 0,
  };
  state.words.forEach((word) => {
    getWordCharStates(word).forEach((charState) => {
      if (charState !== "untyped") breakdown[charState] += 1;
    });
  });
  return breakdown;
}

/**
 * Calculate consistency from per-second raw WPM. It is `100 - CV*100`, where
 * CV is population standard deviation divided by the mean, clamped to 0–100
 * and rounded to a whole number. Fewer than two samples or a zero mean returns 0.
 */
export function calculateConsistency(samples: readonly number[]): number {
  if (samples.length < 2) return 0;
  const mean =
    samples.reduce((total, sample) => total + sample, 0) / samples.length;
  if (mean === 0) return 0;
  const variance =
    samples.reduce((total, sample) => total + (sample - mean) ** 2, 0) /
    samples.length;
  return Math.round(clamp(100 - (Math.sqrt(variance) / mean) * 100, 0, 100));
}

/** Build cumulative net and per-bin raw WPM/error samples from the replay log. */
export function getPerSecondSeries(
  state: TestState,
  durationMs: number,
): readonly WpmSample[] {
  if (durationMs <= 0 || state.startTimestampMs === null) return [];
  const sampleCount = Math.ceil(durationMs / 1000);
  let replayState = createTest(
    state.words.map((word) => word.target),
    state.settings,
  );
  let logIndex = 0;
  const series: WpmSample[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const second = sampleIndex + 1;
    const binStart = sampleIndex * 1000;
    const binEnd = Math.min(second * 1000, durationMs);
    let rawCharacters = 0;
    let errors = 0;

    while (logIndex < state.keystrokeLog.length) {
      const entry = state.keystrokeLog[logIndex];
      if (!entry) break;
      const belongsToBin =
        entry.t < binEnd || (binEnd === durationMs && entry.t <= binEnd);
      if (!belongsToBin) break;

      const incorrectBefore = replayState.counters.incorrectKeystrokes;
      replayState = applyInput(replayState, toInput(entry), entry.t);
      if (entry.type === "char" || entry.type === "space") rawCharacters += 1;
      errors += replayState.counters.incorrectKeystrokes - incorrectBefore;
      logIndex += 1;
    }

    const binDuration = Math.max(1, binEnd - binStart);
    series.push({
      second,
      wpm: calculateRate(countNetCharacters(replayState), binEnd),
      rawWpm: calculateRate(rawCharacters, binDuration),
      errors,
    });
  }

  return series;
}

/**
 * Calculate a complete serializable result. An optional timestamp produces live
 * rates without mutating state; final results use the state's exact end time.
 */
export function getResult(state: TestState, timestampMs?: number): TestResult {
  const durationMs = resolveDuration(state, timestampMs);
  const denominator =
    state.counters.correctKeystrokes + state.counters.incorrectKeystrokes;
  const accuracy =
    denominator === 0
      ? 100
      : round((state.counters.correctKeystrokes / denominator) * 100);
  const wpmPerSecond = getPerSecondSeries(state, durationMs);

  return {
    wpm: calculateRate(countNetCharacters(state), durationMs),
    rawWpm: calculateRate(countRawCharacters(state), durationMs),
    accuracy,
    consistency: calculateConsistency(
      wpmPerSecond.map((sample) => sample.rawWpm),
    ),
    errors: state.counters.incorrectKeystrokes,
    characterBreakdown: getCharacterBreakdown(state),
    durationMs,
    wpmPerSecond,
    mode: state.settings.mode,
    settings: state.settings,
    seed: state.settings.seed,
    createdAt: null,
  };
}
