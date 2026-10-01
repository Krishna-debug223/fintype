import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <ComingSoon
      description="Completed tests will be searchable here by mode, length, date, and performance."
      eyebrow="Test history"
      title="No tape to review yet."
    />
  );
}
