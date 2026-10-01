import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <ComingSoon
      description="FinType is a focused typing platform for the vocabulary, figures, and formulas used in modern finance."
      eyebrow="About FinType"
      title="Practice the work, not filler words."
    />
  );
}
