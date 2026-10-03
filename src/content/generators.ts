import { createRng } from "@/engine";
import type { Difficulty, Mode } from "@/types";

const TERMS = [
  "syndicate",
  "underwrite",
  "multiple",
  "proceeds",
  "committee",
  "net-debt",
  "capex",
  "synergy",
  "CAPM",
  "strike",
  "beta",
  "buyback",
  "pro-forma",
  "notional",
  "dividend",
  "WACC",
  "GOOGL",
  "Q1",
  "hedge",
  "CPI",
  "rollover",
  "interest",
  "USD",
  "LBO",
  "depreciation",
  "CAGR",
  "offering",
  "FCF",
  "approval",
  "Q2",
  "Fed",
  "receivables",
  "clearing",
  "Q4",
  "GDP",
];
const OFFICE = [
  "agenda",
  "follow-up",
  "stakeholder",
  "deliverable",
  "workstream",
  "escalation",
  "headcount",
  "forecast",
  "meeting",
  "approval",
  "briefing",
  "deadline",
  "review",
  "memo",
  "committee",
  "pipeline",
  "owner",
  "action-item",
];
const NUMBERS = [
  "12.5%",
  "$42.50",
  "3.25x",
  "$875M",
  "2026E",
  "450bps",
  "0.85",
  "7.2%",
  "100.0",
  "2.0x",
];
const EXCEL = [
  "=SUM(B2:B12)",
  "=XLOOKUP(A2,Data!A:A,Data!F:F)",
  "=IFERROR(VLOOKUP(A2,Data!A:F,6,FALSE),0)",
  "=NPV(rate,cashflows)",
  "=IRR(C3:C9)",
  "=SUMIFS(Revenue,Region,A2)",
  "=INDEX(MATCH())",
];

export function getModeWords(
  mode: Mode,
  count: number,
  seed: string,
  difficulty: Difficulty = "medium",
): string[] {
  const rng = createRng(`${mode}:${difficulty}:${seed}`);
  const source =
    mode === "office"
      ? OFFICE
      : mode === "numbers"
        ? NUMBERS
        : mode === "excel"
          ? EXCEL
          : mode === "mixed" || mode === "daily"
            ? [...TERMS, ...OFFICE, ...NUMBERS, ...EXCEL]
            : TERMS;
  const words: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const word = rng.pick(source);
    words.push(
      difficulty === "easy" && word.length > 10 ? word.slice(0, 10) : word,
    );
  }
  return words;
}

export function getDailyWords(count: number, utcDate: string): string[] {
  return getModeWords("daily", count, getDailySeed(utcDate), "medium");
}

/** Stable UTC seed used by both the Daily UI and server validation. */
export function getDailySeed(utcDate: string): string {
  return `daily:${utcDate}`;
}
