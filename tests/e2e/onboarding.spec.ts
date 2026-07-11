import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

// Reveal animation timing/easing is deliberately not asserted here (issue
// #13 test plan: visual polish, not a CI assertion) — just that the prompt
// shows on a fresh app, that both exits land in the editor with the right
// letters live, and that a returning user skips the prompt entirely.

test("a fresh app (no stored state) shows the initials prompt, and submitting initials lands in the editor with those letters live", async ({
  page,
}) => {
  await page.goto("/");

  const initialsInput = page.getByLabel("Your initials?");
  await expect(initialsInput).toBeVisible();
  // The full editor must not render behind/alongside the prompt.
  await expect(page.getByLabel("Letters")).toHaveCount(0);

  await initialsInput.fill("stef");
  // Reuses the same sanitization as the editor's Letters field: uppercased,
  // capped at 3.
  await expect(initialsInput).toHaveValue("STE");

  await page.getByRole("button", { name: "See my monogram" }).click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("STE");
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("the skip path lands in the editor with the 'ABC' placeholder, without dead-ending", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Just browsing" }).click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("ABC");

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("a returning user (onboarding already complete) never sees the prompt", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await expect(page.getByLabel("Letters")).toBeVisible();
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);
});
