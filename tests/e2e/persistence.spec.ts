import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { clearAppStorage, readPersistedField } from "./helpers/storage";

test.beforeEach(async ({ page }) => {
  // Every test in this file simulates a returning user (see
  // onboarding.spec.ts for onboarding itself) and needs a clean Projects
  // slate to make assertions about what got persisted.
  await skipOnboarding(page);
  await clearAppStorage(page);
});

test("editing the monogram autosaves without a save button, and reloading the app restores the change (issue #14 AC)", async ({
  page,
}) => {
  await page.goto("/");

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toHaveValue("MX");
  // No save button anywhere in the editor.
  await expect(page.getByRole("button", { name: /save/i })).toHaveCount(0);

  await lettersInput.fill("ZZZ");
  await expect(lettersInput).toHaveValue("ZZZ");

  // Prove the autosave actually landed in IndexedDB (not just that the
  // debounce timer fired) before reloading — this is the real "does this
  // survive a reload" journey that only a real browser's storage can prove.
  await expect.poll(() => readPersistedField(page, "letters")).toBe("ZZZ");

  await page.reload();

  await expect(page.getByLabel("Letters")).toHaveValue("ZZZ");
  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("a design/frame/color change also autosaves and survives a reload", async ({
  page,
}) => {
  await page.goto("/");

  const frameGallery = page.getByRole("listbox", { name: "Frames" });
  await frameGallery
    .getByRole("option", { name: "Circle", exact: true })
    .click();
  await page.getByLabel("Letter Color").fill("#ff0000");

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview.locator("circle")).toHaveCount(1);
  await expect(preview.locator("g")).toHaveAttribute("fill", "#ff0000");

  await expect.poll(() => readPersistedField(page, "frameId")).toBe("circle");
  await expect
    .poll(() => readPersistedField(page, "lettersColor"))
    .toBe("#ff0000");

  await page.reload();

  const reloadedPreview = page.locator(".preview:not([inert]) svg");
  await expect(reloadedPreview.locator("circle")).toHaveCount(1);
  await expect(reloadedPreview.locator("g")).toHaveAttribute("fill", "#ff0000");
});
