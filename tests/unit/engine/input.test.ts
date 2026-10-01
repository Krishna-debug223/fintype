import { describe, expect, it } from "vitest";

import {
  applyInput,
  createTest,
  finishTest,
  getWordCharStates,
} from "@/engine";

import { makeSettings } from "./helpers";

describe("typing input rules", () => {
  it("does not start the timer for space, backspace, or deleteWord", () => {
    const initial = createTest(["alpha"], makeSettings());
    expect(applyInput(initial, { type: "space" }, 10)).toBe(initial);
    expect(applyInput(initial, { type: "backspace" }, 20)).toBe(initial);
    expect(applyInput(initial, { type: "deleteWord" }, 30)).toBe(initial);
    expect(initial.startTimestampMs).toBeNull();
    expect(initial.keystrokeLog).toHaveLength(0);
  });

  it("starts on the first accepted char and classifies correct, incorrect, and extra", () => {
    let state = createTest(["ab"], makeSettings());
    state = applyInput(state, { type: "char", char: "a" }, 101.4);
    state = applyInput(state, { type: "char", char: "x" }, 111.8);
    state = applyInput(state, { type: "char", char: "!" }, 122.2);

    expect(state.status).toBe("running");
    expect(state.startTimestampMs).toBe(101.4);
    expect(state.words[0]?.typed).toBe("ax!");
    expect(getWordCharStates(state.words[0]!)).toEqual([
      "correct",
      "incorrect",
      "extra",
    ]);
    expect(state.counters).toMatchObject({
      correctKeystrokes: 1,
      incorrectKeystrokes: 2,
      extraKeystrokes: 1,
    });
    expect(state.keystrokeLog).toEqual([
      { type: "char", char: "a", t: 0 },
      { type: "char", char: "x", t: 10 },
      { type: "char", char: "!", t: 21 },
    ]);
  });

  it("caps extras at ten and does not log ignored characters", () => {
    let state = createTest(["a"], makeSettings());
    state = applyInput(state, { type: "char", char: "a" }, 0);
    for (let index = 0; index < 12; index += 1) {
      state = applyInput(state, { type: "char", char: "x" }, index + 1);
    }
    expect(Array.from(state.words[0]!.typed)).toHaveLength(11);
    expect(state.counters.extraKeystrokes).toBe(10);
    expect(state.keystrokeLog).toHaveLength(11);
  });

  it("ignores empty space and marks an incomplete submitted remainder missed", () => {
    let state = createTest(["cashflow", "debt"], makeSettings());
    expect(applyInput(state, { type: "space" }, 0)).toBe(state);
    for (const char of "cash")
      state = applyInput(state, { type: "char", char }, 10);
    state = applyInput(state, { type: "space" }, 20);
    expect(state.currentWordIndex).toBe(1);
    expect(getWordCharStates(state.words[0]!)).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "missed",
      "missed",
      "missed",
      "missed",
    ]);
    expect(state.counters.incorrectKeystrokes).toBe(1);
  });

  it("moves back into an incorrect previous word but not a correct one", () => {
    let incorrect = createTest(["cat", "dog"], makeSettings());
    for (const char of "cxt")
      incorrect = applyInput(incorrect, { type: "char", char }, 1);
    incorrect = applyInput(incorrect, { type: "space" }, 2);
    incorrect = applyInput(incorrect, { type: "backspace" }, 3);
    expect(incorrect.currentWordIndex).toBe(0);
    expect(incorrect.words[0]?.submitted).toBe(false);

    let correct = createTest(["cat", "dog"], makeSettings());
    for (const char of "cat")
      correct = applyInput(correct, { type: "char", char }, 1);
    correct = applyInput(correct, { type: "space" }, 2);
    const afterSpace = correct;
    correct = applyInput(correct, { type: "backspace" }, 3);
    expect(correct).toBe(afterSpace);
    expect(correct.currentWordIndex).toBe(1);
  });

  it("deleteWord clears the current word or moves back and clears an incorrect word", () => {
    let state = createTest(["cat", "dog"], makeSettings());
    for (const char of "cxt")
      state = applyInput(state, { type: "char", char }, 1);
    state = applyInput(state, { type: "deleteWord" }, 2);
    expect(state.words[0]?.typed).toBe("");

    for (const char of "cx")
      state = applyInput(state, { type: "char", char }, 3);
    state = applyInput(state, { type: "space" }, 4);
    state = applyInput(state, { type: "deleteWord" }, 5);
    expect(state.currentWordIndex).toBe(0);
    expect(state.words[0]?.typed).toBe("");
    expect(state.counters.backspaces).toBe(2);
  });

  it("disables both correction actions in confidence mode", () => {
    let state = createTest(["alpha"], makeSettings({ confidenceMode: true }));
    state = applyInput(state, { type: "char", char: "x" }, 0);
    const typed = state;
    expect(applyInput(state, { type: "backspace" }, 1)).toBe(typed);
    expect(applyInput(state, { type: "deleteWord" }, 2)).toBe(typed);
  });

  it("blocks advancing from an incorrect word in stopOnError mode", () => {
    let state = createTest(["cat", "dog"], makeSettings({ stopOnError: true }));
    state = applyInput(state, { type: "char", char: "x" }, 0);
    const beforeSpace = state;
    state = applyInput(state, { type: "space" }, 1);
    expect(state).toBe(beforeSpace);
    expect(state.keystrokeLog).toHaveLength(1);
  });

  it("auto-finishes word tests on the final full-length char or final space", () => {
    let full = createTest(
      ["a", "bc"],
      makeSettings({ length: { type: "words", words: 25 } }),
    );
    full = applyInput(full, { type: "char", char: "a" }, 0);
    full = applyInput(full, { type: "space" }, 10);
    full = applyInput(full, { type: "char", char: "b" }, 20);
    full = applyInput(full, { type: "char", char: "c" }, 30);
    expect(full.status).toBe("finished");
    expect(full.endTimestampMs).toBe(30);

    let skipped = createTest(
      ["alpha"],
      makeSettings({ length: { type: "words", words: 25 } }),
    );
    skipped = applyInput(skipped, { type: "char", char: "a" }, 0);
    skipped = applyInput(skipped, { type: "space" }, 20);
    expect(skipped.status).toBe("finished");
    expect(skipped.words[0]?.submitted).toBe(true);
  });

  it("ignores late time-test input and all input after finish", () => {
    let state = createTest(
      ["alpha"],
      makeSettings({ length: { type: "time", seconds: 15 } }),
    );
    state = applyInput(state, { type: "char", char: "a" }, 100);
    const running = state;
    expect(applyInput(state, { type: "char", char: "l" }, 15_101)).toBe(
      running,
    );
    expect(finishTest(state, 15_099)).toBe(state);
    state = finishTest(state, 99_000);
    expect(state.endTimestampMs).toBe(15_100);
    expect(applyInput(state, { type: "char", char: "l" }, 15_100)).toBe(state);
  });

  it("preserves unchanged word object references", () => {
    const initial = createTest(["one", "two", "three"], makeSettings());
    const next = applyInput(initial, { type: "char", char: "o" }, 0);
    expect(next.words).not.toBe(initial.words);
    expect(next.words[0]).not.toBe(initial.words[0]);
    expect(next.words[1]).toBe(initial.words[1]);
    expect(next.words[2]).toBe(initial.words[2]);
  });

  it("compares finance punctuation and Unicode code points safely", () => {
    const target = "$%()=\":!@#&*+-/.,;'[]é😀";
    let state = createTest([target], makeSettings());
    for (const char of Array.from(target)) {
      state = applyInput(state, { type: "char", char }, 1);
    }
    expect(state.words[0]?.typed).toBe(target);
    expect(
      getWordCharStates(state.words[0]!).every((item) => item === "correct"),
    ).toBe(true);
    expect(state.counters.incorrectKeystrokes).toBe(0);
  });
});
