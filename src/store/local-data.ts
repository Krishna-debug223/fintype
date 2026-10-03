"use client";

import { create } from "zustand";

import type {
  DailyRecord,
  KeystrokeLog,
  LocalProfile,
  PersonalBests,
  SavedTest,
  TestResult,
  UserSettings,
} from "@/types";
import { DEFAULT_USER_SETTINGS, getLocalRepository } from "@/lib/storage";
import type { ImportSummary, SaveTestOutcome } from "@/lib/storage";

interface LocalDataStore {
  hydrated: boolean;
  tests: SavedTest[];
  settings: UserSettings;
  profile: LocalProfile;
  personalBests: PersonalBests;
  dailyRecords: DailyRecord[];
  hydrate: () => void;
  refresh: () => void;
  saveCompleted: (
    result: TestResult,
    log?: KeystrokeLog,
    options?: { retryOfTestId?: string | null },
  ) => SaveTestOutcome;
  deleteTest: (id: string) => void;
  clearAll: () => void;
  setSettings: (settings: UserSettings) => void;
  exportAll: () => string;
  importAll: (json: string, strategy: "merge" | "replace") => ImportSummary;
  recordDaily: (record: DailyRecord) => boolean;
}

function snapshot() {
  const repository = getLocalRepository();
  return {
    tests: repository.listTests(),
    settings: repository.getSettings(),
    profile: repository.getProfile(),
    personalBests: repository.getPersonalBests(),
    dailyRecords: repository.getDailyRecords(),
  };
}

let repositorySubscribed = false;

export const useLocalDataStore = create<LocalDataStore>((set) => ({
  hydrated: false,
  tests: [],
  settings: DEFAULT_USER_SETTINGS,
  profile: { localId: "", createdAt: "", totalTests: 0, totalTimeMs: 0 },
  personalBests: {},
  dailyRecords: [],
  hydrate: () => {
    const repository = getLocalRepository();
    set({ ...snapshot(), hydrated: true });
    if (!repositorySubscribed) {
      repository.subscribe(() => set(snapshot()));
      repositorySubscribed = true;
    }
  },
  refresh: () => set(snapshot()),
  saveCompleted: (result, log, options) => {
    const outcome = getLocalRepository().saveCompleted(result, log, options);
    set(snapshot());
    return outcome;
  },
  deleteTest: (id) => {
    getLocalRepository().deleteTest(id);
    set(snapshot());
  },
  clearAll: () => {
    getLocalRepository().clearTests();
    set(snapshot());
  },
  setSettings: (settings) => {
    getLocalRepository().setSettings(settings);
    set({ ...snapshot(), settings });
  },
  exportAll: () => getLocalRepository().exportAll(),
  importAll: (json, strategy) => {
    const summary = getLocalRepository().importAll(json, strategy);
    set(snapshot());
    return summary;
  },
  recordDaily: (record) => {
    const recorded = getLocalRepository().recordDaily(record);
    set(snapshot());
    return recorded;
  },
}));
