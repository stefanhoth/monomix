import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

test("opening the What's new panel clears the unseen badge, and it stays cleared across a reload", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "What's new" });
  await expect(trigger.locator(".badge")).toBeVisible();

  await trigger.click();
  await expect(page.getByRole("dialog", { name: "What's new" })).toBeVisible();
  await expect(trigger.locator(".badge")).toHaveCount(0);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("button", { name: "What's new" }).locator(".badge"),
  ).toHaveCount(0);
});
