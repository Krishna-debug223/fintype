import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--theme-background)",
        surface: "var(--theme-surface)",
        border: "var(--theme-border)",
        foreground: "var(--theme-text)",
        muted: "var(--theme-text-muted)",
        accent: "var(--theme-accent)",
        correct: "var(--theme-correct)",
        incorrect: "var(--theme-incorrect)",
        warning: "var(--theme-warning)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel:
          "0 24px 64px color-mix(in srgb, var(--theme-background) 70%, transparent)",
      },
    },
  },
};

export default config;
