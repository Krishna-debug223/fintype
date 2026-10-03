import { CONTENT_VERSION, getDailySeed, getModeWords } from "@/content";
import { replay } from "@/engine";
import { isPrintableCharacter } from "@/engine/text";
import type {
  CharacterBreakdown,
  Difficulty,
  KeystrokeLog,
  Mode,
  TestLength,
  TestResult,
  TestSettings,
} from "@/types";
import { z } from "zod";

import { ANTI_CHEAT } from "./constants";
export { ANTI_CHEAT } from "./constants";
export {
  isReservedUsername,
  usernameSchema,
  validateUsername,
} from "./username";

const modeSchema = z.enum([
  "terms",
  "office",
  "numbers",
  "excel",
  "mixed",
  "daily",
  "custom",
]);
const lengthSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("time"),
    seconds: z.union([
      z.literal(15),
      z.literal(30),
      z.literal(60),
      z.literal(120),
    ]),
  }),
  z.object({
    type: z.literal("words"),
    words: z.union([z.literal(25), z.literal(50), z.literal(100)]),
  }),
]);
const settingsSchema = z.object({
  mode: modeSchema.optional(),
  length: lengthSchema.optional(),
  seed: z.string().min(1).max(160).optional(),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  stopOnError: z.boolean(),
  confidenceMode: z.boolean(),
  theme: z.enum(["dark", "light", "terminal", "wallstreet"]),
  fontSize: z.enum(["small", "medium", "large", "xl"]),
  caretStyle: z.enum(["line", "block", "underline"]),
  contentVersion: z.number().int().positive().optional(),
});
const logEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("char"),
    char: z.string().min(1).max(8),
    t: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.enum(["space", "backspace", "deleteWord"]),
    t: z.number().int().nonnegative(),
  }),
]);
const claimedSchema = z.object({
  wpm: z.number().finite().nonnegative(),
  rawWpm: z.number().finite().nonnegative(),
  accuracy: z.number().finite().min(0).max(100),
  consistency: z.number().finite().min(0).max(100),
  errors: z.number().int().nonnegative(),
  durationMs: z.number().finite().nonnegative(),
  characterBreakdown: z.object({
    correct: z.number().int().nonnegative(),
    incorrect: z.number().int().nonnegative(),
    extra: z.number().int().nonnegative(),
    missed: z.number().int().nonnegative(),
  }),
});

export const submissionPayloadSchema = z.object({
  id: z.string().uuid(),
  mode: modeSchema,
  length: lengthSchema,
  settings: settingsSchema,
  seed: z.string().min(1).max(160),
  contentVersion: z.number().int().positive().optional(),
  keystrokeLog: z.array(logEntrySchema).max(ANTI_CHEAT.maxLogEntries),
  clientCreatedAt: z.string().datetime(),
  retryOf: z.string().uuid().nullable().optional(),
  claimed: claimedSchema.optional(),
  // Accepting direct claims keeps the API friendly to the existing TestResult
  // shape while the normalized result below always uses `claimed` internally.
  wpm: z.number().finite().nonnegative().optional(),
  rawWpm: z.number().finite().nonnegative().optional(),
  accuracy: z.number().finite().min(0).max(100).optional(),
  consistency: z.number().finite().min(0).max(100).optional(),
  errors: z.number().int().nonnegative().optional(),
  durationMs: z.number().finite().nonnegative().optional(),
  characterBreakdown: claimedSchema.shape.characterBreakdown.optional(),
});

export type SubmissionPayload = z.infer<typeof submissionPayloadSchema>;
export type ValidationStatus = "valid" | "flagged" | "rejected";

export interface ValidationResult {
  status: ValidationStatus;
  result: TestResult | null;
  flags: string[];
  reasons: string[];
  eligibleForLeaderboard: boolean;
  isDaily: boolean;
}

function nearlyEqual(left: number, right: number, tolerance = 0.011): boolean {
  return Math.abs(left - right) <= tolerance;
}

function sameBreakdown(
  left: CharacterBreakdown,
  right: CharacterBreakdown,
): boolean {
  return (
    left.correct === right.correct &&
    left.incorrect === right.incorrect &&
    left.extra === right.extra &&
    left.missed === right.missed
  );
}

function intervals(log: KeystrokeLog): number[] {
  return log.slice(1).map((entry, index) => entry.t - (log[index]?.t ?? 0));
}

function dailyDateFromSeed(seed: string): string | null {
  return seed.startsWith("daily:") ? seed.slice("daily:".length) : null;
}

function isDailySeedAllowed(seed: string, serverNow: Date): boolean {
  const date = dailyDateFromSeed(seed);
  if (!date) return false;
  const currentDate = serverNow.toISOString().slice(0, 10);
  if (date === currentDate) return true;
  const currentMidnight = new Date(`${currentDate}T00:00:00.000Z`);
  const previous = new Date(`${currentDate}T00:00:00.000Z`);
  previous.setUTCDate(previous.getUTCDate() - 1);
  return (
    date === previous.toISOString().slice(0, 10) &&
    serverNow.getTime() - currentMidnight.getTime() <= ANTI_CHEAT.dailyGraceMs
  );
}

function modeLengthAllowed(mode: Mode, length: TestLength): boolean {
  if (mode === "daily") return length.type === "time" && length.seconds === 60;
  return true;
}

function sameLength(left: TestLength, right: TestLength): boolean {
  return (
    left.type === right.type &&
    (left.type === "time"
      ? left.seconds ===
        (right as Extract<TestLength, { type: "time" }>).seconds
      : left.words === (right as Extract<TestLength, { type: "words" }>).words)
  );
}

function wordCountFor(
  length: TestLength,
  contentVersion: number = CONTENT_VERSION,
): number {
  if (contentVersion === 1) return length.type === "words" ? length.words : 320;
  if (length.type === "words") return length.words;
  return length.seconds === 15
    ? 100
    : length.seconds === 30
      ? 200
      : length.seconds === 60
        ? 350
        : 650;
}

function getClaimed(
  payload: SubmissionPayload,
): z.infer<typeof claimedSchema> | null {
  if (payload.claimed) return payload.claimed;
  if (
    payload.wpm === undefined ||
    payload.rawWpm === undefined ||
    payload.accuracy === undefined ||
    payload.consistency === undefined ||
    payload.errors === undefined ||
    payload.durationMs === undefined ||
    !payload.characterBreakdown
  )
    return null;
  return {
    wpm: payload.wpm,
    rawWpm: payload.rawWpm,
    accuracy: payload.accuracy,
    consistency: payload.consistency,
    errors: payload.errors,
    durationMs: payload.durationMs,
    characterBreakdown: payload.characterBreakdown,
  };
}

function antiCheatFlags(result: TestResult, log: KeystrokeLog): string[] {
  const flags: string[] = [];
  if (result.wpm > ANTI_CHEAT.hardWpmCeiling) {
    flags.push("wpm-over-hard-ceiling");
  } else if (result.wpm > ANTI_CHEAT.reviewWpmFloor) {
    flags.push("wpm-requires-review");
  }
  const sample = intervals(log);
  if (sample.length >= ANTI_CHEAT.uniformIntervalMinimumSamples) {
    const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
    const variance =
      sample.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      sample.length;
    if (mean > 0 && Math.sqrt(variance) / mean < ANTI_CHEAT.uniformIntervalCv)
      flags.push("uniform-keystroke-timing");
    const fastShare =
      sample.filter((value) => value < ANTI_CHEAT.minimumIntervalMs).length /
      sample.length;
    if (fastShare >= ANTI_CHEAT.minimumIntervalShare)
      flags.push("sub-minimum-keystroke-intervals");
  }
  if (
    result.wpm > ANTI_CHEAT.reviewWpmFloor &&
    result.accuracy >= ANTI_CHEAT.highSpeedAccuracy &&
    log.length >= ANTI_CHEAT.highSpeedMinimumSamples &&
    !log.some(
      (entry) => entry.type === "backspace" || entry.type === "deleteWord",
    )
  ) {
    flags.push("high-speed-perfect-run");
  }
  return flags;
}

function reject(reasons: string[]): ValidationResult {
  return {
    status: "rejected",
    result: null,
    flags: [],
    reasons,
    eligibleForLeaderboard: false,
    isDaily: false,
  };
}

/** Recompute a result from the only trusted inputs: seed, settings, and log. */
export function validateSubmission(
  input: unknown,
  serverNow = new Date(),
): ValidationResult {
  const parsed = submissionPayloadSchema.safeParse(input);
  if (!parsed.success) return reject(["invalid-payload"]);
  const payload = parsed.data;
  const contentVersion = payload.contentVersion ?? CONTENT_VERSION;
  if (contentVersion !== 1 && contentVersion !== CONTENT_VERSION)
    return reject(["unknown-content-version"]);
  if (!modeLengthAllowed(payload.mode, payload.length))
    return reject(["invalid-mode-length"]);
  if (
    (payload.settings.mode !== undefined &&
      payload.settings.mode !== payload.mode) ||
    (payload.settings.seed !== undefined &&
      payload.settings.seed !== payload.seed) ||
    (payload.settings.length !== undefined &&
      !sameLength(payload.settings.length, payload.length))
  )
    return reject(["settings-mismatch"]);
  if (
    payload.keystrokeLog.some(
      (entry) => entry.type === "char" && !isPrintableCharacter(entry.char),
    )
  )
    return reject(["invalid-character"]);
  for (let index = 1; index < payload.keystrokeLog.length; index += 1) {
    const previous = payload.keystrokeLog[index - 1];
    const current = payload.keystrokeLog[index];
    if (!previous || !current || current.t < previous.t)
      return reject(["timestamps-not-monotonic"]);
  }
  const createdAt = new Date(payload.clientCreatedAt).getTime();
  if (!Number.isFinite(createdAt)) return reject(["invalid-client-time"]);
  if (createdAt > serverNow.getTime() + ANTI_CHEAT.futureClockSkewMs)
    return reject(["client-time-in-future"]);
  if (createdAt < serverNow.getTime() - ANTI_CHEAT.maxAgeDays * 86_400_000)
    return reject(["client-time-too-old"]);
  if (payload.mode === "daily" && !isDailySeedAllowed(payload.seed, serverNow))
    return reject(["daily-seed-mismatch"]);
  const settings: TestSettings = {
    ...payload.settings,
    mode: payload.mode,
    length: payload.length,
    seed: payload.seed,
    contentVersion,
  };
  const words = getModeWords(
    payload.mode,
    wordCountFor(payload.length, contentVersion),
    payload.seed,
    payload.settings.difficulty as Difficulty,
    { contentVersion },
  );
  const result = replay(words, settings, payload.keystrokeLog);
  const durationLimit =
    payload.length.type === "time" ? payload.length.seconds * 1000 : null;
  if (
    durationLimit !== null &&
    payload.keystrokeLog.some((entry) => entry.t > durationLimit)
  )
    return reject(["input-after-deadline"]);
  if (payload.length.type === "words" && result.durationMs <= 0)
    return reject(["word-test-did-not-finish"]);
  const claimed = getClaimed(payload);
  if (!claimed) return reject(["missing-client-claims"]);
  if (
    !nearlyEqual(claimed.wpm, result.wpm) ||
    !nearlyEqual(claimed.rawWpm, result.rawWpm) ||
    !nearlyEqual(claimed.accuracy, result.accuracy) ||
    !nearlyEqual(claimed.consistency, result.consistency) ||
    claimed.errors !== result.errors ||
    !nearlyEqual(claimed.durationMs, result.durationMs, 1) ||
    !sameBreakdown(claimed.characterBreakdown, result.characterBreakdown)
  )
    return reject(["client-claim-mismatch"]);
  const flags = antiCheatFlags(result, payload.keystrokeLog);
  if (result.wpm > ANTI_CHEAT.hardWpmCeiling)
    return reject(["wpm-over-hard-ceiling"]);
  const retry = Boolean(payload.retryOf);
  const isDaily = payload.mode === "daily";
  const eligibleForLeaderboard =
    payload.mode !== "custom" && !retry && !isDaily;
  return {
    status: flags.length ? "flagged" : "valid",
    result,
    flags,
    reasons: flags,
    eligibleForLeaderboard,
    isDaily,
  };
}

export function expectedDailySeed(serverNow = new Date()): string {
  return getDailySeed(serverNow.toISOString().slice(0, 10));
}
