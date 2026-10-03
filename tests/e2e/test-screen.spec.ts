import { expect, test } from "@playwright/test";

test("idle controls do not start the clock and Tab then Enter creates a new test", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "15s" }).click();
  const input = page.getByLabel("Typing input");
  await input.focus();

  await expect(page.getByTestId("engine-status")).toHaveText("idle");
  await expect(page.getByTestId("test-progress")).toHaveText("15");
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("engine-status")).toHaveText("idle");
  await expect(page.getByTestId("test-progress")).toHaveText("15");

  const previousSeed = await page
    .getByTestId("test-card")
    .getAttribute("data-seed");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("test-card")).not.toHaveAttribute(
    "data-seed",
    previousSeed ?? "",
  );
  await expect(page.getByTestId("engine-status")).toHaveText("idle");
  expect(browserErrors).toEqual([]);
});

test("completes a 15-second perfect test with engine results", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "15s" }).click();
  const input = page.getByLabel("Typing input");
  await input.focus();

  const words = await page
    .getByTestId("typing-word")
    .evaluateAll((elements) =>
      elements
        .slice(0, 20)
        .map((element) => element.getAttribute("data-target") ?? ""),
    );
  const initialScroll = await page.evaluate(() => window.scrollY);

  for (const word of words) {
    await page.keyboard.type(word);
    await page.keyboard.press("Space");
  }

  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  await expect(page.getByTestId("results-panel")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("result-accuracy")).toHaveText("100.0%");
  const wpm = Number(await page.getByTestId("result-wpm").textContent());
  expect(wpm).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});

test("keeps typing alive after focus leaves the hidden input", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "15s" }).click();
  const input = page.getByLabel("Typing input");
  const firstWord = await page
    .getByTestId("typing-word")
    .first()
    .getAttribute("data-target");

  await page.mouse.click(4, 4);
  await page.keyboard.type(firstWord ?? "");
  await expect(page.getByTestId("engine-status")).toHaveText("running");

  await page.waitForTimeout(350);
  await page
    .getByTestId("focus-mode-wrapper")
    .dispatchEvent("pointermove", { movementX: 12, movementY: 0 });
  await expect(page.locator("body")).not.toHaveAttribute(
    "data-focus-mode",
    "on",
  );
  await page.reload();
  await page.getByRole("button", { name: "15s" }).click();
  await input.focus();
  await page.getByRole("link", { name: "FinType home" }).focus();
  await page.keyboard.type(firstWord ?? "");
  await expect(page.getByTestId("engine-status")).toHaveText("running");
});

test("Tab stays on the test, Enter restarts, and Escape can release focus", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "15s" }).click();
  const input = page.getByLabel("Typing input");
  await input.focus();
  const firstWord = await page
    .getByTestId("typing-word")
    .first()
    .getAttribute("data-target");
  await page.keyboard.type((firstWord ?? "").slice(0, 2));
  const seedBeforeTab = await page
    .getByTestId("test-card")
    .getAttribute("data-seed");

  await page.keyboard.press("Tab");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Typing input")).toBeFocused();
  await expect(page.getByText("Press Enter to restart")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("test-card")).not.toHaveAttribute(
    "data-seed",
    seedBeforeTab ?? "",
  );
  await expect(page.getByTestId("engine-status")).toHaveText("idle");

  const seedBeforeEscape = await page
    .getByTestId("test-card")
    .getAttribute("data-seed");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("test-card")).not.toHaveAttribute(
    "data-seed",
    seedBeforeEscape ?? "",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("Typing input")).not.toBeFocused();
});

test("keeps the caret inside wrapped content at narrow and wide widths", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await page.getByRole("button", { name: "15s" }).click();
    await page.getByLabel("Typing input").focus();
    const words = await page
      .getByTestId("typing-word")
      .evaluateAll((elements) =>
        elements
          .slice(0, 12)
          .map((element) => element.getAttribute("data-target") ?? ""),
      );
    for (const word of words) {
      await page.keyboard.type(word);
      await page.keyboard.press("Space");
    }
    await page.waitForTimeout(100);
    const bounds = await page.evaluate(() => {
      const viewport = document.querySelector(
        '[data-testid="typing-viewport"]',
      );
      const caret = document.querySelector('[data-testid="caret"]');
      if (!viewport || !caret) return null;
      const viewportRect = viewport.getBoundingClientRect();
      const caretRect = caret.getBoundingClientRect();
      return {
        caretBottom: caretRect.bottom,
        caretLeft: caretRect.left,
        caretTop: caretRect.top,
        viewportBottom: viewportRect.bottom,
        viewportLeft: viewportRect.left,
      };
    });
    expect(bounds).not.toBeNull();
    expect(bounds?.caretLeft).toBeGreaterThanOrEqual(
      (bounds?.viewportLeft ?? 0) - 1,
    );
    expect(bounds?.caretTop).toBeGreaterThanOrEqual(-1);
    expect(bounds?.caretBottom).toBeLessThanOrEqual(
      (bounds?.viewportBottom ?? 0) + 1,
    );
  }
});

test("backspace can cross an incorrect word boundary", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "15s" }).click();
  await page.getByLabel("Typing input").focus();
  await page.keyboard.type("!");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("typing-word").first()).toHaveAttribute(
    "data-active",
    "false",
  );
  await page.keyboard.press("Backspace");
  await expect(page.getByTestId("typing-word").first()).toHaveAttribute(
    "data-active",
    "true",
  );
});
