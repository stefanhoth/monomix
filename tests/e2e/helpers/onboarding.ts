import type { Page } from "@playwright/test";

/** localStorage key written by src/lib/onboarding.ts. */
export const ONBOARDING_STORAGE_KEY = "monomix:onboarded";

/**
 * Marks onboarding as already complete *before* the app's own script runs,
 * so specs that exercise the editor (not onboarding itself) land straight
 * there — simulating a returning user. Every Playwright test starts from a
 * fresh, storage-less browser context, and the app now shows the initials
 * prompt on that first-ever load (issue #13), so any spec written against
 * the editor needs this first.
 *
 * Uses addInitScript rather than page.evaluate() after goto(): the flag
 * must exist before the page's own script reads it on the very first
 * synchronous render, and localStorage is same-origin, so it can't be set
 * ahead of a first navigation any other way.
 */
export async function skipOnboarding(page: Page): Promise<void> {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "true");
  }, ONBOARDING_STORAGE_KEY);
}
