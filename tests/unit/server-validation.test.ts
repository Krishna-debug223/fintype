import { getModeWords, getDailySeed } from "@/content";
import { createTest, getResult, replay } from "@/engine";
import type { KeystrokeLog, TestSettings } from "@/types";
import { describe, expect, it } from "vitest";

import {
  expectedDailySeed,
  validateSubmission,
  type SubmissionPayload,
} from "@/server/validation";

const now = new Date("2026-10-02T16:00:00.000Z");

const settings: TestSettings = {
  mode: "terms",
  length: { type: "words", words: 25 },
  punctuation: false,
  numbers: false,
  difficulty: "medium",
  stopOnError: false,
  confidenceMode: false,
  theme: "dark",
  fontSize: "medium",
  caretStyle: "line",
  seed: "validation-fixture",
};

function completeLog(): SubmissionPayload["keystrokeLog"] {
  const words = getModeWords("terms", 25, settings.seed, settings.difficulty);
  const log: KeystrokeLog[number][] = [];
  let timestamp = 100;
  words.forEach((word, wordIndex) => {
    for (const char of word) {
      log.push({ type: "char", char, t: timestamp });
      timestamp += 280 + (log.length % 7) * 17;
    }
    if (wordIndex < words.length - 1) {
      log.push({ type: "space", t: timestamp });
      timestamp += 280 + (log.length % 7) * 17;
    }
  });
  return log;
}

function payload(
  overrides: Partial<SubmissionPayload> = {},
): SubmissionPayload {
  const keystrokeLog = completeLog();
  const result = replay(
    getModeWords("terms", 25, settings.seed, settings.difficulty),
    settings,
    keystrokeLog,
  );
  return {
    id: "8b4b3c8f-5f4f-4e1a-b0e8-8d8a44f89aa1",
    mode: "terms",
    length: settings.length,
    settings,
    seed: settings.seed,
    keystrokeLog,
    clientCreatedAt: now.toISOString(),
    claimed: {
      wpm: result.wpm,
      rawWpm: result.rawWpm,
      accuracy: result.accuracy,
      consistency: result.consistency,
      errors: result.errors,
      durationMs: result.durationMs,
      characterBreakdown: result.characterBreakdown,
    },
    ...overrides,
  };
}

describe("server submission validation", () => {
  it("accepts a deterministic replay whose claims match the server result", () => {
    const result = validateSubmission(payload(), now);
    expect(result.status).toBe("valid");
    expect(result.result?.wpm).toBeGreaterThan(0);
    expect(result.eligibleForLeaderboard).toBe(true);
  });

  it("rejects client-side metric tampering", () => {
    const input = payload();
    expect(
      validateSubmission(
        { ...input, claimed: { ...input.claimed!, wpm: 999 } },
        now,
      ).reasons,
    ).toContain("client-claim-mismatch");
  });

  it("rejects non-monotonic event timestamps", () => {
    const input = payload();
    const log = [...input.keystrokeLog];
    log[2] = { ...log[2]!, t: 1 };
    expect(
      validateSubmission({ ...input, keystrokeLog: log }, now).reasons,
    ).toContain("timestamps-not-monotonic");
  });

  it("requires the current UTC daily seed", () => {
    const dailySettings: TestSettings = {
      ...settings,
      mode: "daily",
      length: { type: "time", seconds: 60 },
      seed: getDailySeed("2026-10-01"),
    };
    const result = replay(
      getModeWords("daily", 320, dailySettings.seed, dailySettings.difficulty),
      dailySettings,
      [],
    );
    const input = {
      id: "a9a6ec84-5bfb-4b39-8c5a-a17a6a6d5e5b",
      mode: "daily" as const,
      length: dailySettings.length,
      settings: dailySettings,
      seed: dailySettings.seed,
      keystrokeLog: [],
      clientCreatedAt: now.toISOString(),
      claimed: {
        wpm: result.wpm,
        rawWpm: result.rawWpm,
        accuracy: result.accuracy,
        consistency: result.consistency,
        errors: result.errors,
        durationMs: result.durationMs,
        characterBreakdown: result.characterBreakdown,
      },
    };
    expect(expectedDailySeed(now)).toBe("daily:2026-10-02");
    expect(validateSubmission(input, now).reasons).toContain(
      "daily-seed-mismatch",
    );
  });

  it("replays empty input safely for a timed test", () => {
    const timedSettings: TestSettings = {
      ...settings,
      length: { type: "time", seconds: 15 },
    };
    const state = createTest(["market"], timedSettings);
    const result = getResult(state);
    expect(result.durationMs).toBe(0);
    expect(result.accuracy).toBe(100);
  });
});
