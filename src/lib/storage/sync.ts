import type { SyncQueueItem } from "./repository";
import { getLocalRepository } from "./repository";

export type SyncResponse = { ok: boolean; status: number; retryable: boolean };

export function enqueueSync(payload: unknown): SyncQueueItem {
  const repository = getLocalRepository();
  const existing = repository.getSyncQueue();
  const id =
    typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof payload.id === "string"
      ? payload.id
      : crypto.randomUUID();
  const item: SyncQueueItem = {
    id,
    payload,
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    failed: false,
    reason: null,
  };
  repository.setSyncQueue([
    ...existing.filter((entry) => entry.id !== id),
    item,
  ]);
  return item;
}

export function getSyncStatus(): { pending: number; failed: number } {
  const items = getLocalRepository().getSyncQueue();
  return {
    pending: items.filter((item) => !item.failed).length,
    failed: items.filter((item) => item.failed).length,
  };
}

/** Flush at most one request at a time; callers can invoke this after sign-in or reload. */
export async function flushSync(
  send: (payload: unknown[]) => Promise<SyncResponse>,
  now = new Date(),
): Promise<{ sent: number; failed: number }> {
  const repository = getLocalRepository();
  const queue = repository.getSyncQueue();
  const ready = queue.filter(
    (item) =>
      !item.failed && new Date(item.nextAttemptAt).getTime() <= now.getTime(),
  );
  if (!ready.length) return { sent: 0, failed: 0 };
  const batch = ready.slice(0, 100);
  const response = await send(batch.map((item) => item.payload));
  if (response.ok) {
    const sentIds = new Set(batch.map((item) => item.id));
    repository.setSyncQueue(queue.filter((item) => !sentIds.has(item.id)));
    return { sent: batch.length, failed: 0 };
  }
  const retryable = response.retryable && response.status >= 500;
  const updated = queue.map((item) => {
    if (!batch.some((entry) => entry.id === item.id)) return item;
    const attempts = item.attempts + 1;
    return {
      ...item,
      attempts,
      failed: !retryable,
      reason: retryable ? null : `HTTP ${response.status}`,
      nextAttemptAt: new Date(
        now.getTime() + Math.min(60 * 60_000, 2 ** attempts * 1000),
      ).toISOString(),
    };
  });
  repository.setSyncQueue(updated);
  return { sent: 0, failed: batch.length };
}
