import type { SeededRng } from "./types";

function hashSeed(seed: string | number): number {
  if (typeof seed === "number") return seed >>> 0;

  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Create a deterministic Mulberry32 random source. `nextInt` uses an inclusive
 * minimum and exclusive maximum, `pick` rejects empty collections, and
 * `shuffle` returns a new array without mutating its input.
 */
export function createRng(seed: string | number): SeededRng {
  let state = hashSeed(seed);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max <= min) {
      throw new RangeError(
        "nextInt requires integer bounds where max is greater than min",
      );
    }
    return Math.floor(next() * (max - min)) + min;
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0)
      throw new RangeError("Cannot pick from an empty collection");
    const item = items[nextInt(0, items.length)];
    if (item === undefined)
      throw new RangeError("Random selection was out of bounds");
    return item;
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = nextInt(0, index + 1);
      const value = shuffled[index];
      shuffled[index] = shuffled[swapIndex] as T;
      shuffled[swapIndex] = value as T;
    }
    return shuffled;
  };

  return { next, nextInt, pick, shuffle };
}
