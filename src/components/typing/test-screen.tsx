"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ClipboardEvent,
  CompositionEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
} from "react";

import { getPlaceholderWords } from "@/content";
import { applyInput, createTest, finishTest, getResult } from "@/engine";
import type { TestInput, TestState } from "@/engine";
import { cn } from "@/lib/cn";
import { parseTestLength, useTestSessionStore } from "@/store/test-session";
import type { TestLengthKey } from "@/store/test-session";
import type { TestResult, TestSettings, Theme } from "@/types";

import { Card } from "../ui/card";
import { Kbd } from "../ui/kbd";
import { SegmentedControl } from "../ui/segmented-control";
import { useTheme } from "../ui/theme-provider";
import { TestResults } from "./test-results";
import { TypingWord } from "./typing-word";

const modeOptions = [
  { label: "terms", value: "terms" },
  {
    label: "office",
    value: "office",
    disabled: true,
    tooltip: "Coming in Prompt 3",
  },
  {
    label: "numbers",
    value: "numbers",
    disabled: true,
    tooltip: "Coming in Prompt 3",
  },
  {
    label: "excel",
    value: "excel",
    disabled: true,
    tooltip: "Coming in Prompt 3",
  },
  {
    label: "mixed",
    value: "mixed",
    disabled: true,
    tooltip: "Coming in Prompt 3",
  },
] as const;

const lengthOptions = [
  { label: "15s", value: "time:15" },
  { label: "30s", value: "time:30" },
  { label: "60s", value: "time:60" },
  { label: "120s", value: "time:120" },
  { label: "25", value: "words:25" },
  { label: "50", value: "words:50" },
  { label: "100", value: "words:100" },
] as const;

interface LiveStats {
  wpm: number;
  accuracy: number;
  now: number;
}

function createSeed(): string {
  if (typeof crypto !== "undefined") return crypto.randomUUID();
  return `session-${Math.round(performance.now())}`;
}

function createSettings(
  lengthKey: TestLengthKey,
  seed: string,
  theme: Theme,
): TestSettings {
  return {
    mode: "terms",
    length: parseTestLength(lengthKey),
    punctuation: true,
    numbers: true,
    difficulty: "medium",
    stopOnError: false,
    confidenceMode: false,
    theme,
    fontSize: "medium",
    caretStyle: "line",
    seed,
  };
}

function wordCountFor(lengthKey: TestLengthKey): number {
  const length = parseTestLength(lengthKey);
  return length.type === "words" ? length.words : 320;
}

function makeTest(
  lengthKey: TestLengthKey,
  seed: string,
  theme: Theme,
): TestState {
  return createTest(
    getPlaceholderWords(wordCountFor(lengthKey), seed),
    createSettings(lengthKey, seed, theme),
  );
}

export function TestScreen() {
  const { theme } = useTheme();
  const lengthKey = useTestSessionStore((state) => state.settings.lengthKey);
  const hydrated = useTestSessionStore((state) => state.hydrated);
  const hydrate = useTestSessionStore((state) => state.hydrate);
  const setLengthKey = useTestSessionStore((state) => state.setLengthKey);
  const setSession = useTestSessionStore((state) => state.setSession);
  const result = useTestSessionStore((state) => state.result);

  const initialState = useMemo(
    () => makeTest("time:30", "initial-session", "dark"),
    [],
  );
  const [engineState, setEngineState] = useState(initialState);
  const engineStateRef = useRef(engineState);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const caretAnchorRef = useRef<HTMLSpanElement | null>(null);
  const restartArmedRef = useRef(false);
  const [focused, setFocused] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    wpm: 0,
    accuracy: 100,
    now: 0,
  });
  const [caret, setCaret] = useState({ x: 0, y: 0, height: 34 });

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const commitState = useCallback(
    (nextState: TestState) => {
      engineStateRef.current = nextState;
      setEngineState(nextState);
      const nextResult =
        nextState.status === "finished" ? getResult(nextState) : null;
      setSession(nextState.status, nextResult);
      if (nextResult) {
        setLiveStats({
          wpm: nextResult.wpm,
          accuracy: nextResult.accuracy,
          now: nextState.endTimestampMs ?? 0,
        });
      }
    },
    [setSession],
  );

  const restart = useCallback(
    (options?: { reuseSeed?: boolean }) => {
      const current = engineStateRef.current;
      const seed = options?.reuseSeed ? current.settings.seed : createSeed();
      const nextState = makeTest(lengthKey, seed, theme);
      restartArmedRef.current = false;
      setLiveStats({ wpm: 0, accuracy: 100, now: 0 });
      commitState(nextState);
      requestAnimationFrame(focusInput);
    },
    [commitState, focusInput, lengthKey, theme],
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const frame = requestAnimationFrame(() => restart());
    return () => cancelAnimationFrame(frame);
  }, [hydrated, lengthKey, restart]);

  useEffect(() => {
    if (engineState.status !== "running") return;
    let animationFrame = 0;
    let lastStatsUpdate = -Infinity;

    const tick = (now: number) => {
      const current = engineStateRef.current;
      if (current.status !== "running") return;

      if (
        current.settings.length.type === "time" &&
        current.startTimestampMs !== null
      ) {
        const deadline =
          current.startTimestampMs + current.settings.length.seconds * 1000;
        if (now >= deadline) {
          commitState(finishTest(current, deadline));
          return;
        }
      }

      if (now - lastStatsUpdate >= 250) {
        const snapshot = getResult(current, now);
        setLiveStats({ wpm: snapshot.wpm, accuracy: snapshot.accuracy, now });
        lastStatsUpdate = now;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [commitState, engineState.status]);

  const dispatchInput = useCallback(
    (input: TestInput) => {
      const nextState = applyInput(
        engineStateRef.current,
        input,
        performance.now(),
      );
      if (nextState !== engineStateRef.current) {
        restartArmedRef.current = false;
        commitState(nextState);
      }
    },
    [commitState],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return;
      const current = engineStateRef.current;

      if (event.key === "Tab") {
        event.preventDefault();
        restartArmedRef.current = true;
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (restartArmedRef.current) restart();
        else if (current.status === "finished") restart({ reuseSeed: true });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        restart();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        dispatchInput(
          event.ctrlKey || event.altKey
            ? { type: "deleteWord" }
            : { type: "backspace" },
        );
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === " ") {
        event.preventDefault();
        if (!event.repeat) dispatchInput({ type: "space" });
        return;
      }
      if (!event.repeat && Array.from(event.key).length === 1) {
        event.preventDefault();
        dispatchInput({ type: "char", char: event.key });
      }
    },
    [dispatchInput, restart],
  );

  const handleBeforeInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const nativeEvent = event.nativeEvent as InputEvent;
      if (nativeEvent.isComposing || nativeEvent.inputType !== "insertText")
        return;
      const text = nativeEvent.data;
      if (!text) return;
      event.preventDefault();
      Array.from(text).forEach((character) => {
        dispatchInput(
          character === " "
            ? { type: "space" }
            : { type: "char", char: character },
        );
      });
    },
    [dispatchInput],
  );

  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      Array.from(event.data).forEach((character) => {
        dispatchInput(
          character === " "
            ? { type: "space" }
            : { type: "char", char: character },
        );
      });
    },
    [dispatchInput],
  );

  const preventTransfer = useCallback(
    (event: ClipboardEvent<HTMLInputElement> | DragEvent<HTMLInputElement>) =>
      event.preventDefault(),
    [],
  );

  const assignCaretAnchor = useCallback((node: HTMLSpanElement | null) => {
    caretAnchorRef.current = node;
  }, []);

  const measureCaret = useCallback(() => {
    const anchor = caretAnchorRef.current;
    const viewport = viewportRef.current;
    if (!anchor || !viewport) return;
    const anchorRect = anchor.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    setCaret({
      x: anchorRect.left - viewportRect.left,
      y: anchorRect.top - viewportRect.top,
      height: anchorRect.height || 34,
    });
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = caretAnchorRef.current;
    if (!viewport || !anchor || engineState.status === "finished") return;

    const viewportRect = viewport.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const lineHeight = 56;
    const relativeTop = anchorRect.top - viewportRect.top;
    if (relativeTop > lineHeight * 1.75 || relativeTop < lineHeight * 0.25) {
      const nextScroll = Math.max(
        0,
        viewport.scrollTop + relativeTop - lineHeight,
      );
      viewport.scrollTo({ top: nextScroll, behavior: "smooth" });
    }
    const frame = requestAnimationFrame(measureCaret);
    return () => cancelAnimationFrame(frame);
  }, [engineState, measureCaret]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resizeObserver = new ResizeObserver(measureCaret);
    resizeObserver.observe(viewport);
    viewport.addEventListener("scroll", measureCaret, { passive: true });
    window.addEventListener("resize", measureCaret);
    return () => {
      resizeObserver.disconnect();
      viewport.removeEventListener("scroll", measureCaret);
      window.removeEventListener("resize", measureCaret);
    };
  }, [measureCaret]);

  const selectedLength = parseTestLength(lengthKey);
  const timeRemaining =
    selectedLength.type === "time"
      ? engineState.startTimestampMs === null
        ? selectedLength.seconds
        : Math.max(
            0,
            Math.ceil(
              (engineState.startTimestampMs +
                selectedLength.seconds * 1000 -
                liveStats.now) /
                1000,
            ),
          )
      : null;

  const handleLengthChange = (nextLength: TestLengthKey) => {
    if (nextLength !== lengthKey) setLengthKey(nextLength);
  };

  const currentResult: TestResult | null = result;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="sr-only">FinType finance typing test</h1>
      <Card
        className="overflow-hidden"
        data-seed={engineState.settings.seed}
        data-testid="test-card"
      >
        <div className="flex flex-col gap-3 border-b border-border bg-background/35 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Test mode"
              options={modeOptions}
              value="terms"
            />
            <SegmentedControl
              label="Test length"
              onValueChange={handleLengthChange}
              options={lengthOptions}
              value={lengthKey}
            />
          </div>
          <div
            className={cn(
              "grid min-w-52 grid-cols-3 gap-5 px-1 text-right transition-opacity",
              engineState.status === "idle" && "opacity-55",
            )}
          >
            <div>
              <p className="text-xs text-muted">
                {selectedLength.type === "time" ? "time" : "words"}
              </p>
              <p
                className="font-mono text-sm text-foreground"
                data-testid="test-progress"
              >
                {selectedLength.type === "time"
                  ? timeRemaining
                  : `${engineState.currentWordIndex}/${engineState.words.length}`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">wpm</p>
              <p className="font-mono text-sm text-foreground">
                {Math.round(liveStats.wpm)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">accuracy</p>
              <p className="font-mono text-sm text-foreground">
                {liveStats.accuracy.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative cursor-text px-6 py-12 sm:px-10 sm:py-16 lg:px-16"
          onClick={focusInput}
          role="presentation"
        >
          <input
            aria-label="Typing input"
            autoCapitalize="off"
            autoComplete="off"
            className="absolute top-0 left-0 size-px opacity-0"
            onBeforeInput={handleBeforeInput}
            onBlur={() => setFocused(false)}
            onChange={() => undefined}
            onCompositionEnd={handleCompositionEnd}
            onCut={preventTransfer}
            onDrop={preventTransfer}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            onPaste={preventTransfer}
            spellCheck={false}
            value=""
          />

          {currentResult ? (
            <TestResults
              onNextTest={() => restart()}
              onTryAgain={() => restart({ reuseSeed: true })}
              result={currentResult}
            />
          ) : (
            <>
              <div
                className={cn(
                  "relative overflow-hidden transition-[filter,opacity] duration-150",
                  !focused &&
                    engineState.status === "running" &&
                    "opacity-45 blur-[2px]",
                )}
                data-testid="typing-viewport"
                ref={viewportRef}
                style={{ height: "168px", lineHeight: "56px" }}
              >
                <div className="font-mono text-[clamp(1.25rem,2.4vw,1.8rem)] tracking-[-0.035em]">
                  {engineState.words.map((word, index) => (
                    <TypingWord
                      active={index === engineState.currentWordIndex}
                      caretAnchorRef={assignCaretAnchor}
                      key={`${engineState.settings.seed}-${index}`}
                      word={word}
                    />
                  ))}
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute top-0 left-0 z-10 bg-accent transition-transform duration-100 motion-reduce:transition-none",
                    engineState.settings.caretStyle === "block"
                      ? "w-[0.62em] opacity-45"
                      : "w-[2px]",
                    engineState.status === "idle" &&
                      "motion-safe:animate-[caret-blink_1.05s_steps(1,end)_infinite]",
                  )}
                  style={{
                    height: `${caret.height}px`,
                    transform: `translate3d(${caret.x}px, ${caret.y}px, 0)`,
                  }}
                />
              </div>

              {!focused && engineState.status === "running" ? (
                <button
                  className="absolute inset-0 z-20 m-auto h-fit w-fit rounded-md border border-border bg-surface/95 px-4 py-2 text-sm text-foreground shadow-panel focus-visible:outline-2 focus-visible:outline-accent"
                  onClick={focusInput}
                  type="button"
                >
                  Click here to continue typing
                </button>
              ) : null}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border px-4 py-4 text-sm text-muted">
          <Kbd>tab</Kbd>
          <span>then</span>
          <Kbd>enter</Kbd>
          <span>new test</span>
          <span aria-hidden="true" className="mx-2 text-border">
            ·
          </span>
          <Kbd>esc</Kbd>
          <span>restart</span>
          <span className="sr-only" data-testid="engine-status">
            {engineState.status}
          </span>
        </div>
      </Card>
    </section>
  );
}
