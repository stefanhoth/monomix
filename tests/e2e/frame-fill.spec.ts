import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";
import { readPersistedField } from "./helpers/storage";

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

// Issue #65 follow-up: a Frame is a stroked ring with no interior fill, so
// reducing Letter Opacity with a transparent Background produced nothing
// visible — just an empty ring (reported against #86). "Fill Frame" gives
// the stencil effect something to cut through even without a Background.
test("Fill Frame is disabled with No Frame, and fills the selected Frame's interior once one is picked", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();

  await openTab(page, "Colors");
  const fillCheckbox = page.getByLabel("Fill Frame");
  await expect(fillCheckbox).toBeDisabled();
  await expect(fillCheckbox).not.toBeChecked();

  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();
  await expect(preview.locator("circle")).toHaveCount(1);

  await openTab(page, "Colors");
  await expect(fillCheckbox).toBeEnabled();
  await page.getByLabel("Frame Color").fill("#00ff00");
  await fillCheckbox.check();

  // A filled interior shape plus the stroked ring: two circles now, the
  // fill one drawn first (behind the stroke, and behind the letters).
  await expect(preview.locator("circle")).toHaveCount(2);
  const circles = preview.locator("circle");
  await expect(circles.first()).toHaveAttribute("fill", "#00ff00");
  await expect(circles.last()).toHaveAttribute("fill", "none");
  await expect(circles.last()).toHaveAttribute("stroke", "#00ff00");

  // Unchecking removes the fill, back to a single stroked ring.
  await fillCheckbox.uncheck();
  await expect(preview.locator("circle")).toHaveCount(1);
});

test("a filled Frame gives reduced Letter Opacity something to cut a stencil out of, and it survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");

  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Square", exact: true })
    .click();

  await openTab(page, "Colors");
  await page.getByLabel("Fill Frame").check();
  const slider = page.getByLabel("Letter Opacity");
  await slider.fill("0");
  await slider.dispatchEvent("input");

  // A "Square" Frame draws both its fill and its stroke as <rect>s, so the
  // filled one is distinguished by an actual (non-"none") fill color — it's
  // still there even though the letters themselves are now invisible. This
  // is exactly the "empty frame" bug: without it, there'd be nothing behind
  // the letters at all.
  const filledRect = preview.locator('rect:not([fill="none"])');
  await expect(filledRect).toHaveCount(1);
  await expect(filledRect).toHaveAttribute("fill", /^#[0-9a-f]{6}$/i);
  await expect(preview.locator("g").first()).toHaveAttribute(
    "fill-opacity",
    "0",
  );

  // Confirm the autosave write actually landed in IndexedDB before
  // reloading — the debounce timer firing isn't proof the write completed.
  await expect.poll(() => readPersistedField(page, "frameFilled")).toBe(true);
  await page.reload();
  await openTab(page, "Colors");
  await expect(page.getByLabel("Fill Frame")).toBeChecked();
  await expect(
    page.locator('.preview:not([inert]) svg rect:not([fill="none"])'),
  ).toHaveCount(1);
});

test("a filled Frame round-trips into SVG and PNG exports", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();
  await openTab(page, "Colors");
  await page.getByLabel("Frame Color").fill("#123456");
  await page.getByLabel("Fill Frame").check();

  await openTab(page, "Export");

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const svgBytes = await readFile((await svgDownload.path())!, "utf-8");
  expect(svgBytes).toContain('fill="#123456"');

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngBytes = await readFile((await pngDownload.path())!);
  expect(pngBytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
});
