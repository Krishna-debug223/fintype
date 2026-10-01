import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <ComingSoon
      description="Test behavior, theme, typography, and caret preferences will be configured here."
      eyebrow="Preferences"
      title="The settings desk is being fitted out."
    />
  );
}
