"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalDataStore } from "@/store/local-data";

function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dailyStreak(dates: readonly string[], today: string): number {
  const completed = new Set(dates);
  const cursor = new Date(`${today}T00:00:00.000Z`);
  let streak = 0;
  while (completed.has(utcDate(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  if (streak > 0) return streak;
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (completed.has(utcDate(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default function DailyPage() {
  const { dailyRecords, hydrate } = useLocalDataStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    hydrate();
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [hydrate]);
  const date = utcDate(now);
  const today = dailyRecords.find((record) => record.date === date);
  const nextReset = useMemo(() => {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }, [date]);
  const seconds = Math.max(
    0,
    Math.floor((nextReset.getTime() - now.getTime()) / 1000),
  );
  const countdown = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}h ${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}m ${String(seconds % 60).padStart(2, "0")}s`;
  const streak = dailyStreak(
    dailyRecords.map((record) => record.date),
    date,
  );
  return (
    <PageFrame
      eyebrow="Daily challenge"
      title="One brief. Same seed. Every desk."
      description="The Daily Challenge is generated from the UTC date so every FinType player gets the same finance passage."
    >
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-xs tracking-[0.18em] text-accent uppercase">
              UTC {date}
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              Terms · 60s · medium
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              A fixed medium-difficulty Terms challenge. Your first completed
              attempt is the recorded daily score; retries are for fun.
            </p>
          </div>
          {today ? (
            <div className="rounded-lg border border-correct/40 bg-correct/10 p-4 text-right">
              <p className="text-xs text-muted">recorded score</p>
              <p className="mt-1 font-mono text-3xl text-correct">
                {Math.round(today.wpm)} WPM
              </p>
              <p className="font-mono text-xs text-muted">
                {today.accuracy.toFixed(1)}% accuracy
              </p>
            </div>
          ) : null}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={`/?daily=${date}`}>
            <Button size="lg">
              {today ? "Try again for fun" : "Start today’s challenge"}
            </Button>
          </Link>
          <span className="font-mono text-sm text-muted">
            next reset {countdown}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted">
          Reset is midnight UTC ({nextReset.toLocaleTimeString()} local time).
        </p>
      </Card>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Daily streak</h2>
          <p className="mt-2 font-mono text-4xl text-accent">{streak} days</p>
          <p className="mt-2 text-sm text-muted">
            Consecutive UTC dates with a recorded Daily result.
          </p>
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold">Last 14 days</h2>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }, (_, index) => {
              const day = new Date(`${date}T00:00:00.000Z`);
              day.setUTCDate(day.getUTCDate() - (13 - index));
              const key = utcDate(day);
              const record = dailyRecords.find((item) => item.date === key);
              return (
                <div
                  className="rounded-md border border-border p-2 text-center"
                  key={key}
                >
                  <p className="text-[10px] text-muted">{key.slice(5)}</p>
                  <p
                    className={
                      record
                        ? "mt-1 font-mono text-xs text-correct"
                        : "mt-1 font-mono text-xs text-muted"
                    }
                  >
                    {record ? Math.round(record.wpm) : "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card className="mt-5 p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Coming soon
        </p>
        <h2 className="mt-2 text-lg font-semibold">Global daily leaderboard</h2>
        <p className="mt-2 text-sm text-muted">
          Global daily leaderboard coming soon. Prompt 5 adds verified
          server-backed standings.
        </p>
      </Card>
    </PageFrame>
  );
}
