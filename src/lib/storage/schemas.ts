import { z } from "zod";

import {
  CARET_STYLES,
  DIFFICULTIES,
  FONT_SIZES,
  MODES,
  THEMES,
} from "@/lib/constants";

export const testLengthSchema = z.discriminatedUnion("type", [
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

export const characterBreakdownSchema = z.object({
  correct: z.number().finite().nonnegative(),
  incorrect: z.number().finite().nonnegative(),
  extra: z.number().finite().nonnegative(),
  missed: z.number().finite().nonnegative(),
});

export const wpmSampleSchema = z.object({
  second: z.number().int().nonnegative(),
  wpm: z.number().finite().nonnegative(),
  rawWpm: z.number().finite().nonnegative(),
  errors: z.number().int().nonnegative(),
});

export const keystrokeLogSchema = z.array(
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("char"),
      char: z.string().min(1),
      t: z.number().finite().nonnegative(),
    }),
    z.object({
      type: z.union([
        z.literal("space"),
        z.literal("backspace"),
        z.literal("deleteWord"),
      ]),
      t: z.number().finite().nonnegative(),
    }),
  ]),
);

export const savedTestSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  mode: z.enum(MODES),
  difficulty: z.enum(DIFFICULTIES),
  length: testLengthSchema,
  settings: z.object({
    punctuation: z.boolean(),
    numbers: z.boolean(),
    stopOnError: z.boolean(),
    confidenceMode: z.boolean(),
  }),
  seed: z.string().min(1),
  wpm: z.number().finite().nonnegative(),
  rawWpm: z.number().finite().nonnegative(),
  accuracy: z.number().finite().min(0).max(100),
  consistency: z.number().finite().min(0).max(100),
  errors: z.number().int().nonnegative(),
  characterBreakdown: characterBreakdownSchema,
  durationMs: z.number().finite().nonnegative(),
  wpmPerSecond: z.array(wpmSampleSchema),
  rank: z.enum(["Intern", "Analyst", "Associate", "VP", "Director", "MD"]),
  isPersonalBest: z.boolean(),
  eligibleForLeaderboard: z.boolean(),
  keystrokeLog: keystrokeLogSchema.optional(),
  synced: z.boolean(),
  schemaVersion: z.number().int().positive(),
  retryOfTestId: z.string().nullable(),
});

export const userSettingsSchema = z.object({
  theme: z.enum(THEMES),
  fontSize: z.enum(FONT_SIZES),
  caretStyle: z.enum(CARET_STYLES),
  smoothCaret: z.boolean(),
  showLiveWpm: z.boolean(),
  showLiveAccuracy: z.boolean(),
  showTimer: z.boolean(),
  defaultMode: z.enum(MODES),
  defaultLength: testLengthSchema,
  difficulty: z.enum(DIFFICULTIES),
  punctuation: z.boolean(),
  numbers: z.boolean(),
  stopOnError: z.boolean(),
  confidenceMode: z.boolean(),
  quickRestartKey: z.enum(["tab-enter", "escape"]),
  blindMode: z.boolean(),
  reducedMotion: z.enum(["system", "on", "off"]),
  highContrast: z.boolean(),
  largerCaret: z.boolean(),
});

export const localProfileSchema = z.object({
  localId: z.string().min(1),
  createdAt: z.string().datetime(),
  totalTests: z.number().int().nonnegative(),
  totalTimeMs: z.number().finite().nonnegative(),
});

export const personalBestSchema = z.object({
  testId: z.string().min(1),
  wpm: z.number().finite().nonnegative(),
  accuracy: z.number().finite().min(0).max(100),
  createdAt: z.string().datetime(),
});

export const personalBestsSchema = z.record(z.string(), personalBestSchema);

export const dailyRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  wpm: z.number().finite().nonnegative(),
  accuracy: z.number().finite().min(0).max(100),
  testId: z.string().min(1),
});

export const repositoryExportSchema = z.object({
  exportVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  tests: z.array(savedTestSchema),
  settings: userSettingsSchema,
  profile: localProfileSchema,
  personalBests: personalBestsSchema,
  dailyRecords: z.array(dailyRecordSchema),
});

export const syncQueueItemSchema = z.object({
  id: z.string().uuid(),
  payload: z.unknown(),
  attempts: z.number().int().nonnegative(),
  nextAttemptAt: z.string().datetime(),
  failed: z.boolean(),
  reason: z.string().nullable(),
});

export type RepositoryExport = z.infer<typeof repositoryExportSchema>;
