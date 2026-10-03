import type { KeystrokeLog, KeystrokeLogEntry } from "@/types";

import { characterCount, toCharacters } from "./text";
import type { TestState } from "./types";

export interface WordStat {
  wordIndex: number;
  target: string;
  timeMs: number;
  wpm: number;
  correct: boolean;
  errors: number;
  typed: string;
}

export interface CharMistake {
  character: string;
  count: number;
  rate: number;
  typedInstead: readonly { character: string; count: number }[];
}

export interface SymbolAccuracy {
  letters: number;
  digits: number;
  symbols: number;
}

function isLetter(character: string): boolean {
  return /^[A-Za-z]$/.test(character);
}

function isDigit(character: string): boolean {
  return /^\d$/.test(character);
}

function safeWpm(characters: number, timeMs: number): number {
  if (characters <= 0 || timeMs <= 0) return 0;
  return Math.round((characters / 5 / (timeMs / 60_000)) * 100) / 100;
}

function getWordTimeline(
  state: TestState,
  log: KeystrokeLog,
): Map<number, { start: number; end: number }> {
  const timeline = new Map<number, { start: number; end: number }>();
  let wordIndex = 0;
  let typed = "";
  log.forEach((entry) => {
    if (entry.type === "char") {
      if (!timeline.has(wordIndex)) {
        timeline.set(wordIndex, { start: entry.t, end: entry.t });
      }
      const item = timeline.get(wordIndex);
      if (item) item.end = entry.t;
      typed += entry.char;
    } else if (entry.type === "backspace") {
      if (!timeline.has(wordIndex)) {
        timeline.set(wordIndex, { start: entry.t, end: entry.t });
      }
      const item = timeline.get(wordIndex);
      if (item) item.end = entry.t;
      typed = Array.from(typed).slice(0, -1).join("");
    } else if (entry.type === "deleteWord") {
      if (!timeline.has(wordIndex)) {
        timeline.set(wordIndex, { start: entry.t, end: entry.t });
      }
      const item = timeline.get(wordIndex);
      if (item) item.end = entry.t;
      typed = "";
    } else if (typed.length > 0) {
      const item = timeline.get(wordIndex);
      if (item) item.end = entry.t;
      wordIndex += 1;
      typed = "";
    }
  });
  if (state.currentWordIndex > wordIndex && typed.length > 0) {
    timeline.set(wordIndex, { start: 0, end: 0 });
  }
  return timeline;
}

function wordErrors(target: string, typed: string): number {
  const expected = toCharacters(target);
  const actual = toCharacters(typed);
  return (
    actual.reduce(
      (errors, char, index) => errors + (expected[index] === char ? 0 : 1),
      0,
    ) + Math.max(0, expected.length - actual.length)
  );
}

/** Analyze words without mutating the deterministic engine state. */
export function getWordStats(
  state: TestState,
  log: KeystrokeLog = state.keystrokeLog,
): WordStat[] {
  const timeline = getWordTimeline(state, log);
  return state.words.flatMap((word, wordIndex) => {
    const typed = word.typed;
    const timing = timeline.get(wordIndex);
    if (!timing && typed.length === 0) return [];
    const timeMs = timing ? Math.max(0, timing.end - timing.start) : 0;
    return [
      {
        wordIndex,
        target: word.target,
        timeMs,
        wpm: safeWpm(characterCount(word.target), timeMs),
        correct: typed === word.target,
        errors: wordErrors(word.target, typed),
        typed,
      },
    ];
  });
}

interface ReplayCursor {
  wordIndex: number;
  typed: string;
}

function replayLog(
  state: TestState,
  log: KeystrokeLog,
): { target: string; typed: string; entry: KeystrokeLogEntry }[] {
  const cursor: ReplayCursor = { wordIndex: 0, typed: "" };
  const output: { target: string; typed: string; entry: KeystrokeLogEntry }[] =
    [];
  log.forEach((entry) => {
    const target = state.words[cursor.wordIndex]?.target ?? "";
    if (entry.type === "char") {
      const expected =
        toCharacters(target)[Array.from(cursor.typed).length] ?? "";
      output.push({ target: expected, typed: entry.char, entry });
      cursor.typed += entry.char;
    } else if (entry.type === "backspace") {
      cursor.typed = Array.from(cursor.typed).slice(0, -1).join("");
    } else if (entry.type === "deleteWord") {
      cursor.typed = "";
    } else if (cursor.typed.length > 0) {
      cursor.wordIndex += 1;
      cursor.typed = "";
    }
  });
  return output;
}

/** Return the five intended characters mistyped most often. */
export function getCharMistakes(
  state: TestState,
  log: KeystrokeLog = state.keystrokeLog,
): CharMistake[] {
  const counts = new Map<
    string,
    { count: number; attempts: number; replacements: Map<string, number> }
  >();
  replayLog(state, log).forEach(({ target, typed }) => {
    if (!target) return;
    const item = counts.get(target) ?? {
      count: 0,
      attempts: 0,
      replacements: new Map<string, number>(),
    };
    item.attempts += 1;
    if (target !== typed) {
      item.count += 1;
      item.replacements.set(typed, (item.replacements.get(typed) ?? 0) + 1);
    }
    counts.set(target, item);
  });
  return [...counts.entries()]
    .filter(([, item]) => item.count > 0)
    .map(([character, item]) => ({
      character,
      count: item.count,
      rate:
        item.attempts > 0
          ? Math.round((item.count / item.attempts) * 10000) / 100
          : 0,
      typedInstead: [...item.replacements.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([replacement, count]) => ({ character: replacement, count })),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/** Accuracy by intended character family, with symbols visible as a family. */
export function getSymbolAccuracy(
  state: TestState,
  log: KeystrokeLog = state.keystrokeLog,
): SymbolAccuracy {
  const totals: Record<keyof SymbolAccuracy, [number, number]> = {
    letters: [0, 0],
    digits: [0, 0],
    symbols: [0, 0],
  };
  replayLog(state, log).forEach(({ target, typed }) => {
    const family = isLetter(target)
      ? "letters"
      : isDigit(target)
        ? "digits"
        : "symbols";
    totals[family][0] += 1;
    if (target === typed) totals[family][1] += 1;
  });
  return {
    letters: totals.letters[0]
      ? Math.round((totals.letters[1] / totals.letters[0]) * 1000) / 10
      : 0,
    digits: totals.digits[0]
      ? Math.round((totals.digits[1] / totals.digits[0]) * 1000) / 10
      : 0,
    symbols: totals.symbols[0]
      ? Math.round((totals.symbols[1] / totals.symbols[0]) * 1000) / 10
      : 0,
  };
}

export function getSlowestWords(
  state: TestState,
  log: KeystrokeLog = state.keystrokeLog,
): WordStat[] {
  return getWordStats(state, log)
    .filter((word) => characterCount(word.target) >= 3 && word.typed.length > 0)
    .sort((a, b) => a.wpm - b.wpm)
    .slice(0, 5);
}
