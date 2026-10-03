"use client";

import { useEffect, useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocalDataStore } from "@/store/local-data";

export default function LeaderboardPage() {
  const { hydrated, tests, hydrate } = useLocalDataStore();
  const [tab, setTab] = useState("All-time");
  const [boardRows, setBoardRows] = useState<
    Array<{
      username?: string;
      wpm?: string | number;
      accuracy?: string | number;
      rank?: number;
      mode?: string;
    }>
  >([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/leaderboard?board=${tab.toLowerCase().replace("-", "-")}`)
      .then((response) => response.json())
      .then((payload: { configured?: boolean; rows?: typeof boardRows }) => {
        if (!cancelled) {
          setConfigured(payload.configured ?? false);
          setBoardRows(payload.rows ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);
  const bests = [...tests]
    .filter((test) => test.isPersonalBest)
    .sort((a, b) => b.wpm - a.wpm);
  return (
    <PageFrame
      eyebrow="Rankings"
      title="Your numbers, without fake names."
      description="Global leaderboards launch with accounts and server-side replay validation. Until then, this is your private local board."
    >
      <div className="flex flex-wrap gap-2">
        {["All-time", "Weekly", "Daily"].map((item) => (
          <Button
            key={item}
            onClick={() => setTab(item)}
            variant={tab === item ? "primary" : "secondary"}
          >
            {item}
          </Button>
        ))}
      </div>
      <Card className="mt-5 p-6">
        <p className="font-mono text-xs tracking-[0.18em] text-accent uppercase">
          {tab} global board
        </p>
        {configured === false ? (
          <>
            <h2 className="mt-3 text-2xl font-semibold">
              Global boards are not configured.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              This deployment is running in local-first mode. Sign-in and
              verified rankings become available after the optional database and
              auth variables are added.
            </p>
          </>
        ) : boardRows.length === 0 ? (
          <>
            <h2 className="mt-3 text-2xl font-semibold">
              No verified results yet.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Complete a verified test to be the first entry on this board.
            </p>
          </>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="pb-2">rank</th>
                  <th className="pb-2">username</th>
                  <th className="pb-2">WPM</th>
                  <th className="pb-2">accuracy</th>
                </tr>
              </thead>
              <tbody>
                {boardRows.map((row) => (
                  <tr
                    className="border-t border-border"
                    key={`${row.username}-${row.rank}`}
                  >
                    <td className="py-2 font-mono">{row.rank}</td>
                    <td className="py-2 text-accent">{row.username}</td>
                    <td className="py-2 font-mono">
                      {Math.round(Number(row.wpm ?? 0))}
                    </td>
                    <td className="py-2 font-mono">
                      {Number(row.accuracy ?? 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="mt-5 p-6">
        <h2 className="text-lg font-semibold">Your personal bests</h2>
        {!hydrated || bests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Complete a test to establish your first local best.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th className="pb-2">mode</th>
                  <th className="pb-2">length</th>
                  <th className="pb-2">WPM</th>
                  <th className="pb-2">accuracy</th>
                  <th className="pb-2">rank</th>
                </tr>
              </thead>
              <tbody>
                {bests.map((test) => (
                  <tr className="border-t border-border" key={test.id}>
                    <td className="py-2">{test.mode}</td>
                    <td className="py-2 text-muted">
                      {test.length.type === "time"
                        ? `${test.length.seconds}s`
                        : `${test.length.words} words`}
                    </td>
                    <td className="py-2 font-mono text-accent">
                      {Math.round(test.wpm)}
                    </td>
                    <td className="py-2 font-mono">
                      {test.accuracy.toFixed(1)}%
                    </td>
                    <td className="py-2">{test.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageFrame>
  );
}
