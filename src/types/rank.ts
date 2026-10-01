import { RANKS } from "@/lib/constants";
import type { Rank } from "@/types/models";

function normalizeWpm(wpm: number): number {
  return Number.isFinite(wpm) ? Math.max(0, wpm) : 0;
}

/** Return the highest rank whose threshold is met. */
export function getRank(wpm: number): Rank {
  const normalizedWpm = normalizeWpm(wpm);

  for (let index = RANKS.length - 1; index >= 0; index -= 1) {
    const rank = RANKS[index];
    if (rank && normalizedWpm >= rank.minWpm) {
      return rank;
    }
  }

  return RANKS[0];
}

/** Return the next attainable rank, or null when the user is already an MD. */
export function getNextRank(wpm: number): Rank | null {
  const currentRank = getRank(wpm);
  const currentIndex = RANKS.findIndex(
    (rank) => rank.title === currentRank.title,
  );
  return RANKS[currentIndex + 1] ?? null;
}
