import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

// Reveal animation timing/easing is deliberately not asserted here (issue
// #13 test plan: visual polish, not a CI assertion) — just that the prompt
// shows on a fresh app, that both exits land in the jump-off gallery (not
// the editor directly — see the impeccable shape brief, 2026-08-07), that
// "See all designs instead" lands exactly where onboarding used to, and
// that a returning user skips the whole flow entirely.

test("a fresh app (no stored state) shows the initials prompt, and submitting initials leads to the jump-off gallery with those letters live", async ({
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

  // Jump-off gallery (not the editor yet): a curated set of fully styled
  // examples rendered with the visitor's own initials.
  await expect(
    page.getByRole("heading", {
      name: "Here's what your initials can look like",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Letters")).toHaveCount(0);

  await page.getByRole("button", { name: "See all designs instead" }).click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("STE");
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("the skip path leads to the jump-off gallery with the 'ABC' placeholder, without dead-ending", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Just browsing" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Here's what your initials can look like",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "See all designs instead" }).click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("ABC");

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("picking a jump-off tile seeds the editor with that tile's real settings and shows a one-time coach hint", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Just browsing" }).click();

  // "Letters filled with a gradient" — the second curated tile
  // (src/lib/jump-off-gallery.ts: "gradient-letters").
  await page.getByRole("listitem").nth(1).getByRole("button").click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("ABC");

  // The picked tile's settings actually landed in the Colors tab, not just
  // the preview — i.e. this is a real seeded Project, not a static demo.
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(
    page.getByRole("radio", { name: "gradient" }).first(),
  ).toBeChecked();

  // The coach hint shows once, right after landing in the real editor...
  const coachHint = page.getByRole("note");
  await expect(coachHint).toBeVisible();
  await expect(coachHint).toContainText("everything you see updates instantly");

  // ...and dismisses on the very next tab interaction (mouse click).
  await page.getByRole("tab", { name: "Frame" }).click();
  await expect(coachHint).toHaveCount(0);
});

test("the coach hint also dismisses on keyboard tab navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Just browsing" }).click();
  await page.getByRole("button", { name: "See all designs instead" }).click();

  const coachHint = page.getByRole("note");
  await expect(coachHint).toBeVisible();

  await page.getByRole("tab", { name: "Design", exact: true }).click();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Frame", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(coachHint).toHaveCount(0);
});

test("a returning user (onboarding already complete) never sees the prompt or the jump-off gallery", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await expect(page.getByLabel("Letters")).toBeVisible();
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Here's what your initials can look like",
    }),
  ).toHaveCount(0);
});
