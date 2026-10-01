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
