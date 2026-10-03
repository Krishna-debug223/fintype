import { getRank } from "@/types";
import { CONTENT_VERSION } from "@/content";
import type {
  DailyRecord,
  KeystrokeLog,
  LocalProfile,
  PersonalBests,
  SavedTest,
  TestResult,
  UserSettings,
} from "@/types";

import {
  dailyRecordSchema,
  localProfileSchema,
  personalBestsSchema,
  repositoryExportSchema,
  savedTestSchema,
  syncQueueItemSchema,
  userSettingsSchema,
} from "./schemas";
import { isTheme } from "@/lib/theme";

export const STORAGE_KEYS = {
  tests: "fintype-tests-v2",
  settings: "fintype-settings-v2",
  profile: "fintype-profile-v1",
  personalBests: "fintype-personal-bests-v1",
  daily: "fintype-daily-v1",
  sync: "fintype-sync-v1",
} as const;

export const CURRENT_SCHEMA_VERSION = 2;
const MAX_TESTS = 1_000;
const KEEP_LOGS_FOR = 50;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface SaveTestOutcome {
  test: SavedTest;
  previousBest: SavedTest | null;
  removedCount: number;
  storageFull: boolean;
}

export interface ImportSummary {
  imported: number;
  rejected: number;
  merged: number;
  replaced: boolean;
}

export type SyncQueueItem = ReturnType<typeof syncQueueItemSchema.parse>;

export interface TestRepository {
  listTests(): SavedTest[];
  getTest(id: string): SavedTest | null;
  saveCompleted(
    result: TestResult,
    keystrokeLog?: KeystrokeLog,
    options?: {
      retryOfTestId?: string | null;
      id?: string;
      createdAt?: string;
    },
  ): SaveTestOutcome;
  deleteTest(id: string): void;
  clearTests(): void;
  getSettings(): UserSettings;
  setSettings(next: UserSettings): void;
  getProfile(): LocalProfile;
  getPersonalBests(): PersonalBests;
  getDailyRecords(): DailyRecord[];
  recordDaily(record: DailyRecord): boolean;
  getSyncQueue(): SyncQueueItem[];
  setSyncQueue(items: readonly SyncQueueItem[]): void;
  exportAll(): string;
  importAll(json: string, strategy: "merge" | "replace"): ImportSummary;
  subscribe(listener: () => void): () => void;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: "dark",
  fontSize: "medium",
  caretStyle: "line",
  smoothCaret: true,
  showLiveWpm: false,
  showLiveAccuracy: false,
  showTimer: true,
  defaultMode: "terms",
  defaultLength: { type: "time", seconds: 30 },
  difficulty: "medium",
  punctuation: true,
  numbers: true,
  stopOnError: false,
  confidenceMode: false,
  quickRestartKey: "tab-enter",
  blindMode: false,
  reducedMotion: "system",
  highContrast: false,
  largerCaret: false,
  focusMode: true,
};

function getStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function warnCorrupt(key: string): void {
  console.warn(`FinType local data was corrupt; reset ${key}.`);
}

function safeRemove(storage: StorageLike | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // A denied storage area should never take down the app.
  }
}

function isQuotaError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    ((error as { name?: string }).name === "QuotaExceededError" ||
      (error as { code?: number }).code === 22),
  );
}

export function migrateTestsPayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const payload = value as {
    schemaVersion?: unknown;
    data?: unknown;
    tests?: unknown;
  };
  if (payload.schemaVersion !== 1) return value;
  const oldTests = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(payload.tests)
      ? payload.tests
      : [];
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    data: oldTests.map((item) => {
      if (!item || typeof item !== "object") return item;
      const old = item as Record<string, unknown>;
      return {
        ...old,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        retryOfTestId: old.retryOfTestId ?? null,
        contentVersion: old.contentVersion ?? 1,
        synced: old.synced ?? false,
        eligibleForLeaderboard:
          old.eligibleForLeaderboard ?? old.mode !== "custom",
        isPersonalBest: old.isPersonalBest ?? false,
      };
    }),
  };
}

function readJson(storage: StorageLike | null, key: string): unknown {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    warnCorrupt(key);
    safeRemove(storage, key);
    return null;
  }
}

function writeJson(
  storage: StorageLike | null,
  key: string,
  value: unknown,
): void {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
}

function defaultProfile(): LocalProfile {
  return {
    localId: createId(),
    createdAt: nowIso(),
    totalTests: 0,
    totalTimeMs: 0,
  };
}

function bucketFor(
  test: Pick<SavedTest, "mode" | "length" | "difficulty">,
): string {
  const length =
    test.length.type === "time"
      ? `time:${test.length.seconds}`
      : `words:${test.length.words}`;
  return `${test.mode}:${length}:${test.difficulty}`;
}

function withoutKeystrokeLog(test: SavedTest): SavedTest {
  const withoutLog = { ...test };
  delete withoutLog.keystrokeLog;
  return withoutLog;
}

function normalizeParsedTest(
  test: ReturnType<typeof savedTestSchema.parse>,
): SavedTest {
  return test.keystrokeLog
    ? (test as SavedTest)
    : withoutKeystrokeLog(test as SavedTest);
}

function retainTests(tests: readonly SavedTest[]): SavedTest[] {
  const ordered = [...tests].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const personalBestIds = new Set(
    ordered.filter((test) => test.isPersonalBest).map((test) => test.id),
  );
  const retained = ordered.slice(0, MAX_TESTS);
  return retained.map((test, index) =>
    index < KEEP_LOGS_FOR || personalBestIds.has(test.id)
      ? test
      : withoutKeystrokeLog(test),
  );
}

function stripOldLogs(tests: readonly SavedTest[]): SavedTest[] {
  const personalBestIds = new Set(
    tests.filter((test) => test.isPersonalBest).map((test) => test.id),
  );
  return [...tests].map((test, index) =>
    index < KEEP_LOGS_FOR || personalBestIds.has(test.id)
      ? test
      : withoutKeystrokeLog(test),
  );
}

function toSavedTest(
  result: TestResult,
  log: KeystrokeLog | undefined,
  options: { retryOfTestId?: string | null; id?: string; createdAt?: string },
  previousBest: SavedTest | null,
): SavedTest {
  const eligible = result.mode !== "custom" && options.retryOfTestId == null;
  const isPersonalBest =
    eligible && (!previousBest || result.wpm > previousBest.wpm);
  return {
    id: options.id ?? createId(),
    createdAt: options.createdAt ?? nowIso(),
    mode: result.mode,
    difficulty: result.settings.difficulty,
    length: result.settings.length,
    settings: {
      punctuation: result.settings.punctuation,
      numbers: result.settings.numbers,
      stopOnError: result.settings.stopOnError,
      confidenceMode: result.settings.confidenceMode,
    },
    seed: result.seed,
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    errors: result.errors,
    characterBreakdown: result.characterBreakdown,
    durationMs: result.durationMs,
    wpmPerSecond: result.wpmPerSecond,
    rank: getRank(result.wpm).title,
    isPersonalBest,
    eligibleForLeaderboard: result.mode !== "custom",
    ...(log ? { keystrokeLog: log } : {}),
    synced: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    retryOfTestId: options.retryOfTestId ?? null,
    contentVersion: result.settings.contentVersion ?? CONTENT_VERSION,
  };
}

export class LocalStorageRepository implements TestRepository {
  private readonly storage: StorageLike | null;
  private readonly listeners = new Set<() => void>();
  private memoryTests: SavedTest[] = [];

  constructor(storage?: StorageLike) {
    this.storage = getStorage(storage);
  }

  private readTests(): SavedTest[] {
    const raw = migrateTestsPayload(readJson(this.storage, STORAGE_KEYS.tests));
    if (!raw || typeof raw !== "object") return this.memoryTests;
    const data = (raw as { data?: unknown }).data;
    const parsed = savedTestSchema.array().safeParse(data);
    if (!parsed.success) {
      warnCorrupt(STORAGE_KEYS.tests);
      safeRemove(this.storage, STORAGE_KEYS.tests);
      return this.memoryTests;
    }
    this.memoryTests = retainTests(parsed.data.map(normalizeParsedTest));
    return this.memoryTests;
  }

  private writeTests(tests: readonly SavedTest[]): void {
    const payload = { schemaVersion: CURRENT_SCHEMA_VERSION, data: tests };
    writeJson(this.storage, STORAGE_KEYS.tests, payload);
    this.memoryTests = [...tests];
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  listTests(): SavedTest[] {
    return [...this.readTests()];
  }

  getTest(id: string): SavedTest | null {
    return this.readTests().find((test) => test.id === id) ?? null;
  }

  saveCompleted(
    result: TestResult,
    keystrokeLog?: KeystrokeLog,
    options: {
      retryOfTestId?: string | null;
      id?: string;
      createdAt?: string;
    } = {},
  ): SaveTestOutcome {
    const tests = this.readTests();
    const personalBests = this.getPersonalBests();
    const previousBestEntry =
      personalBests[
        bucketFor({
          mode: result.mode,
          length: result.settings.length,
          difficulty: result.settings.difficulty,
        })
      ];
    const previousBest = previousBestEntry
      ? this.getTest(previousBestEntry.testId)
      : null;
    const test = toSavedTest(result, keystrokeLog, options, previousBest);
    const updatedTests = tests
      .filter((item) => item.id !== test.id)
      .map((item) =>
        test.isPersonalBest && previousBest?.id === item.id
          ? { ...item, isPersonalBest: false }
          : item,
      );
    const next = retainTests([test, ...updatedTests]);
    let removedCount = 0;
    let storageFull = false;
    try {
      this.writeTests(next);
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      const stripped = stripOldLogs(next);
      try {
        this.writeTests(stripped);
      } catch (secondError) {
        if (!isQuotaError(secondError)) throw secondError;
        const personalBestIds = new Set(
          stripped.filter((item) => item.isPersonalBest).map((item) => item.id),
        );
        const reduced = stripped.filter(
          (item, index) => index < 1 || personalBestIds.has(item.id),
        );
        removedCount = Math.max(0, stripped.length - reduced.length);
        try {
          this.writeTests(reduced);
        } catch {
          storageFull = true;
          this.memoryTests = reduced;
        }
      }
    }
    if (test.isPersonalBest) {
      const nextBests = {
        ...personalBests,
        [bucketFor(test)]: {
          testId: test.id,
          wpm: test.wpm,
          accuracy: test.accuracy,
          createdAt: test.createdAt,
        },
      };
      try {
        this.writePersonalBests(nextBests);
      } catch (error) {
        if (!isQuotaError(error)) throw error;
      }
    }
    const profile = this.getProfile();
    try {
      this.writeProfile({
        ...profile,
        totalTests: profile.totalTests + 1,
        totalTimeMs: profile.totalTimeMs + test.durationMs,
      });
    } catch (error) {
      if (!isQuotaError(error)) throw error;
    }
    this.notify();
    return { test, previousBest, removedCount, storageFull };
  }

  deleteTest(id: string): void {
    this.writeTests(this.readTests().filter((test) => test.id !== id));
    this.notify();
  }

  clearTests(): void {
    this.writeTests([]);
    this.writePersonalBests({});
    this.writeProfile(defaultProfile());
    this.writeDailyRecords([]);
    this.notify();
  }

  getSettings(): UserSettings {
    const raw = readJson(this.storage, STORAGE_KEYS.settings);
    const parsed = userSettingsSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (!raw || typeof raw !== "object") {
      let legacyTheme: unknown = null;
      try {
        legacyTheme = this.storage?.getItem("fintype-theme");
      } catch {
        legacyTheme = null;
      }
      return isTheme(legacyTheme)
        ? { ...DEFAULT_USER_SETTINGS, theme: legacyTheme }
        : DEFAULT_USER_SETTINGS;
    }
    const candidate = raw as Record<string, unknown>;
    const next = { ...DEFAULT_USER_SETTINGS };
    (Object.keys(DEFAULT_USER_SETTINGS) as (keyof UserSettings)[]).forEach(
      (key) => {
        const field = userSettingsSchema.shape[key].safeParse(candidate[key]);
        if (field.success) next[key] = field.data as never;
      },
    );
    warnCorrupt(STORAGE_KEYS.settings);
    return next;
  }

  setSettings(next: UserSettings): void {
    const parsed = userSettingsSchema.parse(next);
    writeJson(this.storage, STORAGE_KEYS.settings, parsed);
    try {
      this.storage?.setItem("fintype-theme", parsed.theme);
    } catch {
      // The structured settings key remains the source of truth.
    }
    this.notify();
  }

  private writeProfile(profile: LocalProfile): void {
    writeJson(this.storage, STORAGE_KEYS.profile, profile);
  }

  getProfile(): LocalProfile {
    const raw = readJson(this.storage, STORAGE_KEYS.profile);
    const parsed = localProfileSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (raw !== null) {
      warnCorrupt(STORAGE_KEYS.profile);
      safeRemove(this.storage, STORAGE_KEYS.profile);
    }
    return defaultProfile();
  }

  private writePersonalBests(bests: PersonalBests): void {
    writeJson(this.storage, STORAGE_KEYS.personalBests, bests);
  }

  getPersonalBests(): PersonalBests {
    const raw = readJson(this.storage, STORAGE_KEYS.personalBests);
    const parsed = personalBestsSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    if (raw !== null) {
      warnCorrupt(STORAGE_KEYS.personalBests);
      safeRemove(this.storage, STORAGE_KEYS.personalBests);
    }
    return {};
  }

  private writeDailyRecords(records: readonly DailyRecord[]): void {
    writeJson(this.storage, STORAGE_KEYS.daily, records);
  }

  getDailyRecords(): DailyRecord[] {
    const raw = readJson(this.storage, STORAGE_KEYS.daily);
    const parsed = dailyRecordSchema.array().safeParse(raw);
    if (parsed.success) return parsed.data;
    if (raw !== null) {
      warnCorrupt(STORAGE_KEYS.daily);
      safeRemove(this.storage, STORAGE_KEYS.daily);
    }
    return [];
  }

  recordDaily(record: DailyRecord): boolean {
    const records = this.getDailyRecords();
    if (records.some((item) => item.date === record.date)) return false;
    this.writeDailyRecords([record, ...records].slice(0, 365));
    this.notify();
    return true;
  }

  getSyncQueue(): SyncQueueItem[] {
    const raw = readJson(this.storage, STORAGE_KEYS.sync);
    const parsed = syncQueueItemSchema.array().safeParse(raw);
    if (parsed.success) return parsed.data;
    if (raw !== null) {
      warnCorrupt(STORAGE_KEYS.sync);
      safeRemove(this.storage, STORAGE_KEYS.sync);
    }
    return [];
  }

  setSyncQueue(items: readonly SyncQueueItem[]): void {
    writeJson(
      this.storage,
      STORAGE_KEYS.sync,
      syncQueueItemSchema.array().parse(items),
    );
    this.notify();
  }

  exportAll(): string {
    const payload = repositoryExportSchema.parse({
      exportVersion: 1,
      exportedAt: nowIso(),
      tests: this.readTests(),
      settings: this.getSettings(),
      profile: this.getProfile(),
      personalBests: this.getPersonalBests(),
      dailyRecords: this.getDailyRecords(),
    });
    return JSON.stringify(payload, null, 2);
  }

  importAll(json: string, strategy: "merge" | "replace"): ImportSummary {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(json);
    } catch {
      return { imported: 0, rejected: 1, merged: 0, replaced: false };
    }
    const parsed = repositoryExportSchema.safeParse(parsedJson);
    if (!parsed.success)
      return { imported: 0, rejected: 1, merged: 0, replaced: false };
    const current = strategy === "replace" ? [] : this.readTests();
    const ids = new Set(current.map((test) => test.id));
    const importedTests = parsed.data.tests.filter((test) => !ids.has(test.id));
    this.writeTests(
      retainTests([...importedTests.map(normalizeParsedTest), ...current]),
    );
    this.setSettings(parsed.data.settings);
    this.writeProfile(parsed.data.profile);
    this.writePersonalBests(parsed.data.personalBests);
    this.writeDailyRecords(parsed.data.dailyRecords);
    this.notify();
    return {
      imported: importedTests.length,
      rejected: parsed.data.tests.length - importedTests.length,
      merged: current.length,
      replaced: strategy === "replace",
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (typeof window === "undefined")
      return () => this.listeners.delete(listener);
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key &&
        Object.values(STORAGE_KEYS).includes(
          event.key as (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS],
        )
      ) {
        this.notify();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
    };
  }
}

let repository: LocalStorageRepository | null = null;

export function getLocalRepository(): LocalStorageRepository {
  repository ??= new LocalStorageRepository();
  return repository;
}

export function resetLocalRepositoryForTests(): void {
  repository = null;
}

export function getTestBucketKey(
  test: Pick<SavedTest, "mode" | "length" | "difficulty">,
): string {
  return bucketFor(test);
}
