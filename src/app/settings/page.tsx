"use client";

import { useEffect, useRef, useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/components/ui/theme-provider";
import { useToast } from "@/components/ui/toast";
import { DEFAULT_USER_SETTINGS } from "@/lib/storage";
import { useLocalDataStore } from "@/store/local-data";
import type { Theme, UserSettings } from "@/types";

const themes: Theme[] = ["dark", "light", "terminal", "wallstreet"];
const defaultLengths = [
  {
    label: "15 seconds",
    value: "time:15",
    length: { type: "time", seconds: 15 },
  },
  {
    label: "30 seconds",
    value: "time:30",
    length: { type: "time", seconds: 30 },
  },
  {
    label: "60 seconds",
    value: "time:60",
    length: { type: "time", seconds: 60 },
  },
  {
    label: "120 seconds",
    value: "time:120",
    length: { type: "time", seconds: 120 },
  },
  {
    label: "25 words",
    value: "words:25",
    length: { type: "words", words: 25 },
  },
  {
    label: "50 words",
    value: "words:50",
    length: { type: "words", words: 50 },
  },
  {
    label: "100 words",
    value: "words:100",
    length: { type: "words", words: 100 },
  },
] as const;

function defaultLengthValue(settings: UserSettings): string {
  return settings.defaultLength.type === "time"
    ? `time:${settings.defaultLength.seconds}`
    : `words:${settings.defaultLength.words}`;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    hydrated,
    settings,
    hydrate,
    setSettings,
    exportAll,
    importAll,
    clearAll,
  } = useLocalDataStore();
  const { show } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importChoice, setImportChoice] = useState<"merge" | "replace">(
    "merge",
  );
  useEffect(() => {
    hydrate();
  }, [hydrate]);
  if (!hydrated)
    return (
      <PageFrame
        eyebrow="Preferences"
        title="Loading settings"
        description="Restoring preferences from this device."
      >
        <Card className="h-48 animate-pulse" />
      </PageFrame>
    );
  const update = (patch: Partial<UserSettings>) =>
    setSettings({ ...settings, ...patch });
  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([exportAll()], { type: "application/json" }),
    );
    link.download = "fintype-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
    show("Export ready");
  };
  const importFile = async (file: File) => {
    const summary = importAll(await file.text(), importChoice);
    show(
      summary.imported
        ? `Imported ${summary.imported} tests`
        : "Nothing imported",
    );
  };
  return (
    <PageFrame
      eyebrow="Preferences"
      title="Tune the terminal."
      description="Every preference here is local, immediate, and carried into the next test."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {themes.map((item) => (
              <button
                aria-pressed={theme === item}
                className={`rounded-lg border p-3 text-left text-xs capitalize transition-colors ${theme === item ? "border-accent text-accent" : "border-border text-muted"}`}
                key={item}
                onClick={() => {
                  setTheme(item);
                  update({ theme: item });
                }}
                type="button"
              >
                <span
                  className={`mb-3 block h-8 rounded bg-${item === "light" ? "white" : "background"}`}
                />
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Font size
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) =>
                  update({
                    fontSize: event.target.value as UserSettings["fontSize"],
                  })
                }
                value={settings.fontSize}
              >
                {["small", "medium", "large", "xl"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Caret style
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) =>
                  update({
                    caretStyle: event.target
                      .value as UserSettings["caretStyle"],
                  })
                }
                value={settings.caretStyle}
              >
                {["line", "block", "underline"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Test defaults</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-muted">
              Mode
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) =>
                  update({
                    defaultMode: event.target
                      .value as UserSettings["defaultMode"],
                  })
                }
                value={settings.defaultMode}
              >
                {["terms", "office", "numbers", "excel", "mixed"].map(
                  (item) => (
                    <option key={item}>{item}</option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm text-muted">
              Difficulty
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) =>
                  update({
                    difficulty: event.target
                      .value as UserSettings["difficulty"],
                  })
                }
                value={settings.difficulty}
              >
                {["easy", "medium", "hard"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted">
              Quick restart
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) =>
                  update({
                    quickRestartKey: event.target
                      .value as UserSettings["quickRestartKey"],
                  })
                }
                value={settings.quickRestartKey}
              >
                <option value="tab-enter">Tab, then Enter</option>
                <option value="escape">Escape</option>
              </select>
            </label>
            <label className="text-sm text-muted">
              Default length
              <select
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                onChange={(event) => {
                  const selected = defaultLengths.find(
                    (item) => item.value === event.target.value,
                  );
                  if (selected) update({ defaultLength: selected.length });
                }}
                value={defaultLengthValue(settings)}
              >
                {defaultLengths.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["punctuation", "Punctuation"],
                ["numbers", "Numbers"],
                ["stopOnError", "Stop on error"],
                ["confidenceMode", "Confidence mode"],
              ] as const
            ).map(([key, label]) => (
              <label
                className="flex items-center gap-2 text-sm text-muted"
                key={key}
              >
                <input
                  checked={settings[key]}
                  onChange={(event) => update({ [key]: event.target.checked })}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Behavior & accessibility</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["smoothCaret", "Smooth caret"],
                ["showLiveWpm", "Show live WPM"],
                ["showLiveAccuracy", "Show live accuracy"],
                ["showTimer", "Show timer"],
                ["blindMode", "Blind mode"],
                ["highContrast", "High contrast"],
                ["largerCaret", "Larger caret"],
                ["focusMode", "Focus mode while typing"],
              ] as const
            ).map(([key, label]) => (
              <label
                className="flex items-center gap-2 text-sm text-muted"
                key={key}
              >
                <input
                  checked={settings[key]}
                  onChange={(event) => update({ [key]: event.target.checked })}
                  type="checkbox"
                />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm text-muted">
            Reduced motion
            <select
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
              onChange={(event) =>
                update({
                  reducedMotion: event.target
                    .value as UserSettings["reducedMotion"],
                })
              }
              value={settings.reducedMotion}
            >
              <option value="system">Follow system</option>
              <option value="on">Always on</option>
              <option value="off">Allow motion</option>
            </select>
          </label>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Tab, then Enter", "New test"],
              ["Escape", "Restart / release focus"],
              ["Shift + Enter", "Retry same text"],
              ["Backspace", "Correct the current word"],
              ["Ctrl/Alt + Backspace", "Delete the current word"],
            ].map(([key, action]) => (
              <div className="rounded border border-border p-3" key={key}>
                <dt className="font-mono text-accent">{key}</dt>
                <dd className="mt-1 text-muted">{action}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Local data</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Data stays in this browser until you export it. Prompt 5 can replace
            this repository with a synced implementation.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={download} variant="secondary">
              Export JSON
            </Button>
            <Button
              onClick={() => fileRef.current?.click()}
              variant="secondary"
            >
              Import JSON
            </Button>
            <select
              aria-label="Import strategy"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              onChange={(event) =>
                setImportChoice(event.target.value as "merge" | "replace")
              }
              value={importChoice}
            >
              <option value="merge">Merge import</option>
              <option value="replace">Replace local data</option>
            </select>
            <input
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importFile(file);
              }}
              ref={fileRef}
              type="file"
            />
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              if (
                window.confirm(
                  "Delete every local test, setting, and profile record?",
                )
              ) {
                clearAll();
                setSettings(DEFAULT_USER_SETTINGS);
                setTheme(DEFAULT_USER_SETTINGS.theme);
                show("Local data deleted");
              }
            }}
            variant="ghost"
          >
            Delete all local data
          </Button>
        </Card>
      </div>
      <Card className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Reset settings</h2>
            <p className="mt-1 text-sm text-muted">
              Restore the product defaults without deleting test history.
            </p>
          </div>
          <Button
            onClick={() => {
              setSettings(DEFAULT_USER_SETTINGS);
              setTheme(DEFAULT_USER_SETTINGS.theme);
              show("Settings reset");
            }}
            variant="secondary"
          >
            Reset settings
          </Button>
        </div>
      </Card>
    </PageFrame>
  );
}
