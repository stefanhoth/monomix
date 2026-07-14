import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";

// Issue #47 acceptance criteria: the fullscreen workspace keeps the live
// preview visible through every control change (Design Principle 1), and
// the sidebar tabs are views over the same live state — no order, no
// "next", no state lost when switching.

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

test("the live preview stays in the viewport while operating every sidebar tab", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert])");
  await expect(preview).toBeInViewport();

  await openTab(page, "Frame");
  await page.getByRole("option", { name: "Circle", exact: true }).click();
  await expect(preview).toBeInViewport();

  await openTab(page, "Colors");
  await page.getByLabel("Letter Color").fill("#ff0000");
  await expect(preview).toBeInViewport();

  await openTab(page, "Export");
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();
  await expect(preview).toBeInViewport();
});

test("the preview and letters input stay in view on a mobile viewport (fixed vertical split, not a bottom sheet)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  const preview = page.locator(".preview:not([inert])");
  await expect(preview).toBeInViewport();
  await expect(page.getByLabel("Letters")).toBeInViewport();

  // The change made in the panel below must be observable in the preview
  // above it — that's the whole point of the fixed split.
  await openTab(page, "Frame");
  await page.getByRole("option", { name: "Circle", exact: true }).click();
  await expect(preview).toBeInViewport();
  await expect(preview.locator("circle")).toHaveCount(1);
});

test("tabs are views, not gates: switching away and back loses no state", async ({
  page,
}) => {
  await page.goto("/");

  await openTab(page, "Frame");
  const circle = page.getByRole("option", { name: "Circle", exact: true });
  await circle.click();
  await expect(circle).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Frame Gap").fill("120");

  await openTab(page, "Colors");
  await page.getByLabel("Letter Color").fill("#ff0000");

  await openTab(page, "Frame");
  await expect(circle).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Frame Gap")).toHaveValue("120");

  await openTab(page, "Colors");
  await expect(page.getByLabel("Letter Color")).toHaveValue("#ff0000");
});

test("tab switching plays no panel animation under prefers-reduced-motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await openTab(page, "Frame");
  const animation = await page
    .locator("#panel-frame")
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
});

test("arrow keys move between tabs (WAI-ARIA tabs pattern)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Design", exact: true }).click();

  await page.keyboard.press("ArrowRight");
  const frameTab = page.getByRole("tab", { name: "Frame", exact: true });
  await expect(frameTab).toHaveAttribute("aria-selected", "true");
  await expect(frameTab).toBeFocused();

  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Export", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
