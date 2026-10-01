import type { KeystrokeLogEntry } from "@/types";

import {
  characterCount,
  isPrintableCharacter,
  removeLastCharacter,
  toCharacters,
} from "./text";
import type {
  EngineWordState,
  TestCounters,
  TestInput,
  TestState,
} from "./types";

const MAX_EXTRA_CHARACTERS = 10;

function replaceWord(
  words: readonly EngineWordState[],
  index: number,
  nextWord: EngineWordState,
): readonly EngineWordState[] {
  const nextWords = [...words];
  nextWords[index] = nextWord;
  return nextWords;
}

function normalizeTimestamp(state: TestState, timestampMs: number): number {
  const finiteTimestamp = Number.isFinite(timestampMs)
    ? timestampMs
    : (state.lastTimestampMs ?? 0);
  return Math.max(state.lastTimestampMs ?? finiteTimestamp, finiteTimestamp);
}

function appendLog(
  state: TestState,
  input: TestInput,
  timestampMs: number,
): readonly KeystrokeLogEntry[] {
  const startTimestampMs = state.startTimestampMs ?? timestampMs;
  const t = Math.max(0, Math.round(timestampMs - startTimestampMs));
  const entry: KeystrokeLogEntry =
    input.type === "char"
      ? { type: "char", char: input.char, t }
      : { type: input.type, t };
  return [...state.keystrokeLog, entry];
}

function accept(
  state: TestState,
  input: TestInput,
  timestampMs: number,
  changes: Partial<TestState> & { counters?: TestCounters },
): TestState {
  const startTimestampMs = state.startTimestampMs ?? timestampMs;
  const stateForLog = { ...state, startTimestampMs };
  return {
    ...state,
    ...changes,
    startTimestampMs,
    lastTimestampMs: timestampMs,
    status: changes.status ?? "running",
    keystrokeLog: appendLog(stateForLog, input, timestampMs),
  };
}

function applyCharacter(
  state: TestState,
  input: Extract<TestInput, { type: "char" }>,
  time: number,
): TestState {
  if (!isPrintableCharacter(input.char)) return state;

  const word = state.words[state.currentWordIndex];
  if (!word) return state;
  const targetCharacters = toCharacters(word.target);
  const typedLength = characterCount(word.typed);
  if (typedLength >= targetCharacters.length + MAX_EXTRA_CHARACTERS)
    return state;

  const isExtra = typedLength >= targetCharacters.length;
  const isCorrect = !isExtra && targetCharacters[typedLength] === input.char;
  const nextCounters: TestCounters = {
    ...state.counters,
    correctKeystrokes: state.counters.correctKeystrokes + (isCorrect ? 1 : 0),
    incorrectKeystrokes:
      state.counters.incorrectKeystrokes + (isCorrect ? 0 : 1),
    extraKeystrokes: state.counters.extraKeystrokes + (isExtra ? 1 : 0),
  };
  const nextWord = { ...word, typed: `${word.typed}${input.char}` };
  const shouldFinish =
    state.settings.length.type === "words" &&
    state.currentWordIndex === state.words.length - 1 &&
    characterCount(nextWord.typed) >= targetCharacters.length;

  return accept(state, input, time, {
    words: replaceWord(state.words, state.currentWordIndex, nextWord),
    counters: nextCounters,
    ...(shouldFinish
      ? { status: "finished" as const, endTimestampMs: time }
      : {}),
  });
}

function applySpace(state: TestState, time: number): TestState {
  const word = state.words[state.currentWordIndex];
  if (!word || word.typed.length === 0) return state;
  const fullyCorrect = word.typed === word.target;
  if (state.settings.stopOnError && !fullyCorrect) return state;

  const nextCounters: TestCounters = {
    ...state.counters,
    correctKeystrokes:
      state.counters.correctKeystrokes + (fullyCorrect ? 1 : 0),
    incorrectKeystrokes:
      state.counters.incorrectKeystrokes + (fullyCorrect ? 0 : 1),
  };
  const nextWords = replaceWord(state.words, state.currentWordIndex, {
    ...word,
    submitted: true,
  });
  const onFinalWord = state.currentWordIndex === state.words.length - 1;
  const shouldFinish = onFinalWord && state.settings.length.type === "words";

  return accept(state, { type: "space" }, time, {
    words: nextWords,
    counters: nextCounters,
    currentWordIndex: onFinalWord
      ? state.currentWordIndex
      : state.currentWordIndex + 1,
    ...(shouldFinish
      ? { status: "finished" as const, endTimestampMs: time }
      : {}),
  });
}

function previousIncorrectWordIndex(state: TestState): number | null {
  if (state.currentWordIndex === 0) return null;
  const previousIndex = state.currentWordIndex - 1;
  const previousWord = state.words[previousIndex];
  return previousWord && previousWord.typed !== previousWord.target
    ? previousIndex
    : null;
}

function applyBackspace(state: TestState, time: number): TestState {
  if (state.settings.confidenceMode) return state;
  const word = state.words[state.currentWordIndex];
  if (!word) return state;

  if (word.typed.length > 0) {
    return accept(state, { type: "backspace" }, time, {
      words: replaceWord(state.words, state.currentWordIndex, {
        ...word,
        typed: removeLastCharacter(word.typed),
      }),
      counters: {
        ...state.counters,
        backspaces: state.counters.backspaces + 1,
      },
    });
  }

  const previousIndex = previousIncorrectWordIndex(state);
  if (previousIndex === null) return state;
  const previousWord = state.words[previousIndex];
  if (!previousWord) return state;

  return accept(state, { type: "backspace" }, time, {
    words: replaceWord(state.words, previousIndex, {
      ...previousWord,
      submitted: false,
    }),
    currentWordIndex: previousIndex,
    counters: { ...state.counters, backspaces: state.counters.backspaces + 1 },
  });
}

function applyDeleteWord(state: TestState, time: number): TestState {
  if (state.settings.confidenceMode) return state;
  const word = state.words[state.currentWordIndex];
  if (!word) return state;

  if (word.typed.length > 0) {
    return accept(state, { type: "deleteWord" }, time, {
      words: replaceWord(state.words, state.currentWordIndex, {
        ...word,
        typed: "",
      }),
      counters: {
        ...state.counters,
        backspaces: state.counters.backspaces + 1,
      },
    });
  }

  const previousIndex = previousIncorrectWordIndex(state);
  if (previousIndex === null) return state;
  const previousWord = state.words[previousIndex];
  if (!previousWord) return state;

  return accept(state, { type: "deleteWord" }, time, {
    words: replaceWord(state.words, previousIndex, {
      ...previousWord,
      typed: "",
      submitted: false,
    }),
    currentWordIndex: previousIndex,
    counters: { ...state.counters, backspaces: state.counters.backspaces + 1 },
  });
}

/**
 * Apply one deterministic input action at an explicit timestamp. Ignored input
 * returns the original state reference and never enters the keystroke log.
 */
export function applyInput(
  state: TestState,
  input: TestInput,
  timestampMs: number,
): TestState {
  if (state.status === "finished") return state;
  if (state.status === "idle" && input.type !== "char") return state;

  const time = normalizeTimestamp(state, timestampMs);
  if (
    state.status === "running" &&
    state.startTimestampMs !== null &&
    state.settings.length.type === "time" &&
    time > state.startTimestampMs + state.settings.length.seconds * 1000
  ) {
    return state;
  }

  switch (input.type) {
    case "char":
      return applyCharacter(state, input, time);
    case "space":
      return applySpace(state, time);
    case "backspace":
      return applyBackspace(state, time);
    case "deleteWord":
      return applyDeleteWord(state, time);
  }
}

/**
 * Finish a running time test at its exact configured deadline. Calls before the
 * deadline, calls for word tests, and calls on idle/finished tests are ignored.
 */
export function finishTest(state: TestState, timestampMs: number): TestState {
  if (
    state.status !== "running" ||
    state.startTimestampMs === null ||
    state.settings.length.type !== "time"
  ) {
    return state;
  }

  const deadline =
    state.startTimestampMs + state.settings.length.seconds * 1000;
  if (timestampMs < deadline) return state;
  return {
    ...state,
    status: "finished",
    endTimestampMs: deadline,
    lastTimestampMs: deadline,
  };
}
