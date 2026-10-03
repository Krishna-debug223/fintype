import { describe, expect, it } from "vitest";

import { applyInput, createTest, getResult } from "@/engine";
import {
  LocalStorageRepository,
  STORAGE_KEYS,
  migrateTestsPayload,
} from "@/lib/storage";
import type { TestSettings } from "@/types";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

function result() {
  const settings: TestSettings = {
    mode: "terms",
    length: { type: "words", words: 25 },
    punctuation: true,
    numbers: true,
    difficulty: "medium",
    stopOnError: false,
    confidenceMode: false,
    theme: "dark",
    fontSize: "medium",
    caretStyle: "line",
    seed: "storage-test",
  };
  let state = createTest(["alpha"], settings);
  for (const character of "alpha")
    state = applyInput(state, { type: "char", char: character }, 100);
  state = applyInput(state, { type: "space" }, 200);
  return getResult(state);
}

describe("LocalStorageRepository", () => {
  it("saves, validates, exports, and imports completed tests", () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageRepository(storage);
    const saved = repository.saveCompleted(result(), [
      { type: "char", char: "a", t: 1 },
    ]);
    expect(repository.listTests()).toHaveLength(1);
    expect(saved.test.isPersonalBest).toBe(true);
    const exported = repository.exportAll();
    const restored = new LocalStorageRepository(new MemoryStorage());
    expect(restored.importAll(exported, "replace").imported).toBe(1);
    expect(restored.listTests()[0]?.id).toBe(saved.test.id);
  });

  it("falls back from corrupt keys and migrates v1 test envelopes", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.tests, "not-json");
    const repository = new LocalStorageRepository(storage);
    expect(repository.listTests()).toEqual([]);
    expect(migrateTestsPayload({ schemaVersion: 1, data: [] })).toEqual({
      schemaVersion: 2,
      data: [],
    });
  });

  it("does not throw when storage reports quota exhaustion", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => {
      throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
    };
    const repository = new LocalStorageRepository(storage);
    expect(() => repository.saveCompleted(result())).not.toThrow();
  });
});
