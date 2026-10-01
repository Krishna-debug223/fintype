import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Leaderboard" };

export default function LeaderboardPage() {
  return (
    <ComingSoon
      description="Verified global, weekly, and daily rankings will live here once result validation is online."
      eyebrow="Rankings"
      title="The league table is being modeled."
    />
  );
}
