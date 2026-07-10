import { test, expect } from "@playwright/test";

test("app loads and shows the letters input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "MonoMix" })).toBeVisible();
  await expect(page.getByLabel("Letters")).toHaveValue("MX");
});
