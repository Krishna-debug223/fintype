import { and, eq, sql } from "drizzle-orm";

import type { TestResult } from "@/types";
import { CONTENT_VERSION } from "@/content";

import { getDatabase } from "./db";
import {
  auditLog,
  dailyResults,
  personalBests,
  tests,
  userBans,
  userStats,
} from "../../db/schema";
import {
  submissionPayloadSchema,
  validateSubmission,
  type SubmissionPayload,
  type ValidationResult,
} from "./validation";

export interface SubmissionResponse {
  id: string;
  status: ValidationResult["status"] | "existing";
  result: TestResult | null;
  flags: string[];
  personalBest: boolean;
  newRank: string | null;
  synced: boolean;
}

function lengthValue(payload: SubmissionPayload): number {
  return payload.length.type === "time"
    ? payload.length.seconds
    : payload.length.words;
}

function bucket(payload: SubmissionPayload): string {
  return `${payload.mode}:${payload.length.type}:${lengthValue(payload)}:${payload.settings.difficulty}`;
}

function number(value: string | number | null | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function resultFromRow(row: typeof tests.$inferSelect): TestResult {
  return {
    wpm: number(row.wpm),
    rawWpm: number(row.rawWpm),
    accuracy: number(row.accuracy),
    consistency: number(row.consistency),
    errors: row.errors,
    characterBreakdown: row.charBreakdown as TestResult["characterBreakdown"],
    durationMs: row.durationMs,
    wpmPerSecond: row.wpmSeries as TestResult["wpmPerSecond"],
    mode: row.mode as TestResult["mode"],
    settings: {
      mode: row.mode as TestResult["settings"]["mode"],
      length:
        row.lengthType === "time"
          ? { type: "time", seconds: row.lengthValue as 15 | 30 | 60 | 120 }
          : { type: "words", words: row.lengthValue as 25 | 50 | 100 },
      punctuation: row.punctuation,
      numbers: row.numbers,
      difficulty: row.difficulty as TestResult["settings"]["difficulty"],
      stopOnError: row.stopOnError,
      confidenceMode: row.confidenceMode,
      contentVersion: row.contentVersion,
      theme: "dark",
      fontSize: "medium",
      caretStyle: "line",
      seed: row.seed,
    },
    seed: row.seed,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function submitForUser(
  userId: string,
  input: unknown,
  now = new Date(),
): Promise<
  | SubmissionResponse
  | { error: "invalid-payload" | "rejected"; validation: ValidationResult }
> {
  const database = getDatabase();
  if (!database) throw new Error("DATABASE_NOT_CONFIGURED");
  const activeBan = await database
    .select({ reason: userBans.reason })
    .from(userBans)
    .where(and(eq(userBans.userId, userId), sql`${userBans.liftedAt} is null`))
    .limit(1);
  if (activeBan[0]) throw new Error("USER_BANNED");
  const payload = submissionPayloadSchema.safeParse(input);
  if (!payload.success)
    return {
      error: "invalid-payload",
      validation: validateSubmission(input, now),
    };
  const existing = await database
    .select()
    .from(tests)
    .where(eq(tests.id, payload.data.id))
    .limit(1);
  if (existing[0]) {
    if (existing[0].userId !== userId)
      throw new Error("TEST_ID_OWNED_BY_OTHER_USER");
    return {
      id: existing[0].id,
      status: "existing",
      result: resultFromRow(existing[0]),
      flags: existing[0].flagReasons,
      personalBest: false,
      newRank: null,
      synced: true,
    };
  }
  const validation = validateSubmission(payload.data, now);
  if (!validation.result) {
    await database.insert(auditLog).values({
      userId,
      action: "submission_rejected",
      details: { testId: payload.data.id, reasons: validation.reasons },
    });
    return { error: "rejected", validation };
  }
  const result = validation.result;
  const status = validation.status;
  const eligible = status === "valid" && validation.eligibleForLeaderboard;
  let personalBest = false;
  const dailyDate = validation.isDaily ? payload.data.seed.slice(-10) : null;
  await database.transaction(async (tx) => {
    await tx.insert(tests).values({
      id: payload.data.id,
      userId,
      mode: payload.data.mode,
      lengthType: payload.data.length.type,
      lengthValue: lengthValue(payload.data),
      difficulty: payload.data.settings.difficulty,
      punctuation: payload.data.settings.punctuation,
      numbers: payload.data.settings.numbers,
      stopOnError: payload.data.settings.stopOnError,
      confidenceMode: payload.data.settings.confidenceMode,
      contentVersion: payload.data.contentVersion ?? CONTENT_VERSION,
      seed: payload.data.seed,
      wpm: result.wpm.toFixed(2),
      rawWpm: result.rawWpm.toFixed(2),
      accuracy: result.accuracy.toFixed(2),
      consistency: result.consistency.toFixed(2),
      errors: result.errors,
      durationMs: Math.round(result.durationMs),
      charBreakdown: result.characterBreakdown,
      wpmSeries: result.wpmPerSecond,
      keystrokeLog: payload.data.keystrokeLog,
      validationStatus: status,
      flagReasons: validation.flags,
      eligibleForLeaderboard: eligible,
      isDaily: validation.isDaily,
      dailyDate,
      retryOf: payload.data.retryOf ?? null,
      clientCreatedAt: new Date(payload.data.clientCreatedAt),
    });
    if (eligible) {
      const key = bucket(payload.data);
      const current = await tx
        .select()
        .from(personalBests)
        .where(
          and(eq(personalBests.userId, userId), eq(personalBests.bucket, key)),
        )
        .limit(1);
      const currentBest = current[0];
      const wins =
        !currentBest ||
        result.wpm > number(currentBest.wpm) ||
        (result.wpm === number(currentBest.wpm) &&
          result.accuracy > number(currentBest.accuracy));
      if (wins) {
        personalBest = true;
        await tx
          .insert(personalBests)
          .values({
            userId,
            bucket: key,
            testId: payload.data.id,
            wpm: result.wpm.toFixed(2),
            accuracy: result.accuracy.toFixed(2),
            achievedAt: now,
          })
          .onConflictDoUpdate({
            target: [personalBests.userId, personalBests.bucket],
            set: {
              testId: payload.data.id,
              wpm: result.wpm.toFixed(2),
              accuracy: result.accuracy.toFixed(2),
              achievedAt: now,
            },
          });
      }
    }
    if (validation.isDaily && status === "valid" && dailyDate) {
      await tx
        .insert(dailyResults)
        .values({
          userId,
          dailyDate,
          testId: payload.data.id,
          wpm: result.wpm.toFixed(2),
          accuracy: result.accuracy.toFixed(2),
        })
        .onConflictDoNothing();
    }
    if (validation.flags.length > 0) {
      await tx.insert(auditLog).values({
        userId,
        action: "submission_flagged",
        details: { testId: payload.data.id, flags: validation.flags },
      });
    }
    await tx
      .insert(userStats)
      .values({
        userId,
        totalTests: 1,
        totalTimeMs: Math.round(result.durationMs),
        bestWpm: result.wpm.toFixed(2),
        avgWpm30d: result.wpm.toFixed(2),
      })
      .onConflictDoUpdate({
        target: userStats.userId,
        set: {
          totalTests: sql`user_stats.total_tests + 1`,
          totalTimeMs: sql`user_stats.total_time_ms + ${Math.round(result.durationMs)}`,
          bestWpm: sql`greatest(user_stats.best_wpm, ${result.wpm.toFixed(2)})`,
        },
      });
  });
  return {
    id: payload.data.id,
    status,
    result,
    flags: validation.flags,
    personalBest,
    newRank: null,
    synced: true,
  };
}
