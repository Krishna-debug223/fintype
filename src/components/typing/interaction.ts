export const TAB_RESTART_HINT_MS = 2_000;

/** Return whether the Tab restart affordance is still armed. */
export function isTabRestartArmed(
  armedAt: number | null,
  now: number,
): boolean {
  return armedAt !== null && now - armedAt < TAB_RESTART_HINT_MS;
}

export type TabRestartAction = "cancel" | "restart" | null;

/** Decide what an armed Tab hint should do for the next key. */
export function getTabRestartAction(
  key: string,
  armedAt: number | null,
  now: number,
): TabRestartAction {
  if (!isTabRestartArmed(armedAt, now)) return null;
  return key === "Enter" ? "restart" : "cancel";
}

/** Pure state transition used by the document keyboard handler and tests. */
export function armTabRestart(now: number): number {
  return now;
}
