import { describe, expect, it } from "vitest";

import { getNextRank, getRank } from "@/types";

describe("getRank", () => {
  it.each([
    [-10, "Intern"],
    [0, "Intern"],
    [29.99, "Intern"],
    [30, "Analyst"],
    [45, "Associate"],
    [60, "VP"],
    [75, "Director"],
    [90, "MD"],
    [140, "MD"],
  ] as const)("maps %s WPM to %s", (wpm, expectedTitle) => {
    expect(getRank(wpm).title).toBe(expectedTitle);
  });

  it("treats non-finite values as zero", () => {
    expect(getRank(Number.NaN).title).toBe("Intern");
  });
});

describe("getNextRank", () => {
  it("returns the next threshold above the current rank", () => {
    expect(getNextRank(44)).toEqual({ title: "Associate", minWpm: 45 });
    expect(getNextRank(75)).toEqual({ title: "MD", minWpm: 90 });
  });

  it("returns null at the highest rank", () => {
    expect(getNextRank(90)).toBeNull();
    expect(getNextRank(130)).toBeNull();
  });
});
