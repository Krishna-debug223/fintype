"use client";

import { useEffect, useMemo, useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { Card } from "@/components/ui/card";
import { getModeWords } from "@/content";
import {
  createTest,
  getCharMistakes,
  getSymbolAccuracy,
  applyInput,
} from "@/engine";
import { RANKS } from "@/lib/constants";
import {
  getActiveStreak,
  getActivityByDay,
  getAccuracyOverTime,
  getBestPerBucket,
  getWpmDistribution,
  getWpmOverTime,
  localDateKey,
  summarizeTests,
} from "@/lib/stats";
import { useLocalDataStore } from "@/store/local-data";
import { getNextRank, getRank } from "@/types";
import type { SavedTest, TestSettings } from "@/types";

function analysisFor(test: SavedTest) {
  if (!test.keystrokeLog) return null;
  const settings: TestSettings = {
    mode: test.mode,
    length: test.length,
    punctuation: test.settings.punctuation,
    numbers: test.settings.numbers,
    difficulty: test.difficulty,
    stopOnError: test.settings.stopOnError,
    confidenceMode: test.settings.confidenceMode,
    theme: "dark",
    fontSize: "medium",
    caretStyle: "line",
    seed: test.seed,
    contentVersion: test.contentVersion ?? 1,
  };
  const count =
    (test.contentVersion ?? 1) === 1
      ? test.length.type === "words"
        ? test.length.words
        : 320
      : test.length.type === "words"
        ? test.length.words
        : test.length.seconds === 15
          ? 100
          : test.length.seconds === 30
            ? 200
            : test.length.seconds === 60
              ? 350
              : 650;
  let state = createTest(
    getModeWords(test.mode, count, test.seed, test.difficulty, {
      contentVersion: test.contentVersion ?? 1,
    }),
    settings,
  );
  test.keystrokeLog.forEach((entry) => {
    state = applyInput(
      state,
      entry.type === "char" ? { type: "char", char: entry.char } : entry,
      entry.t,
    );
  });
  return {
    mistakes: getCharMistakes(state, test.keystrokeLog),
    symbols: getSymbolAccuracy(state, test.keystrokeLog),
  };
}

function svgPoints(values: readonly number[], width = 520, height = 150) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min)) * (height - 18) - 9;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function StatsPage() {
  const { hydrated, tests, hydrate } = useLocalDataStore();
  const [range, setRange] = useState("all");
  const [clock, setClock] = useState(0);
  useEffect(() => {
    hydrate();
    const timer = window.setTimeout(() => setClock(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [hydrate]);
  const rangeTests = useMemo(
    () =>
      range === "all" || clock === 0
        ? tests
        : tests.filter(
            (test) =>
              clock - new Date(test.createdAt).getTime() <=
              Number(range) * 86_400_000,
          ),
    [clock, range, tests],
  );
  const summary = summarizeTests(rangeTests);
  const streak = getActiveStreak(tests);
  const bests = getBestPerBucket(tests);
  const wpmTrend = getWpmOverTime(rangeTests).slice(-40);
  const accuracyTrend = getAccuracyOverTime(rangeTests).slice(-40);
  const distribution = getWpmDistribution(rangeTests);
  const modeAverages = ["terms", "office", "numbers", "excel", "mixed"].map(
    (mode) => {
      const matching = rangeTests.filter((test) => test.mode === mode);
      return {
        mode,
        wpm: matching.length
          ? matching.reduce((sum, test) => sum + test.wpm, 0) / matching.length
          : 0,
      };
    },
  );
  const rankTests = tests.filter(
    (test) =>
      (test.mode === "terms" || test.mode === "mixed") &&
      test.length.type === "time" &&
      test.length.seconds === 60 &&
      (test.difficulty === "medium" || test.difficulty === "hard"),
  );
  const rankWpm = Math.max(...rankTests.map((test) => test.wpm), 0);
  const rank = getRank(rankWpm);
  const nextRank = getNextRank(rankWpm);
  const rankProgress = nextRank
    ? Math.min(
        100,
        Math.max(
          0,
          ((rankWpm - rank.minWpm) / (nextRank.minWpm - rank.minWpm)) * 100,
        ),
      )
    : 100;
  const recentAnalyses = tests
    .filter((test) => test.keystrokeLog)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
    .map(analysisFor)
    .filter((value): value is NonNullable<ReturnType<typeof analysisFor>> =>
      Boolean(value),
    );
  const weakSymbols = recentAnalyses.reduce(
    (totals, item) => ({
      letters: totals.letters + item.symbols.letters,
      digits: totals.digits + item.symbols.digits,
      symbols: totals.symbols + item.symbols.symbols,
    }),
    { letters: 0, digits: 0, symbols: 0 },
  );
  const weakCounts = recentAnalyses.reduce<Record<string, number>>(
    (counts, item) => {
      item.mistakes.forEach((mistake) => {
        counts[mistake.character] =
          (counts[mistake.character] ?? 0) + mistake.count;
      });
      return counts;
    },
    {},
  );
  const weakestCharacters = Object.entries(weakCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const activity = getActivityByDay(tests);
  if (!hydrated)
    return (
      <PageFrame
        eyebrow="Performance"
        title="Loading your numbers"
        description="Restoring local history."
      >
        <Card className="h-48 animate-pulse" />
      </PageFrame>
    );
  return (
    <PageFrame
      eyebrow="Performance"
      title="The desk behind the desk."
      description="A clear view of speed, accuracy, rhythm, and the habits hidden inside your keystrokes."
    >
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Stats time range"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
          onChange={(event) => setRange(event.target.value)}
          value={range}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>
      {tests.length === 0 ? (
        <Card className="mt-5 p-8 text-center">
          <p className="text-lg text-foreground">
            Your first number is waiting.
          </p>
          <p className="mt-2 text-sm text-muted">
            Complete a qualifying test to start your speed and streak history.
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["tests", summary.totalTests],
              ["time typed", `${Math.round(summary.totalTimeMs / 60_000)}m`],
              ["average WPM", Math.round(summary.averageWpm)],
              ["best WPM", Math.round(summary.bestWpm)],
              ["accuracy", `${summary.averageAccuracy.toFixed(1)}%`],
              ["current streak", `${streak.current}d`],
              ["longest streak", `${streak.longest}d`],
              ["active days", streak.activeDays.length],
            ].map(([label, value]) => (
              <Card className="p-4" key={label}>
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-2 font-mono text-2xl text-accent">{value}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Personal bests</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted uppercase">
                    <tr>
                      <th className="pb-2">bucket</th>
                      <th className="pb-2">WPM</th>
                      <th className="pb-2">accuracy</th>
                      <th className="pb-2">date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bests.map((best) => (
                      <tr className="border-t border-border" key={best.bucket}>
                        <td className="py-2 font-mono text-muted">
                          {best.bucket}
                        </td>
                        <td className="py-2 font-mono text-accent">
                          {Math.round(best.wpm)}
                        </td>
                        <td className="py-2 font-mono">
                          {best.accuracy.toFixed(1)}%
                        </td>
                        <td className="py-2 text-muted">
                          {new Date(best.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Rank card</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Best 60-second Terms or Mixed result at medium or hard
                difficulty. This rule keeps rank progress comparable.
              </p>
              <div className="mt-5 flex items-end justify-between">
                <p className="font-mono text-4xl text-accent">{rank.title}</p>
                <p className="font-mono text-sm text-muted">
                  {Math.round(rankWpm)} WPM
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{ width: `${rankProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted">
                {nextRank
                  ? `${Math.max(0, Math.ceil(nextRank.minWpm - rankWpm))} WPM to ${nextRank.title}`
                  : "Top rank reached"}
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
                {RANKS.map((item) => (
                  <div
                    className={
                      item.title === rank.title
                        ? "rounded border border-accent bg-accent/10 p-2 text-accent"
                        : "rounded border border-border p-2 text-muted"
                    }
                    key={item.title}
                  >
                    <p>{item.title}</p>
                    <p className="mt-1 font-mono">{item.minWpm}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">WPM over time</h2>
                <span className="text-xs text-muted">moving average</span>
              </div>
              {wpmTrend.length < 2 ? (
                <p className="mt-5 text-sm text-muted">
                  Finish two tests in this range to draw a trend.
                </p>
              ) : (
                <svg
                  aria-label={`WPM trend from ${Math.round(wpmTrend[0]?.wpm ?? 0)} to ${Math.round(wpmTrend.at(-1)?.wpm ?? 0)}`}
                  className="mt-4 h-40 w-full overflow-visible"
                  role="img"
                  viewBox="0 0 520 150"
                >
                  <polyline
                    fill="none"
                    points={svgPoints(wpmTrend.map((item) => item.wpm))}
                    stroke="var(--theme-accent)"
                    strokeWidth="3"
                  />
                  <polyline
                    fill="none"
                    opacity="0.38"
                    points={svgPoints(wpmTrend.map((item) => item.average))}
                    stroke="var(--theme-text-muted)"
                    strokeDasharray="5 5"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </Card>
            <Card className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">Accuracy over time</h2>
                <span className="text-xs text-muted">percentage</span>
              </div>
              {accuracyTrend.length < 2 ? (
                <p className="mt-5 text-sm text-muted">
                  Finish two tests in this range to draw a trend.
                </p>
              ) : (
                <svg
                  aria-label={`Accuracy trend from ${Math.round(accuracyTrend[0]?.accuracy ?? 0)} to ${Math.round(accuracyTrend.at(-1)?.accuracy ?? 0)} percent`}
                  className="mt-4 h-40 w-full overflow-visible"
                  role="img"
                  viewBox="0 0 520 150"
                >
                  <polyline
                    fill="none"
                    points={svgPoints(
                      accuracyTrend.map((item) => item.accuracy),
                      520,
                      150,
                    )}
                    stroke="var(--theme-correct)"
                    strokeWidth="3"
                  />
                </svg>
              )}
            </Card>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr_1.2fr]">
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Average WPM by mode</h2>
              <div className="mt-4 space-y-3">
                {modeAverages.map((item) => (
                  <div key={item.mode}>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">{item.mode}</span>
                      <span className="font-mono text-foreground">
                        {Math.round(item.wpm)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{
                          width: `${Math.min(100, (item.wpm / Math.max(summary.bestWpm, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="text-lg font-semibold">WPM distribution</h2>
              {distribution.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No distribution yet.</p>
              ) : (
                <div className="mt-4 flex h-32 items-end gap-1">
                  {distribution.map((item) => (
                    <div
                      className="group flex min-w-0 flex-1 flex-col justify-end"
                      key={item.range}
                      title={`${item.range} WPM: ${item.count} tests`}
                    >
                      <div
                        className="rounded-t bg-accent"
                        style={{
                          height: `${Math.max(8, (item.count / Math.max(...distribution.map((value) => value.count))) * 100)}%`,
                        }}
                      />
                      <span className="mt-1 truncate text-center text-[9px] text-muted">
                        {item.range.split("-")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <h2 className="text-lg font-semibold">Weak spots</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {tests.length < 5 || recentAnalyses.length === 0
                  ? "Finish five tests with retained logs to see neutral, evidence-based weakness insights."
                  : weakSymbols.letters >= weakSymbols.symbols
                    ? `Symbols are ${Math.max(0, Math.round(weakSymbols.letters / recentAnalyses.length - weakSymbols.symbols / recentAnalyses.length))} points less accurate than letters.`
                    : "Your symbol accuracy is currently ahead of your letter accuracy."}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  ["letters", weakSymbols.letters],
                  ["digits", weakSymbols.digits],
                  ["symbols", weakSymbols.symbols],
                ].map(([label, value]) => (
                  <div className="rounded border border-border p-2" key={label}>
                    <p className="text-muted">{label}</p>
                    <p className="mt-1 font-mono text-accent">
                      {recentAnalyses.length
                        ? `${Math.round(Number(value) / recentAnalyses.length)}%`
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted">
                {weakestCharacters.length
                  ? weakestCharacters.map(([character, count]) => (
                      <p className="flex justify-between" key={character}>
                        <span className="font-mono text-foreground">
                          {JSON.stringify(character)}
                        </span>
                        <span>{count} mistypes</span>
                      </p>
                    ))
                  : "No retained character mistakes yet."}
              </div>
            </Card>
          </div>
          <Card className="mt-6 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">Activity</h2>
              <span className="text-xs text-muted">last 26 weeks</span>
            </div>
            <div
              aria-label="Activity calendar showing test counts by local day"
              className="mt-4 grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2"
              role="img"
            >
              {Array.from({ length: 182 }, (_, index) => {
                const date = new Date(clock);
                date.setDate(date.getDate() - (181 - index));
                const key = localDateKey(date);
                const count = activity[key] ?? 0;
                return (
                  <div
                    className="size-3 rounded-sm bg-accent"
                    key={key}
                    style={{
                      opacity: count ? Math.min(1, 0.2 + count * 0.16) : 0.08,
                    }}
                    title={`${key}: ${count} tests`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted">
              {Object.values(activity).reduce((sum, count) => sum + count, 0)}{" "}
              tests recorded across active days. Hover a square for its local
              date.
            </p>
          </Card>
        </>
      )}
    </PageFrame>
  );
}
