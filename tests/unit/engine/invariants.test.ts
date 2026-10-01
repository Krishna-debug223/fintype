import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { applyInput, createRng, createTest } from "@/engine";
import type { TestInput } from "@/engine";

import { makeSettings } from "./helpers";

describe("engine invariants", () => {
  it("survives deterministic fuzzed input without invalid state", () => {
    const rng = createRng("fuzz-session");
    const inputs: readonly TestInput[] = [
      { type: "char", char: "a" },
      { type: "char", char: "$" },
      { type: "char", char: "😀" },
      { type: "space" },
      { type: "backspace" },
      { type: "deleteWord" },
    ];

    for (let session = 0; session < 25; session += 1) {
      let state = createTest(
        ["alpha", "$4.2B", "café", "MOIC"],
        makeSettings({ seed: `fuzz-${session}` }),
      );
      for (let step = 0; step < 250; step += 1) {
        const input = rng.pick(inputs);
        expect(() => {
          state = applyInput(state, input, step * 7);
        }).not.toThrow();
        expect(state.currentWordIndex).toBeGreaterThanOrEqual(0);
        expect(state.currentWordIndex).toBeLessThan(state.words.length);
        expect(state.counters.correctKeystrokes).toBeGreaterThanOrEqual(0);
        expect(state.counters.incorrectKeystrokes).toBeGreaterThanOrEqual(0);
        expect(state.counters.extraKeystrokes).toBeGreaterThanOrEqual(0);
        expect(state.counters.backspaces).toBeGreaterThanOrEqual(0);
        state.words.forEach((word) => {
          expect(Array.from(word.typed).length).toBeLessThanOrEqual(
            Array.from(word.target).length + 10,
          );
        });
      }
    }
  });

  it("contains no framework, DOM, clock, timer, or unseeded-random dependencies", () => {
    const engineDirectory = join(process.cwd(), "src", "engine");
    const source = readdirSync(engineDirectory)
      .filter((file) => file.endsWith(".ts"))
      .map((file) => readFileSync(join(engineDirectory, file), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/from\s+["'](?:react|next|zustand)/u);
    expect(source).not.toMatch(
      /\b(?:window|document|performance|setInterval)\b/u,
    );
    expect(source).not.toMatch(/\bDate\.now\s*\(/u);
    expect(source).not.toMatch(/\bMath\.random\s*\(/u);
  });
});
