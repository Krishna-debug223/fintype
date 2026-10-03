"use client";

import { useEffect, useMemo, useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useLocalDataStore } from "@/store/local-data";
import type { Difficulty, Mode, SavedTest } from "@/types";

function lengthLabel(test: SavedTest): string {
  return test.length.type === "time"
    ? `${test.length.seconds}s`
    : `${test.length.words} words`;
}

function lengthKey(test: SavedTest): string {
  return test.length.type === "time"
    ? `time:${test.length.seconds}`
    : `words:${test.length.words}`;
}

function exportCsv(tests: SavedTest[]): string {
  const rows = [
    [
      "date",
      "mode",
      "length",
      "difficulty",
      "wpm",
      "raw",
      "accuracy",
      "consistency",
      "errors",
      "rank",
      "personalBest",
    ],
    ...tests.map((test) => [
      test.createdAt,
      test.mode,
      lengthLabel(test),
      test.difficulty,
      String(Math.round(test.wpm)),
      String(Math.round(test.rawWpm)),
      String(test.accuracy),
      String(test.consistency),
      String(test.errors),
      test.rank,
      String(test.isPersonalBest),
    ]),
  ];
  return rows
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

function download(name: string, content: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function HistoryPage() {
  const { hydrated, tests, hydrate, deleteTest, clearAll, exportAll } =
    useLocalDataStore();
  const { show } = useToast();
  const query =
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const [mode, setMode] = useState<Mode | "all">(
    (query.get("mode") as Mode | "all") || "all",
  );
  const [difficulty, setDifficulty] = useState<Difficulty | "all">(
    (query.get("difficulty") as Difficulty | "all") || "all",
  );
  const [length, setLength] = useState(query.get("length") || "all");
  const [range, setRange] = useState(query.get("range") || "all");
  const [bestsOnly, setBestsOnly] = useState(query.get("bests") === "1");
  const [sort, setSort] = useState(query.get("sort") || "date-desc");
  const [clock, setClock] = useState(0);
  const [selected, setSelected] = useState<SavedTest | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    hydrate();
    const timer = window.setTimeout(() => setClock(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    if (mode !== "all") params.set("mode", mode);
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (length !== "all") params.set("length", length);
    if (range !== "all") params.set("range", range);
    if (sort !== "date-desc") params.set("sort", sort);
    if (bestsOnly) params.set("bests", "1");
    window.history.replaceState(
      null,
      "",
      params.size ? `/history?${params}` : "/history",
    );
  }, [bestsOnly, difficulty, hydrated, length, mode, range, sort]);

  const filtered = useMemo(() => {
    const cutoff =
      range === "all" || clock === 0 ? 0 : clock - Number(range) * 86_400_000;
    const result = tests.filter(
      (test) =>
        (mode === "all" || test.mode === mode) &&
        (difficulty === "all" || test.difficulty === difficulty) &&
        (length === "all" || lengthKey(test) === length) &&
        (!bestsOnly || test.isPersonalBest) &&
        new Date(test.createdAt).getTime() >= cutoff,
    );
    return result.sort((a, b) =>
      sort === "wpm-desc"
        ? b.wpm - a.wpm
        : sort === "wpm-asc"
          ? a.wpm - b.wpm
          : sort === "accuracy-desc"
            ? b.accuracy - a.accuracy
            : sort === "accuracy-asc"
              ? a.accuracy - b.accuracy
              : b.createdAt.localeCompare(a.createdAt),
    );
  }, [bestsOnly, clock, difficulty, length, mode, range, sort, tests]);
  const visible = filtered.slice(0, page * 25);

  if (!hydrated)
    return (
      <PageFrame
        eyebrow="Test history"
        title="Loading your tape"
        description="Restoring local results from this device."
      >
        <Card className="h-48 animate-pulse" />
      </PageFrame>
    );
  return (
    <PageFrame
      eyebrow="Test history"
      title="Your tape, in full."
      description="Completed tests stay on this device. Filter, inspect, export, or remove them whenever you like."
    >
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <select
          aria-label="History mode"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => {
            setMode(event.target.value as Mode | "all");
            setPage(1);
          }}
          value={mode}
        >
          <option value="all">All modes</option>
          {["terms", "office", "numbers", "excel", "mixed", "custom"].map(
            (item) => (
              <option key={item}>{item}</option>
            ),
          )}
        </select>
        <select
          aria-label="History difficulty"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) =>
            setDifficulty(event.target.value as Difficulty | "all")
          }
          value={difficulty}
        >
          <option value="all">All difficulty</option>
          {["easy", "medium", "hard"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          aria-label="History length"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => {
            setLength(event.target.value);
            setPage(1);
          }}
          value={length}
        >
          <option value="all">All lengths</option>
          {[
            ["time:15", "15 seconds"],
            ["time:30", "30 seconds"],
            ["time:60", "60 seconds"],
            ["time:120", "120 seconds"],
            ["words:25", "25 words"],
            ["words:50", "50 words"],
            ["words:100", "100 words"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="History date range"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => setRange(event.target.value)}
          value={range}
        >
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <select
          aria-label="History sort"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          onChange={(event) => setSort(event.target.value)}
          value={sort}
        >
          <option value="date-desc">Newest</option>
          <option value="wpm-desc">WPM high</option>
          <option value="wpm-asc">WPM low</option>
          <option value="accuracy-desc">Accuracy high</option>
          <option value="accuracy-asc">Accuracy low</option>
        </select>
        <label className="flex items-center gap-2 px-2 text-sm text-muted">
          <input
            checked={bestsOnly}
            onChange={(event) => setBestsOnly(event.target.checked)}
            type="checkbox"
          />{" "}
          personal bests
        </label>
        <span className="flex-1" />
        <Button
          onClick={() =>
            download("fintype-history.json", exportAll(), "application/json")
          }
          size="sm"
          variant="secondary"
        >
          Export JSON
        </Button>
        <Button
          onClick={() =>
            download("fintype-history.csv", exportCsv(filtered), "text/csv")
          }
          size="sm"
          variant="secondary"
        >
          Export CSV
        </Button>
        <Button
          onClick={() => {
            if (window.confirm("Delete all local history?")) {
              clearAll();
              show("History deleted");
            }
          }}
          size="sm"
          variant="ghost"
        >
          Delete all
        </Button>
      </div>
      {visible.length === 0 ? (
        <Card className="mt-4 p-8 text-center">
          <p className="text-lg text-foreground">No completed tests yet.</p>
          <p className="mt-2 text-sm text-muted">
            Finish a test on the home screen and your local tape will appear
            here.
          </p>
        </Card>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs tracking-wide text-muted uppercase">
                <tr>
                  {[
                    "date",
                    "mode",
                    "length",
                    "difficulty",
                    "wpm",
                    "raw",
                    "accuracy",
                    "consistency",
                    "errors",
                    "rank",
                    "",
                  ].map((heading) => (
                    <th className="px-4 py-3" key={heading}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((test) => (
                  <tr
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-background/40"
                    key={test.id}
                    onClick={() => setSelected(test)}
                  >
                    <td className="px-4 py-3 text-muted">
                      {new Date(test.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-foreground">{test.mode}</td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {lengthLabel(test)}
                    </td>
                    <td className="px-4 py-3 text-muted">{test.difficulty}</td>
                    <td className="px-4 py-3 font-mono text-accent">
                      {Math.round(test.wpm)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {Math.round(test.rawWpm)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {test.accuracy.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 font-mono">{test.consistency}%</td>
                    <td className="px-4 py-3 font-mono">{test.errors}</td>
                    <td className="px-4 py-3">{test.rank}</td>
                    <td className="px-4 py-3 text-accent">
                      {test.isPersonalBest ? "★" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visible.length < filtered.length ? (
            <Button
              className="mt-4"
              onClick={() => setPage((value) => value + 1)}
              variant="secondary"
            >
              Load more
            </Button>
          ) : null}
        </>
      )}
      {selected ? (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <Card
            className="max-h-[80vh] w-full max-w-xl overflow-auto p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-accent uppercase">
                  Saved test
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {Math.round(selected.wpm)} WPM · {selected.mode}
                </h2>
              </div>
              <Button
                onClick={() => setSelected(null)}
                size="sm"
                variant="ghost"
              >
                Close
              </Button>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">Accuracy</dt>
                <dd className="font-mono text-foreground">
                  {selected.accuracy.toFixed(1)}%
                </dd>
              </div>
              <div>
                <dt className="text-muted">Rank</dt>
                <dd className="font-mono text-foreground">{selected.rank}</dd>
              </div>
              <div>
                <dt className="text-muted">Errors</dt>
                <dd className="font-mono text-foreground">{selected.errors}</dd>
              </div>
              <div>
                <dt className="text-muted">Log</dt>
                <dd className="font-mono text-foreground">
                  {selected.keystrokeLog ? "retained" : "trimmed for retention"}
                </dd>
              </div>
            </dl>
            <Button
              className="mt-6"
              onClick={() => {
                deleteTest(selected.id);
                setSelected(null);
                show("Test deleted");
              }}
              variant="secondary"
            >
              Delete test
            </Button>
          </Card>
        </div>
      ) : null}
    </PageFrame>
  );
}
