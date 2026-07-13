import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

test("switching the language via the manual override re-renders the UI and persists across reload", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Export SVG" })).toBeVisible();

  await page.getByLabel("Language").selectOption("de");
  await expect(
    page.getByRole("button", { name: "SVG exportieren" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("button", { name: "SVG exportieren" }),
  ).toBeVisible();
});
