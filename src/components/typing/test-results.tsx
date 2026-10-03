"use client";

import { useEffect, useMemo, useState } from "react";

import { getNextRank, getRank } from "@/types";
import type { CharMistake, SymbolAccuracy, WordStat } from "@/engine";
import type { TestResult, UserSettings } from "@/types";

import { Button } from "../ui/button";
import { Kbd } from "../ui/kbd";

function formatLength(result: TestResult): string {
  return result.settings.length.type === "time"
    ? `${result.settings.length.seconds}s`
    : `${result.settings.length.words} words`;
}

function useCountUp(
  target: number,
  reducedMotion: UserSettings["reducedMotion"],
): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (
      reducedMotion === "on" ||
      (reducedMotion === "system" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / 650));
      setValue(target * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, target]);
  return value;
}

function points(result: TestResult, raw: boolean): string {
  const samples = result.wpmPerSecond;
  if (samples.length === 0) return "";
  const max = Math.max(
    ...samples.map((sample) => Math.max(sample.wpm, sample.rawWpm)),
    1,
  );
  return samples
    .map((sample, index) => {
      const x =
        samples.length === 1 ? 50 : (index / (samples.length - 1)) * 100;
      const y = 100 - ((raw ? sample.rawWpm : sample.wpm) / max) * 86 - 7;
      return `${x},${y}`;
    })
    .join(" ");
}

function SpeedChart({ result }: { result: TestResult }) {
  const max = Math.max(
    ...result.wpmPerSecond.map((sample) => Math.max(sample.wpm, sample.rawWpm)),
    1,
  );
  return (
    <figure
      className="rounded-lg border border-border bg-background/45 p-4"
      data-testid="results-chart"
    >
      <figcaption className="flex items-center justify-between text-sm text-muted">
        <span>Speed over time</span>
        <span className="font-mono text-xs">net / raw WPM</span>
      </figcaption>
      <svg
        aria-label="Line chart of net and raw WPM by second"
        className="mt-3 h-36 w-full"
        preserveAspectRatio="none"
        role="img"
        viewBox="0 0 100 100"
      >
        <polyline
          fill="none"
          points={points(result, true)}
          stroke="var(--theme-text-muted)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          fill="none"
          points={points(result, false)}
          stroke="var(--theme-accent)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {result.wpmPerSecond.map((sample, index) =>
          sample.errors > 0 ? (
            <circle
              cx={
                result.wpmPerSecond.length === 1
                  ? 50
                  : (index / (result.wpmPerSecond.length - 1)) * 100
              }
              cy={100 - (sample.wpm / max) * 86 - 7}
              fill="var(--theme-incorrect)"
              r="2"
              vectorEffect="non-scaling-stroke"
              key={sample.second}
            />
          ) : null,
        )}
      </svg>
      <p className="sr-only">
        {result.wpmPerSecond.length} seconds plotted. Net speed peaked at{" "}
        {Math.round(
          Math.max(
            ...result.wpmPerSecond.map((sample) => sample.wpm),
            result.wpm,
          ),
        )}{" "}
        WPM with {result.errors} errors.
      </p>
    </figure>
  );
}

export interface ResultDetails {
  isPersonalBest: boolean;
  previousBestWpm: number | null;
  slowestWords: WordStat[];
  mistakes: CharMistake[];
  symbolAccuracy: SymbolAccuracy;
}

export function TestResults({
  result,
  onTryAgain,
  onNextTest,
  details,
  reducedMotion = "system",
}: {
  result: TestResult;
  onTryAgain: () => void;
  onNextTest: () => void;
  details: ResultDetails | null;
  reducedMotion?: UserSettings["reducedMotion"];
}) {
  const ranked = result.mode !== "custom";
  const rank = ranked ? getRank(result.wpm) : null;
  const nextRank = ranked ? getNextRank(result.wpm) : null;
  const breakdown = result.characterBreakdown;
  const animatedWpm = useCountUp(Math.round(result.wpm), reducedMotion);
  const progress = !ranked
    ? 0
    : nextRank
      ? Math.min(
          100,
          Math.max(
            0,
            ((result.wpm - (rank?.minWpm ?? 0)) /
              (nextRank.minWpm - (rank?.minWpm ?? 0))) *
              100,
          ),
        )
      : 100;
  const shareText = `FinType | ${Math.round(result.wpm)} WPM | ${Math.round(result.accuracy)}% | ${result.mode} ${formatLength(result)} | ${rank?.title ?? "Unranked"}`;
  const [toast, setToast] = useState("");
  const signature = details?.symbolAccuracy ?? {
    letters: 0,
    digits: 0,
    symbols: 0,
  };
  const chartSummary = useMemo(
    () =>
      result.wpmPerSecond
        .map((sample) => `${sample.second}s ${Math.round(sample.wpm)} WPM`)
        .join(", "),
    [result.wpmPerSecond],
  );

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setToast("Summary copied");
    } catch {
      setToast("Copy unavailable — select the summary manually");
    }
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <div
      aria-live="polite"
      className="motion-safe:animate-[fade-in_180ms_ease-out]"
      data-testid="results-panel"
    >
      <div className="grid gap-8 md:grid-cols-[1.1fr_2fr] md:items-end">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            net speed
          </p>
          <p
            className="mt-2 font-mono text-7xl font-semibold tracking-[-0.08em] text-accent sm:text-8xl"
            data-testid="result-wpm"
          >
            {animatedWpm}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted">wpm</span>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent">
              {rank?.title ?? "Unranked"}
            </span>
            {details?.isPersonalBest ? (
              <span
                className="rounded-full border border-correct/40 bg-correct/10 px-2.5 py-1 font-mono text-xs text-correct"
                data-testid="personal-best-badge"
              >
                New personal best!
                {details.previousBestWpm !== null
                  ? ` +${Math.round(result.wpm - details.previousBestWpm)}`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          {[
            ["accuracy", `${result.accuracy.toFixed(1)}%`, "result-accuracy"],
            ["raw", `${Math.round(result.rawWpm)} wpm`, "result-raw"],
            ["consistency", `${result.consistency}%`, "result-consistency"],
            ["errors", String(result.errors), "result-errors"],
          ].map(([label, value, testId]) => (
            <div key={label}>
              <dt className="text-sm text-muted">{label}</dt>
              <dd
                className="mt-1 font-mono text-xl font-medium text-foreground"
                data-testid={testId}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-7 grid gap-4 rounded-lg border border-border bg-background/30 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm text-muted">
            {ranked
              ? `Rank progress · ${rank?.title}${nextRank ? ` → ${nextRank.title}` : " · top rank"}`
              : "Rank progress · custom tests are unranked"}
          </p>
          <div
            aria-label={
              ranked
                ? `${Math.round(progress)} percent to ${nextRank?.title ?? "top rank"}`
                : "Custom tests are not ranked"
            }
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={Math.round(progress)}
            className="mt-3 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="font-mono text-sm text-muted">
          {!ranked
            ? "Not ranked"
            : nextRank
              ? `${Math.max(0, Math.ceil(nextRank.minWpm - result.wpm))} WPM to go`
              : "MD achieved"}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SpeedChart result={result} />
        <div
          className="rounded-lg border border-border bg-background/45 p-4"
          data-testid="signature-stats"
        >
          <p className="text-sm text-muted">Signature accuracy</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              ["letters", signature.letters],
              ["digits", signature.digits],
              ["symbols", signature.symbols],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-xl text-accent">
                  {Number(value).toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="sr-only">
        Per-second chart summary:{" "}
        {chartSummary || "No per-second samples were recorded."}
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Slowest words</h2>
          {details?.slowestWords.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {details.slowestWords.map((word) => (
                <li
                  className="flex justify-between gap-4"
                  key={`${word.wordIndex}-${word.target}`}
                >
                  <span className="font-mono text-muted">{word.target}</span>
                  <span className="font-mono text-foreground">
                    {Math.round(word.wpm)} WPM
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Word timing appears when a keystroke log is available.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">
            Most mistyped characters
          </h2>
          {details?.mistakes.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {details.mistakes.map((mistake) => (
                <li
                  className="flex justify-between gap-4"
                  key={mistake.character}
                >
                  <span className="font-mono text-incorrect">
                    {mistake.character} →{" "}
                    {mistake.typedInstead[0]?.character ?? "?"}
                  </span>
                  <span className="font-mono text-muted">
                    {mistake.count} mistakes
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No repeated character weaknesses yet.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-sm text-muted">
          {result.mode} · {formatLength(result)} · {result.settings.difficulty}{" "}
          · seed {result.seed.slice(0, 8)}
        </p>
        <p className="mt-2 font-mono text-xs text-muted">
          <span className="text-correct">{breakdown.correct} correct</span> ·{" "}
          <span className="text-incorrect">
            {breakdown.incorrect} incorrect
          </span>{" "}
          · {breakdown.extra} extra · {breakdown.missed} missed ·{" "}
          {Math.round(result.durationMs / 1000)}s
        </p>
        {result.mode === "custom" ? (
          <p className="mt-2 text-xs text-warning">
            Custom tests stay out of leaderboards and personal bests.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onTryAgain} variant="secondary">
            Retry same text <Kbd className="ml-2">shift+enter</Kbd>
          </Button>
          <Button onClick={onNextTest}>
            Next test <Kbd className="ml-2">enter</Kbd>
          </Button>
          <Button onClick={share} variant="ghost">
            Share
          </Button>
        </div>
        {toast ? (
          <p aria-live="polite" className="mt-3 text-sm text-accent">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
