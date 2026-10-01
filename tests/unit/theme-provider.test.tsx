import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "@/components/ui/theme-provider";
import { THEME_STORAGE_KEY } from "@/lib/constants";

function ThemeHarness() {
  const { setTheme, theme } = useTheme();
  return (
    <button onClick={() => setTheme("terminal")} type="button">
      {theme}
    </button>
  );
}

describe("ThemeProvider persistence", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });

  it("restores a valid saved theme on mount", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "wallstreet");
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent("wallstreet"),
    );
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "wallstreet",
    );
  });

  it("applies and persists a theme change", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>,
    );

    await act(async () => user.click(screen.getByRole("button")));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("terminal");
    expect(document.documentElement).toHaveAttribute("data-theme", "terminal");
  });
});
