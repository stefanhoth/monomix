import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

test("app loads and shows the letters input", async ({ page }) => {
  await skipOnboarding(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MonoMix" })).toBeVisible();
  await expect(page.getByLabel("Letters")).toHaveValue("MX");
});
