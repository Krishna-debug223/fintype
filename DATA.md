# FinType data and synchronization

Prompt 4 uses a repository boundary so UI code never reads browser storage directly. `LocalStorageRepository` remains the guest adapter. Prompt 5 adds an outbox and optional server endpoints without making the local store depend on a database.

## Keys

| Key                         | Shape                                  | Retention                                                                               |
| --------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| `fintype-tests-v2`          | `{ schemaVersion, data: SavedTest[] }` | At most 1,000 newest tests. Full logs remain for the newest 50 and every personal best. |
| `fintype-settings-v2`       | `UserSettings`                         | One validated settings object; corrupt fields fall back independently.                  |
| `fintype-profile-v1`        | `LocalProfile`                         | One local UUID, creation time, and incremental lifetime totals.                         |
| `fintype-personal-bests-v1` | bucket map to `PersonalBest`           | One best per `mode:length:difficulty` bucket; Custom is excluded.                       |
| `fintype-daily-v1`          | `DailyRecord[]`                        | First completed record per UTC date, retaining the recent year.                         |
| `fintype-sync-v1`           | `SyncQueueItem[]`                      | Pending authenticated submissions with bounded exponential retry metadata.              |

Every structured key is validated with Zod. Reads and writes are wrapped in `try/catch`; invalid keys are removed with a console warning. The tests envelope migrates schema version 1 to version 2. Quota failures strip old logs first, then remove the oldest non-protected tests, and return a storage-full outcome for the toast layer.

Export files use `exportVersion: 1` and include tests, settings, profile, personal bests, and daily records. Merge imports dedupe by test id; replace imports replace the local collection.

## Content versions

New completed tests persist `contentVersion: 2`. Existing test envelopes and
daily records without the field migrate to `1`, preserving the frozen v1
generator. History replay, retry, stats analysis, and server submissions pass
the stored version back to `getModeWords`; unknown server versions are rejected.
The `focusMode` setting is also migrated field-by-field with a default of true.

## Rules

- A result is saved only when the engine reaches `finished`; Escape/restart before completion is never persisted.
- A retry stores `retryOfTestId`, does not create a duplicate Daily record, and is excluded from a new personal-best claim.
- A qualifying streak day is a completed test of at least 15 seconds or 25 words. Streak dates use the local calendar; Daily records use UTC.
- `synced` is `false` until the authoritative batch endpoint accepts a test. Queue entries are removed only after a successful response; 4xx responses become terminal failures for user review and 5xx responses retry with backoff.

## Server records

When configured, Postgres owns the authoritative `users`, `profiles`, `tests`, `personal_bests`, `daily_results`, `user_stats`, `user_settings`, `audit_log`, and `user_bans` tables. The browser never chooses leaderboard eligibility or final metrics. `/api/tests` is idempotent by test UUID, `/api/tests/batch` accepts at most 100 envelopes, and `/api/settings` uses validated last-write-wins settings snapshots.

Keystroke logs are retained on server test rows for replay/review and are intentionally not copied into audit messages. Deployments should add a scheduled retention job after the anti-cheat review window to delete old logs while preserving aggregate results.
