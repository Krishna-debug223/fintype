import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");

function rgb(hex: string): [number, number, number] {
  return [0, 2, 4].map(
    (offset) => Number.parseInt(hex.slice(offset + 1, offset + 3), 16) / 255,
  ) as [number, number, number];
}

function luminance(hex: string): number {
  const weights = [0.2126, 0.7152, 0.0722] as const;
  return rgb(hex).reduce((sum, channel, index) => {
    const linear =
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * (weights[index] ?? 0);
  }, 0);
}

function contrast(foreground: string, background: string): number {
  const light = luminance(foreground);
  const dark = luminance(background);
  return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05);
}

describe("theme accents", () => {
  it("uses green accents outside the deliberately gold Wallstreet theme", () => {
    expect(css).toContain("--theme-accent: #3ddc84");
    expect(css).toContain("--theme-accent: #176b4d");
    expect(css).toContain("--theme-accent: #32ff66");
    expect(css).toContain("--theme-accent: #d7ad55");
    expect(css).not.toMatch(/--theme-accent:\s*#(?:e8b34f|ffb000)/u);
  });

  it("keeps default, light, and terminal accent text comfortably readable", () => {
    expect(contrast("#3ddc84", "#1a1b1e")).toBeGreaterThan(4.5);
    expect(contrast("#176b4d", "#f3f4f6")).toBeGreaterThan(4.5);
    expect(contrast("#32ff66", "#000000")).toBeGreaterThan(4.5);
  });
});
