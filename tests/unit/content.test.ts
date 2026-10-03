import { describe, expect, it } from "vitest";

import { CONTENT_POOLS, CONTENT_VERSION, getModeWords } from "@/content";

describe("content v3", () => {
  it("ships the required pool sizes", () => {
    expect(CONTENT_VERSION).toBe(3);
    expect(CONTENT_POOLS.terms.length).toBeGreaterThanOrEqual(1800);
    expect(CONTENT_POOLS.office.length).toBeGreaterThanOrEqual(900);
    expect(CONTENT_POOLS.excel.length).toBeGreaterThanOrEqual(300);
  });

  it("is mostly real single-token finance vocabulary", () => {
    const hyphenated = CONTENT_POOLS.terms.filter((item) =>
      item.text.includes("-"),
    );
    expect(hyphenated.length / CONTENT_POOLS.terms.length).toBeLessThan(0.15);
    expect(
      ["revenue", "earnings", "cashflow", "liquidity", "guidance"].every(
        (term) => CONTENT_POOLS.terms.some((item) => item.text === term),
      ),
    ).toBe(true);
  });

  it("is deterministic and does not repeat a 120 second test", () => {
    for (const mode of ["terms", "office", "mixed"] as const) {
      const first = getModeWords(mode, 650, "content-golden");
      expect(first).toEqual(getModeWords(mode, 650, "content-golden"));
      expect(new Set(first).size).toBe(first.length);
      expect(first.every((item) => !/\s/u.test(item))).toBe(true);
    }
  });

  it("keeps v1 output available for old seeds", () => {
    expect(
      getModeWords("terms", 8, "legacy-seed", "medium", { contentVersion: 1 }),
    ).toEqual(
      getModeWords("terms", 8, "legacy-seed", "medium", { contentVersion: 1 }),
    );
  });

  it("emits balanced printable Excel formulas", () => {
    const formulas = getModeWords("excel", 300, "formula-seed");
    expect(
      formulas.every((formula) => {
        let parentheses = 0;
        for (const character of formula) {
          if (character === "(") parentheses += 1;
          if (character === ")") parentheses -= 1;
          if (parentheses < 0) return false;
        }
        return parentheses === 0 && /^[\x20-\x7E]+$/u.test(formula);
      }),
    ).toBe(true);
  });
});
