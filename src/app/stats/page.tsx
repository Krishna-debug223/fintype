import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Stats" };

export default function StatsPage() {
  return (
    <ComingSoon
      description="Speed, accuracy, consistency, and progression views will appear after the test engine is built."
      eyebrow="Performance"
      title="Your numbers need a few completed tests."
    />
  );
}
