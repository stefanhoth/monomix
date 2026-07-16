import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

// About panel (issue #55): explains the app's purpose and basic usage.

test("the About trigger opens a dialog explaining the app, closing it clears the #about hash", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await page.getByRole("button", { name: "About", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "About MonoMix" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("How it works")).toBeVisible();
  // "dev" in the local/CI build (no APP_VERSION env var, see vite.config.ts)
  // — a real deploy gets the CalVer tag instead (ADR 0005).
  await expect(dialog.getByText("Version dev")).toBeVisible();
  await expect(page).toHaveURL(/#about$/);

  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).not.toHaveURL(/#about$/);
});

test("a direct #about link opens the panel immediately, even for a first-run visitor", async ({
  page,
}) => {
  // Deliberately no skipOnboarding: the About panel must resolve a shared
  // link instantly rather than waiting on the onboarding/Project gate.
  await page.goto("/#about");

  const dialog = page.getByRole("dialog", { name: "About MonoMix" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
