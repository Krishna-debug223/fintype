"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  ClipboardEvent,
  CompositionEvent,
  DragEvent,
  FormEvent,
} from "react";

import { CONTENT_VERSION, getModeWords } from "@/content";
import {
  applyInput,
  createTest,
  finishTest,
  getCharMistakes,
  getResult,
  getSlowestWords,
  getSymbolAccuracy,
} from "@/engine";
import type { TestInput, TestState } from "@/engine";
import { cn } from "@/lib/cn";
import { parseTestLength, useTestSessionStore } from "@/store/test-session";
import type { TestLengthKey } from "@/store/test-session";
import type { Mode, TestResult, TestSettings, Theme } from "@/types";
import { useLocalDataStore } from "@/store/local-data";
import { DEFAULT_USER_SETTINGS } from "@/lib/storage";

import { Card } from "../ui/card";
import { Kbd } from "../ui/kbd";
import { SegmentedControl } from "../ui/segmented-control";
import { useTheme } from "../ui/theme-provider";
import { TestResults } from "./test-results";
import {
  getCaretPosition,
  getCaretScrollTop,
  TYPING_LINE_HEIGHT_PX,
} from "./caret";
import {
  armTabRestart,
  getTabRestartAction,
  TAB_RESTART_HINT_MS,
} from "./interaction";
import { TypingWord } from "./typing-word";
import { useFocusMode } from "./focus-mode";
import { formatTimerValue, isTimerWarning, timerAnnouncement } from "./timer";

const modeOptions = [
  { label: "terms", value: "terms" },
  { label: "office", value: "office" },
  { label: "numbers", value: "numbers" },
  { label: "excel", value: "excel" },
  { label: "mixed", value: "mixed" },
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
  mode: Mode,
  lengthKey: TestLengthKey,
  seed: string,
  theme: Theme,
  preferences = DEFAULT_USER_SETTINGS,
): TestSettings {
  return {
    mode,
    length: parseTestLength(lengthKey),
    punctuation: preferences.punctuation,
    numbers: preferences.numbers,
    difficulty: preferences.difficulty,
    stopOnError: preferences.stopOnError,
    confidenceMode: preferences.confidenceMode,
    theme,
    fontSize: preferences.fontSize,
    caretStyle: preferences.caretStyle,
    seed,
    contentVersion: CONTENT_VERSION,
  };
}

function wordCountFor(lengthKey: TestLengthKey): number {
  const length = parseTestLength(lengthKey);
  if (length.type === "words") return length.words;
  return length.seconds === 15
    ? 100
    : length.seconds === 30
      ? 200
      : length.seconds === 60
        ? 350
        : 650;
}

function makeTest(
  mode: Mode,
  lengthKey: TestLengthKey,
  seed: string,
  theme: Theme,
  preferences = DEFAULT_USER_SETTINGS,
): TestState {
  return createTest(
    getModeWords(mode, wordCountFor(lengthKey), seed),
    createSettings(mode, lengthKey, seed, theme, preferences),
  );
}

function isEditableTarget(
  target: EventTarget | null,
  captureInput: HTMLInputElement | null,
): boolean {
  if (!(target instanceof HTMLElement) || target === captureInput) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""]',
    ),
  );
}

function hasOpenModal(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"], [data-modal-open="true"]'),
  );
}

export function TestScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const lengthKey = useTestSessionStore((state) => state.settings.lengthKey);
  const mode = useTestSessionStore((state) => state.settings.mode);
  const hydrated = useTestSessionStore((state) => state.hydrated);
  const hydrate = useTestSessionStore((state) => state.hydrate);
  const setLengthKey = useTestSessionStore((state) => state.setLengthKey);
  const setMode = useTestSessionStore((state) => state.setMode);
  const setSession = useTestSessionStore((state) => state.setSession);
  const result = useTestSessionStore((state) => state.result);
  const saveCompleted = useLocalDataStore((state) => state.saveCompleted);
  const recordDaily = useLocalDataStore((state) => state.recordDaily);
  const localSettings = useLocalDataStore((state) => state.settings);
  const hydrateLocalData = useLocalDataStore((state) => state.hydrate);
  const {
    active: focusActive,
    enter: enterFocusMode,
    exit: exitFocusMode,
    onPointerMove: handleFocusPointerMove,
    onTouchStart: handleFocusTouchStart,
  } = useFocusMode(localSettings.focusMode);

  const initialState = useMemo(
    () =>
      makeTest(
        "terms",
        "time:30",
        "initial-session",
        "dark",
        DEFAULT_USER_SETTINGS,
      ),
    [],
  );
  const [engineState, setEngineState] = useState(initialState);
  const engineStateRef = useRef(engineState);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const caretAnchorRef = useRef<HTMLSpanElement | null>(null);
  const restartArmedAtRef = useRef<number | null>(null);
  const tabHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEscapeAtRef = useRef<number | null>(null);
  const savedResultKeyRef = useRef<string | null>(null);
  const savedTestIdRef = useRef<string | null>(null);
  const retryOfTestIdRef = useRef<string | null>(null);
  const dailySeedRef = useRef<string | null>(null);
  const restartRef = useRef<(options?: { reuseSeed?: boolean }) => void>(
    () => undefined,
  );
  const keyDownRef = useRef<(event: globalThis.KeyboardEvent) => void>(
    () => undefined,
  );
  const [focused, setFocused] = useState(false);
  const [tabHintVisible, setTabHintVisible] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    wpm: 0,
    accuracy: 100,
    now: 0,
  });
  const [timerNow, setTimerNow] = useState(0);
  const [caret, setCaret] = useState({ x: 0, y: 0, height: 34 });
  const [resultDetails, setResultDetails] = useState<{
    isPersonalBest: boolean;
    previousBestWpm: number | null;
    slowestWords: ReturnType<typeof getSlowestWords>;
    mistakes: ReturnType<typeof getCharMistakes>;
    symbolAccuracy: ReturnType<typeof getSymbolAccuracy>;
  } | null>(null);

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const daily = new URLSearchParams(window.location.search).get("daily");
    if (daily) {
      dailySeedRef.current = `daily:${daily}`;
      setMode("daily");
      setLengthKey("time:60");
    }
  }, [setLengthKey, setMode]);

  const commitState = useCallback(
    (nextState: TestState) => {
      engineStateRef.current = nextState;
      setEngineState(nextState);
      const nextResult =
        nextState.status === "finished" ? getResult(nextState) : null;
      setSession(nextState.status, nextResult);
      if (nextResult) {
        exitFocusMode();
        const resultKey = `${nextResult.seed}:${nextState.endTimestampMs ?? "finished"}`;
        if (savedResultKeyRef.current !== resultKey) {
          const retryOfTestId = retryOfTestIdRef.current;
          const outcome = saveCompleted(nextResult, nextState.keystrokeLog, {
            retryOfTestId,
          });
          savedResultKeyRef.current = resultKey;
          savedTestIdRef.current = outcome.test.id;
          retryOfTestIdRef.current = null;
          setResultDetails({
            isPersonalBest: outcome.test.isPersonalBest,
            previousBestWpm: outcome.previousBest?.wpm ?? null,
            slowestWords: getSlowestWords(nextState),
            mistakes: getCharMistakes(nextState),
            symbolAccuracy: getSymbolAccuracy(nextState),
          });
          if (nextResult.mode === "daily" && retryOfTestId === null) {
            recordDaily({
              date: new Date().toISOString().slice(0, 10),
              wpm: nextResult.wpm,
              accuracy: nextResult.accuracy,
              testId: outcome.test.id,
              contentVersion:
                nextResult.settings.contentVersion ?? CONTENT_VERSION,
            });
          }
        }
        setLiveStats({
          wpm: nextResult.wpm,
          accuracy: nextResult.accuracy,
          now: nextState.endTimestampMs ?? 0,
        });
        setTimerNow(nextState.endTimestampMs ?? 0);
      }
    },
    [exitFocusMode, recordDaily, saveCompleted, setSession],
  );

  const restart = useCallback(
    (options?: { reuseSeed?: boolean }) => {
      const current = engineStateRef.current;
      if (options?.reuseSeed) retryOfTestIdRef.current = savedTestIdRef.current;
      else retryOfTestIdRef.current = null;
      const seed = options?.reuseSeed
        ? current.settings.seed
        : (dailySeedRef.current ?? createSeed());
      dailySeedRef.current = null;
      const nextState = makeTest(mode, lengthKey, seed, theme, localSettings);
      exitFocusMode();
      restartArmedAtRef.current = null;
      setTabHintVisible(false);
      if (!options?.reuseSeed) setResultDetails(null);
      setLiveStats({ wpm: 0, accuracy: 100, now: 0 });
      setTimerNow(0);
      commitState(nextState);
      requestAnimationFrame(focusInput);
    },
    [
      commitState,
      exitFocusMode,
      focusInput,
      lengthKey,
      localSettings,
      mode,
      theme,
    ],
  );

  useEffect(() => {
    hydrate();
    hydrateLocalData();
  }, [hydrate, hydrateLocalData]);

  useEffect(() => {
    const onBlur = () => exitFocusMode();
    window.addEventListener("blur", onBlur);
    const observer = new MutationObserver(() => {
      if (hasOpenModal()) exitFocusMode();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    return () => {
      window.removeEventListener("blur", onBlur);
      observer.disconnect();
    };
  }, [exitFocusMode]);

  useEffect(() => {
    restartRef.current = restart;
  }, [restart]);

  useEffect(() => {
    if (!hydrated) return;
    const frame = requestAnimationFrame(() => restartRef.current());
    return () => cancelAnimationFrame(frame);
  }, [
    hydrated,
    lengthKey,
    localSettings.caretStyle,
    localSettings.confidenceMode,
    localSettings.difficulty,
    localSettings.fontSize,
    localSettings.numbers,
    localSettings.punctuation,
    localSettings.stopOnError,
    mode,
    theme,
  ]);

  useEffect(() => {
    if (engineState.status !== "running") return;
    let animationFrame = 0;
    let lastStatsUpdate = -Infinity;

    const tick = (now: number) => {
      const current = engineStateRef.current;
      if (current.status !== "running") return;
      setTimerNow(now);

      if (
        current.settings.length.type === "time" &&
        current.startTimestampMs !== null
      ) {
        const deadline =
          current.startTimestampMs + current.settings.length.seconds * 1000;
        if (now >= deadline) {
          exitFocusMode();
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
  }, [commitState, engineState.status, exitFocusMode]);

  const dispatchInput = useCallback(
    (input: TestInput) => {
      const previous = engineStateRef.current;
      const now = performance.now();
      const nextState = applyInput(previous, input, now);
      if (nextState !== previous) {
        setTimerNow(now);
        if (previous.status === "idle" && nextState.status === "running")
          enterFocusMode(now);
        if (nextState.status === "finished") exitFocusMode();
        restartArmedAtRef.current = null;
        setTabHintVisible(false);
        commitState(nextState);
      }
    },
    [commitState, enterFocusMode, exitFocusMode],
  );

  const clearTabRestartHint = useCallback(() => {
    restartArmedAtRef.current = null;
    setTabHintVisible(false);
    if (tabHintTimerRef.current) {
      clearTimeout(tabHintTimerRef.current);
      tabHintTimerRef.current = null;
    }
  }, []);

  const showTabRestartHint = useCallback(() => {
    restartArmedAtRef.current = armTabRestart(performance.now());
    setTabHintVisible(true);
    if (tabHintTimerRef.current) clearTimeout(tabHintTimerRef.current);
    tabHintTimerRef.current = setTimeout(() => {
      restartArmedAtRef.current = null;
      setTabHintVisible(false);
      tabHintTimerRef.current = null;
    }, TAB_RESTART_HINT_MS);
  }, []);

  const handleKeyDown = useCallback(
    (event: globalThis.KeyboardEvent) => {
      if (event.isComposing) return;
      const current = engineStateRef.current;

      if (
        event.key === "Tab" &&
        localSettings.quickRestartKey === "tab-enter"
      ) {
        if (event.shiftKey) return;
        event.preventDefault();
        showTabRestartHint();
        focusInput();
        return;
      }

      const tabAction =
        localSettings.quickRestartKey === "tab-enter"
          ? getTabRestartAction(
              event.key,
              restartArmedAtRef.current,
              performance.now(),
            )
          : null;
      if (tabAction === "restart") {
        event.preventDefault();
        clearTabRestartHint();
        restart();
        focusInput();
        return;
      }
      if (tabAction === "cancel") {
        clearTabRestartHint();
      } else if (restartArmedAtRef.current !== null) {
        clearTabRestartHint();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (current.status === "finished") {
          restart({ reuseSeed: event.shiftKey });
          focusInput();
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        const now = performance.now();
        const releaseFocus =
          lastEscapeAtRef.current !== null &&
          now - lastEscapeAtRef.current < 600;
        lastEscapeAtRef.current = now;
        if (releaseFocus) {
          inputRef.current?.blur();
          setFocused(false);
          return;
        }
        restart();
        focusInput();
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        if (event.metaKey) return;
        dispatchInput(
          event.ctrlKey || event.altKey
            ? { type: "deleteWord" }
            : { type: "backspace" },
        );
        focusInput();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === " ") {
        event.preventDefault();
        if (!event.repeat) {
          dispatchInput({ type: "space" });
          focusInput();
        }
        return;
      }
      if (!event.repeat && Array.from(event.key).length === 1) {
        event.preventDefault();
        dispatchInput({ type: "char", char: event.key });
        focusInput();
      }
    },
    [
      clearTabRestartHint,
      dispatchInput,
      focusInput,
      restart,
      showTabRestartHint,
      localSettings.quickRestartKey,
    ],
  );

  // The document listener is the single physical-key source of truth. The
  // visually hidden input remains only for mobile keyboards and IME events.
  useEffect(() => {
    keyDownRef.current = handleKeyDown;
  }, [handleKeyDown]);

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
      if (isEditableTarget(event.target, inputRef.current) || hasOpenModal())
        return;
      keyDownRef.current(event);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  useEffect(
    () => () => {
      if (tabHintTimerRef.current) clearTimeout(tabHintTimerRef.current);
    },
    [],
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
    if (!anchor) return;
    setCaret(getCaretPosition(anchor));
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const anchor = caretAnchorRef.current;
    if (!viewport || !anchor || engineState.status === "finished") return;

    const nextScroll = getCaretScrollTop(
      anchor.offsetTop,
      viewport.clientHeight,
      TYPING_LINE_HEIGHT_PX,
    );
    if (Math.abs(nextScroll - viewport.scrollTop) > 1) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const reducedByPreference =
        localSettings.reducedMotion === "on" ||
        (localSettings.reducedMotion === "system" && reduceMotion);
      viewport.scrollTo({
        top: nextScroll,
        behavior:
          reducedByPreference || !localSettings.smoothCaret ? "auto" : "smooth",
      });
    }
    measureCaret();
  }, [
    engineState,
    localSettings.reducedMotion,
    localSettings.smoothCaret,
    measureCaret,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const lines = linesRef.current;
    if (!viewport || !lines) return;
    const resizeObserver = new ResizeObserver(measureCaret);
    resizeObserver.observe(viewport);
    resizeObserver.observe(lines);
    window.addEventListener("resize", measureCaret);
    const fontReady = document.fonts?.ready.then(measureCaret);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureCaret);
      void fontReady;
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
                timerNow) /
                1000,
            ),
          )
      : null;
  const completedWordCount =
    engineState.status === "finished"
      ? engineState.words.length
      : engineState.currentWordIndex;
  const timerMode = selectedLength.type === "time" ? "time" : "words";
  const timerValue =
    selectedLength.type === "time" ? (timeRemaining ?? 0) : completedWordCount;
  const timerText = formatTimerValue(
    timerMode,
    timerValue,
    engineState.words.length,
  );
  const timerWarning =
    selectedLength.type === "time" && isTimerWarning(timeRemaining);
  const lastTimerAnnouncementRef = useRef("");
  const [timerAnnouncementText, setTimerAnnouncementText] = useState("");
  useEffect(() => {
    const candidate = timerAnnouncement(
      engineState.status,
      timerMode,
      timerValue,
      engineState.words.length,
    );
    if (candidate && candidate !== lastTimerAnnouncementRef.current) {
      lastTimerAnnouncementRef.current = candidate;
      setTimerAnnouncementText(candidate);
    }
  }, [engineState.status, engineState.words.length, timerMode, timerValue]);

  const handleLengthChange = (nextLength: TestLengthKey) => {
    if (nextLength !== lengthKey) setLengthKey(nextLength);
  };

  const handleModeChange = (nextMode: Mode) => {
    if (nextMode !== mode) setMode(nextMode);
  };

  const currentResult: TestResult | null = result;

  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-16",
        focusActive && "cursor-none",
      )}
      data-focus-mode-wrapper={focusActive ? "active" : "idle"}
      data-testid="focus-mode-wrapper"
      onPointerMove={handleFocusPointerMove}
      onTouchStart={handleFocusTouchStart}
    >
      <h1 className="sr-only">FinType finance typing test</h1>
      <Card
        className="overflow-hidden"
        data-seed={engineState.settings.seed}
        data-testid="test-card"
      >
        <div
          className="flex flex-col gap-3 border-b border-border bg-background/35 px-4 py-4 transition-opacity duration-200 lg:flex-row lg:items-center lg:justify-between lg:px-6"
          data-focus-chrome
          data-testid="test-controls"
        >
          <div className="flex flex-wrap gap-2">
            <SegmentedControl
              label="Test mode"
              onValueChange={handleModeChange}
              options={modeOptions}
              value={mode}
            />
            <SegmentedControl
              label="Test length"
              onValueChange={handleLengthChange}
              options={lengthOptions}
              value={lengthKey}
            />
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
            onPaste={preventTransfer}
            ref={inputRef}
            spellCheck={false}
            value=""
          />

          {currentResult ? (
            <TestResults
              onNextTest={() => restart()}
              onTryAgain={() => restart({ reuseSeed: true })}
              onViewHistory={() => {
                router.push("/history");
              }}
              result={currentResult}
              details={resultDetails}
              reducedMotion={localSettings.reducedMotion}
            />
          ) : (
            <>
              <div
                className="mb-6 flex items-end gap-4"
                data-testid="timer-block"
              >
                {localSettings.showTimer ? (
                  <p
                    className={cn(
                      "font-mono text-[clamp(2.5rem,6vw,3.5rem)] leading-none tracking-[-0.06em] text-accent tabular-nums transition-[opacity,color,filter] duration-200",
                      engineState.status === "idle" && "opacity-50",
                      timerWarning &&
                        "brightness-125 motion-safe:animate-[timer-pulse_1.4s_ease-in-out_infinite]",
                    )}
                    data-testid="timer"
                    data-warning={timerWarning ? "true" : "false"}
                  >
                    {timerText}
                  </p>
                ) : null}
                <span className="sr-only" data-testid="test-progress">
                  {timerText}
                </span>
                <div
                  className="flex gap-3 pb-1 font-mono text-xs text-muted"
                  data-testid="live-stats"
                >
                  {localSettings.showLiveWpm && !localSettings.blindMode ? (
                    <span>{Math.round(liveStats.wpm)} wpm</span>
                  ) : null}
                  {localSettings.showLiveAccuracy &&
                  !localSettings.blindMode ? (
                    <span>{liveStats.accuracy.toFixed(0)}%</span>
                  ) : null}
                </div>
              </div>
              <div
                aria-live="polite"
                className="sr-only"
                data-testid="timer-announcements"
              >
                {timerAnnouncementText}
              </div>
              <div
                className={cn(
                  "relative overflow-hidden transition-[filter,opacity] duration-150",
                  !focused &&
                    engineState.status === "running" &&
                    "opacity-45 blur-[2px]",
                  localSettings.blindMode &&
                    "[&_.text-incorrect]:text-foreground",
                )}
                data-testid="typing-viewport"
                ref={viewportRef}
                style={{
                  height: `${TYPING_LINE_HEIGHT_PX * 3}px`,
                  lineHeight: `${TYPING_LINE_HEIGHT_PX}px`,
                }}
              >
                <div
                  className={cn(
                    "relative font-mono tracking-[-0.035em]",
                    localSettings.fontSize === "small" && "text-lg",
                    localSettings.fontSize === "large" && "text-3xl",
                    localSettings.fontSize === "xl" && "text-4xl",
                    localSettings.fontSize === "medium" &&
                      "text-[clamp(1.25rem,2.4vw,1.8rem)]",
                  )}
                  ref={linesRef}
                >
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
                      : engineState.settings.caretStyle === "underline"
                        ? "h-[2px] w-[0.62em]"
                        : "w-[2px]",
                    localSettings.largerCaret && "scale-x-150",
                    engineState.status === "idle" &&
                      "motion-safe:animate-[caret-blink_1.05s_steps(1,end)_infinite]",
                  )}
                  data-testid="caret"
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

        <div
          className="flex flex-wrap items-center justify-center gap-2 border-t border-border px-4 py-4 text-sm text-muted transition-opacity duration-200"
          data-focus-chrome
          data-testid="keyboard-hints"
        >
          <Kbd>tab</Kbd>
          <span>then</span>
          <Kbd>enter</Kbd>
          <span>new test</span>
          <span aria-hidden="true" className="mx-2 text-border">
            ·
          </span>
          <Kbd>esc</Kbd>
          <span>restart</span>
          {tabHintVisible ? (
            <span className="ml-2 text-accent" role="status">
              Press <Kbd>Enter</Kbd> to restart
            </span>
          ) : null}
          <span className="sr-only" data-testid="engine-status">
            {engineState.status}
          </span>
        </div>
      </Card>
    </section>
  );
}
