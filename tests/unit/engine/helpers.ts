import type { TestSettings } from "@/types";

export function makeSettings(
  overrides: Partial<TestSettings> = {},
): TestSettings {
  return {
    mode: "terms",
    length: { type: "time", seconds: 60 },
    punctuation: true,
    numbers: true,
    difficulty: "medium",
    stopOnError: false,
    confidenceMode: false,
    theme: "dark",
    fontSize: "medium",
    caretStyle: "line",
    seed: "engine-test",
    ...overrides,
  };
}
