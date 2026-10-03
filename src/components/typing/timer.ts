export function formatTimerValue(
  mode: "time" | "words",
  value: number,
  total?: number,
): string {
  if (mode === "words")
    return `${Math.max(0, Math.floor(value))}/${Math.max(0, Math.floor(total ?? 0))}`;
  return String(Math.max(0, Math.ceil(value)));
}

export function isTimerWarning(secondsRemaining: number | null): boolean {
  return (
    secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 5
  );
}

export function timerAnnouncement(
  status: "idle" | "running" | "finished",
  mode: "time" | "words",
  value: number,
  total?: number,
): string {
  if (status === "idle")
    return mode === "time"
      ? `${formatTimerValue(mode, value)} seconds ready`
      : `${formatTimerValue(mode, value, total)} words ready`;
  if (status === "finished") return "Test finished";
  if (mode === "words")
    return `Progress ${formatTimerValue(mode, value, total)}`;
  const seconds = Math.ceil(value);
  return seconds === 10 || seconds === 5 || seconds === 0
    ? `${seconds} seconds remaining`
    : "";
}
