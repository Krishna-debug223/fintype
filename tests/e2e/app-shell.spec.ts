import { expect, test } from "@playwright/test";

test("renders the static test preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("FinType home")).toBeVisible();
  await expect(
    page.getByText("Enterprise value equals equity value"),
  ).toBeVisible();
  await expect(page.getByText("Static visual preview")).toBeVisible();
});
