import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

// Reveal animation timing/easing is deliberately not asserted here (issue
// #13 test plan: visual polish, not a CI assertion) — just that the prompt
// shows on a fresh app, that both exits land straight in the real editor in
// Easy mode (impeccable shape brief, 2026-08-08 — no separate jump-off
// gallery screen anymore, see docs/DECISIONS.md), and that a returning user
// skips the whole flow entirely and lands in Full mode.

test("a fresh app (no stored state) shows the initials prompt, and submitting initials lands directly in the editor's Easy mode with those letters live", async ({
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

  // Straight into the real editor — no intermediate gallery screen.
  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("STE");
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);

  // Easy mode: Frame is hidden from the rail, and the Design step shows the
  // curated gallery, not the full ~30-tile grid.
  await expect(page.getByRole("tab", { name: "Frame" })).toHaveCount(0);
  await expect(
    page.getByText("A plain Design — no Frame needed."),
  ).toBeVisible();

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("the skip path lands in the editor's Easy mode with the 'ABC' placeholder, without dead-ending", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Just browsing" }).click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toBeVisible();
  await expect(lettersInput).toHaveValue("ABC");
  await expect(page.getByRole("tab", { name: "Frame" })).toHaveCount(0);

  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("path")).toHaveCount(3);
});

test("picking a curated Design tile applies its real settings, without disturbing the typed letters", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Just browsing" }).click();

  await page.getByText("Letters filled with a gradient.").click();

  const lettersInput = page.getByLabel("Letters");
  await expect(lettersInput).toHaveValue("ABC");

  // The picked tile's settings actually landed on the live editor state, not
  // just the preview — switch to Full mode to inspect the Colors step.
  await page.getByRole("button", { name: "Full" }).click();
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(
    page.getByRole("radio", { name: "gradient" }).first(),
  ).toBeChecked();
});

test("picking a curated color preset applies it without touching the Design or Frame already chosen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Just browsing" }).click();

  await page.getByRole("tab", { name: "Colors" }).click();
  await page.getByRole("option", { name: "Rosewood" }).click();

  await page.getByRole("button", { name: "Full" }).click();
  await page.getByRole("tab", { name: "Colors" }).click();
  await expect(page.getByLabel("Letter Color")).toHaveValue("#861657");
});

test("the Easy/Full mode toggle shows and hides the Frame step", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Just browsing" }).click();

  await expect(page.getByRole("tab", { name: "Frame" })).toHaveCount(0);

  await page.getByRole("button", { name: "Full" }).click();
  await expect(page.getByRole("tab", { name: "Frame" })).toBeVisible();

  await page.getByRole("button", { name: "Easy" }).click();
  await expect(page.getByRole("tab", { name: "Frame" })).toHaveCount(0);
});

test("a returning user (onboarding already complete) never sees the prompt and lands in Full mode", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await expect(page.getByLabel("Letters")).toBeVisible();
  await expect(page.getByLabel("Your initials?")).toHaveCount(0);
  // No stored workspace-mode preference either (a pre-existing user
  // predates this feature) — must default to Full, not the newcomer's Easy.
  await expect(page.getByRole("tab", { name: "Frame" })).toBeVisible();
});
