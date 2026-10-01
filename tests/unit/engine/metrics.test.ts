import { describe, expect, it } from "vitest";

import {
  applyInput,
  calculateConsistency,
  createTest,
  finishTest,
  getResult,
  replay,
} from "@/engine";

import { makeSettings } from "./helpers";

describe("typing metrics", () => {
  it("returns safe zero metrics and 100 accuracy for an untouched test", () => {
    const result = getResult(createTest(["alpha"], makeSettings()));
    expect(result).toMatchObject({
      wpm: 0,
      rawWpm: 0,
      accuracy: 100,
      consistency: 0,
      errors: 0,
      durationMs: 0,
    });
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
  });

  it("calculates an exact 50 net WPM perfect time test", () => {
    const words = [...Array.from({ length: 49 }, () => "word"), "words"];
    let state = createTest(words, makeSettings());
    let time = 0;
    words.forEach((word, wordIndex) => {
      for (const char of word) {
        state = applyInput(state, { type: "char", char }, time);
        time += 2;
      }
      if (wordIndex < words.length - 1) {
        state = applyInput(state, { type: "space" }, time);
        time += 2;
      }
    });
    state = finishTest(state, 60_000);
    const result = getResult(state);
    expect(result.wpm).toBe(50);
    expect(result.rawWpm).toBe(50);
    expect(result.accuracy).toBe(100);
  });

  it("keeps corrected mistakes in historical accuracy", () => {
    let state = createTest(["ab"], makeSettings());
    state = applyInput(state, { type: "char", char: "x" }, 0);
    state = applyInput(state, { type: "backspace" }, 100);
    state = applyInput(state, { type: "char", char: "a" }, 200);
    state = applyInput(state, { type: "char", char: "b" }, 300);
    expect(getResult(state, 1000).accuracy).toBe(66.67);
    expect(getResult(state, 1000).errors).toBe(1);
  });

  it("counts final character breakdown including missed and extra", () => {
    let state = createTest(["debt", "cash"], makeSettings());
    for (const char of "dexx!")
      state = applyInput(state, { type: "char", char }, 0);
    state = applyInput(state, { type: "space" }, 1);
    expect(getResult(state, 1000).characterBreakdown).toEqual({
      correct: 2,
      incorrect: 2,
      extra: 1,
      missed: 0,
    });
  });

  it("calculates documented consistency edge cases", () => {
    expect(calculateConsistency([])).toBe(0);
    expect(calculateConsistency([12])).toBe(0);
    expect(calculateConsistency([0, 0])).toBe(0);
    expect(calculateConsistency([24, 24, 24])).toBe(100);
    expect(calculateConsistency([0, 24])).toBe(0);
  });

  it("replays a varied live session to an identical result", () => {
    const settings = makeSettings({
      length: { type: "time", seconds: 15 },
      seed: "replay-proof",
    });
    const words = ["EBITDA", "$4.2B", "café", "MOIC"];
    let live = createTest(words, settings);
    const actions = [
      [{ type: "char", char: "E" }, 1234],
      [{ type: "char", char: "B" }, 1260],
      [{ type: "char", char: "X" }, 1280],
      [{ type: "backspace" }, 1290],
      [{ type: "char", char: "I" }, 1310],
      [{ type: "char", char: "T" }, 1330],
      [{ type: "char", char: "D" }, 1350],
      [{ type: "char", char: "A" }, 1370],
      [{ type: "space" }, 1400],
      [{ type: "char", char: "$" }, 1430],
      [{ type: "char", char: "4" }, 1450],
      [{ type: "char", char: "." }, 1470],
      [{ type: "char", char: "2" }, 1490],
      [{ type: "char", char: "B" }, 1510],
    ] as const;
    actions.forEach(([input, timestamp]) => {
      live = applyInput(live, input, timestamp);
    });
    live = finishTest(live, 20_000);

    expect(replay(words, settings, live.keystrokeLog)).toEqual(getResult(live));
  });
});
