import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_TEST_LENGTH_KEY,
  parseTestLength,
  persistTestLength,
  readTestLength,
  TEST_LENGTH_STORAGE_KEY,
} from "@/store";

describe("test length persistence", () => {
  it("parses time and word keys into discriminated settings", () => {
    expect(parseTestLength("time:15")).toEqual({ type: "time", seconds: 15 });
    expect(parseTestLength("words:100")).toEqual({ type: "words", words: 100 });
  });

  it("reads valid values and rejects invalid persisted data", () => {
    expect(readTestLength({ getItem: () => "words:50" })).toBe("words:50");
    expect(readTestLength({ getItem: () => "broken" })).toBe(
      DEFAULT_TEST_LENGTH_KEY,
    );
  });

  it("survives blocked storage reads and writes", () => {
    expect(
      readTestLength({
        getItem: () => {
          throw new DOMException("blocked");
        },
      }),
    ).toBe(DEFAULT_TEST_LENGTH_KEY);
    expect(() =>
      persistTestLength("time:60", {
        setItem: () => {
          throw new DOMException("blocked");
        },
      }),
    ).not.toThrow();
  });

  it("writes the compact key under the stable storage name", () => {
    const setItem = vi.fn();
    persistTestLength("words:25", { setItem });
    expect(setItem).toHaveBeenCalledWith(TEST_LENGTH_STORAGE_KEY, "words:25");
  });
});
