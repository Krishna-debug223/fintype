import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Daily challenge" };

export default function DailyPage() {
  return (
    <ComingSoon
      description="A seeded challenge will give every desk the same finance passage each day."
      eyebrow="Daily challenge"
      title="Today’s brief is not published yet."
    />
  );
}
