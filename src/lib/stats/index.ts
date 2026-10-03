import type { SavedTest } from "@/types";

export interface StatsSummary {
  totalTests: number;
  totalTimeMs: number;
  averageWpm: number;
  averageAccuracy: number;
  bestWpm: number;
}

export interface BucketBest {
  bucket: string;
  wpm: number;
  accuracy: number;
  createdAt: string;
  testId: string;
}

export interface StreakSummary {
  current: number;
  longest: number;
  activeDays: string[];
}

function round(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

export function summarizeTests(tests: readonly SavedTest[]): StatsSummary {
  if (tests.length === 0)
    return {
      totalTests: 0,
      totalTimeMs: 0,
      averageWpm: 0,
      averageAccuracy: 0,
      bestWpm: 0,
    };
  return {
    totalTests: tests.length,
    totalTimeMs: tests.reduce((sum, test) => sum + test.durationMs, 0),
    averageWpm: round(
      tests.reduce((sum, test) => sum + test.wpm, 0) / tests.length,
    ),
    averageAccuracy: round(
      tests.reduce((sum, test) => sum + test.accuracy, 0) / tests.length,
    ),
    bestWpm: Math.max(...tests.map((test) => test.wpm), 0),
  };
}

export function getBestPerBucket(tests: readonly SavedTest[]): BucketBest[] {
  const best = new Map<string, SavedTest>();
  tests
    .filter((test) => test.eligibleForLeaderboard)
    .forEach((test) => {
      const length =
        test.length.type === "time"
          ? `time:${test.length.seconds}`
          : `words:${test.length.words}`;
      const key = `${test.mode}:${length}:${test.difficulty}`;
      const current = best.get(key);
      if (!current || test.wpm > current.wpm) best.set(key, test);
    });
  return [...best.entries()]
    .map(([bucket, test]) => ({
      bucket,
      wpm: test.wpm,
      accuracy: test.accuracy,
      createdAt: test.createdAt,
      testId: test.id,
    }))
    .sort((a, b) => b.wpm - a.wpm);
}

export function getWpmOverTime(
  tests: readonly SavedTest[],
): { date: string; wpm: number; average: number }[] {
  const ordered = [...tests].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  return ordered.map((test, index) => {
    const window = ordered.slice(Math.max(0, index - 4), index + 1);
    return {
      date: test.createdAt,
      wpm: test.wpm,
      average: round(
        window.reduce((sum, item) => sum + item.wpm, 0) / window.length,
      ),
    };
  });
}

export function getAccuracyOverTime(
  tests: readonly SavedTest[],
): { date: string; accuracy: number }[] {
  return [...tests]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((test) => ({ date: test.createdAt, accuracy: test.accuracy }));
}

export function getActivityByDay(
  tests: readonly SavedTest[],
  timezone = "local",
): Record<string, number> {
  return tests.reduce<Record<string, number>>((activity, test) => {
    const date = new Date(test.createdAt);
    const key =
      timezone === "utc" ? date.toISOString().slice(0, 10) : localDateKey(date);
    activity[key] = (activity[key] ?? 0) + 1;
    return activity;
  }, {});
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateNumber(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function getActiveStreak(
  tests: readonly SavedTest[],
  now = new Date(),
): StreakSummary {
  const qualifyingDays = new Set(
    tests
      .filter((test) =>
        test.length.type === "time"
          ? test.length.seconds >= 15
          : test.length.words >= 25,
      )
      .map((test) => localDateKey(new Date(test.createdAt))),
  );
  const activeDays = [...qualifyingDays].sort(
    (a, b) => dateNumber(a) - dateNumber(b),
  );
  let longest = 0;
  let run = 0;
  let previous = -Infinity;
  activeDays.forEach((day) => {
    const value = dateNumber(day);
    run = value - previous === 86_400_000 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = value;
  });
  const today = localDateKey(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);
  const last = activeDays.at(-1);
  let current = 0;
  if (last === today || last === yesterday) {
    let cursor = dateNumber(last);
    for (let index = activeDays.length - 1; index >= 0; index -= 1) {
      const value = dateNumber(activeDays[index] ?? "");
      if (cursor - value !== 86_400_000 && value !== cursor) break;
      current += 1;
      cursor = value;
    }
  }
  return { current, longest, activeDays };
}

export function getWpmDistribution(
  tests: readonly SavedTest[],
  step = 10,
): { range: string; count: number }[] {
  const buckets = new Map<number, number>();
  tests.forEach((test) => {
    const bucket = Math.floor(test.wpm / step) * step;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([range, count]) => ({
      range: `${range}-${range + step - 1}`,
      count,
    }));
}
