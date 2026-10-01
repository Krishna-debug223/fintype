import { describe, expect, it } from "vitest";

import { createRng } from "@/engine";

describe("createRng", () => {
  it("returns the same sequence for the same string seed", () => {
    const first = createRng("daily-2026-10-01");
    const second = createRng("daily-2026-10-01");
    expect(Array.from({ length: 8 }, () => first.next())).toEqual(
      Array.from({ length: 8 }, () => second.next()),
    );
  });

  it("produces different sequences for different seeds", () => {
    const first = createRng("alpha");
    const second = createRng("beta");
    expect(Array.from({ length: 5 }, () => first.next())).not.toEqual(
      Array.from({ length: 5 }, () => second.next()),
    );
  });

  it("supports bounded integers, picks, and non-mutating shuffles", () => {
    const rng = createRng(42);
    const source = ["a", "b", "c", "d"] as const;
    expect(
      Array.from({ length: 20 }, () => rng.nextInt(2, 5)).every(
        (value) => value >= 2 && value < 5,
      ),
    ).toBe(true);
    expect(source).toContain(rng.pick(source));
    expect(rng.shuffle(source).sort()).toEqual([...source].sort());
    expect(source).toEqual(["a", "b", "c", "d"]);
  });

  it("rejects invalid ranges and empty picks", () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(4, 4)).toThrow(RangeError);
    expect(() => rng.pick([])).toThrow(RangeError);
  });
});
