"use client";

import { Button } from "@/components/ui/button";
import { getRank } from "@/types";
import type { TestResult } from "@/types";

function formatLength(result: TestResult): string {
  return result.settings.length.type === "time"
    ? `${result.settings.length.seconds} seconds`
    : `${result.settings.length.words} words`;
}

export function TestResults({
  result,
  onTryAgain,
  onNextTest,
}: {
  result: TestResult;
  onTryAgain: () => void;
  onNextTest: () => void;
}) {
  const rank = getRank(result.wpm);
  const breakdown = result.characterBreakdown;

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
            {Math.round(result.wpm)}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-sm text-muted">wpm</span>
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent">
              {rank.title}
            </span>
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

      <div className="mt-9 grid gap-4 border-t border-border pt-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm text-muted">
            Terms · {formatLength(result)} · seed {result.seed.slice(0, 8)}
          </p>
          <p className="mt-2 font-mono text-xs text-muted">
            <span className="text-correct">{breakdown.correct} correct</span>
            {" · "}
            <span className="text-incorrect">
              {breakdown.incorrect} incorrect
            </span>
            {" · "}
            <span>{breakdown.extra} extra</span>
            {" · "}
            <span>{breakdown.missed} missed</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onTryAgain} variant="secondary">
            Try again <span className="ml-2 text-xs opacity-60">Enter</span>
          </Button>
          <Button onClick={onNextTest}>Next test</Button>
        </div>
      </div>
    </div>
  );
}
