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

  // Three circles now: a white one inside the <mask> (the letters' cutout
  // hole is punched into it), the actual green fill carrying that mask,
  // and the stroked ring.
  await expect(preview.locator("circle")).toHaveCount(3);
  await expect(preview.locator('circle[fill="white"]')).toHaveCount(1);
  await expect(preview.locator('circle[fill="#00ff00"]')).toHaveCount(1);
  const filledCircle = preview.locator('circle[fill="#00ff00"]');
  await expect(filledCircle).toHaveAttribute("mask", /^url\(#/);
  await expect(preview.locator('circle[fill="none"]')).toHaveAttribute(
    "stroke",
    "#00ff00",
  );

  // Unchecking removes the fill and its mask, back to a single stroked ring.
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

  // A "Square" Frame draws its fill, stroke, and the mask's base shape all
  // as <rect>s — the real (visible) fill is the one with an actual hex
  // color, distinct from the mask's plain "white" and the stroke's "none".
  // It's still there even though the letters themselves are now invisible:
  // this is exactly the "empty frame" bug this feature fixes.
  const filledRect = preview.locator('rect[fill^="#"]');
  await expect(filledRect).toHaveCount(1);
  await expect(filledRect).toHaveAttribute("fill", /^#[0-9a-f]{6}$/i);
  await expect(filledRect).toHaveAttribute("mask", /^url\(#/);
  await expect(preview.locator("> g")).toHaveAttribute("fill-opacity", "0");

  // Confirm the autosave write actually landed in IndexedDB before
  // reloading — the debounce timer firing isn't proof the write completed.
  await expect.poll(() => readPersistedField(page, "frameFilled")).toBe(true);
  await page.reload();
  await openTab(page, "Colors");
  await expect(page.getByLabel("Fill Frame")).toBeChecked();
  await expect(
    page.locator('.preview:not([inert]) svg rect[fill^="#"]'),
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
  expect(svgBytes).toContain("<mask");

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngBytes = await readFile((await pngDownload.path())!);
  expect(pngBytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
});

// The actual reported bug (issue #65 second follow-up): fading the letters'
// own opacity toward the fill's flat color looked identical to not drawing
// them at all, because there was nothing *underneath* the fill to reveal.
// With a Background set, a real hole through the fill must reveal that
// Background, not just fade toward the fill's own color.
test("a filled Frame's cutout reveals a set Background through the letter shapes, not just the fill's own color", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");

  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();

  await openTab(page, "Colors");
  await page.getByLabel("Frame Color").fill("#00ff00");
  await page.getByLabel("Fill Frame").check();
  await page.getByRole("radio", { name: "Solid color" }).check();
  await page.getByLabel("Background Color").fill("#ff0000");

  const slider = page.getByLabel("Letter Opacity");
  await slider.fill("0");
  await slider.dispatchEvent("input");

  // The Background rect, the mask-carrying green fill circle, and the
  // mask's own white base circle must all still be present — the hole
  // exposes the red Background underneath the green fill, it doesn't
  // replace the fill or the Background.
  await expect(preview.locator('rect[fill="#ff0000"]')).toHaveCount(1);
  await expect(preview.locator('circle[fill="#00ff00"]')).toHaveAttribute(
    "mask",
    /^url\(#/,
  );
  await expect(preview.locator("> g")).toHaveAttribute("fill-opacity", "0");
});

// Regression: the Frame gallery tab panel stays mounted-but-hidden
// (`hidden`, i.e. display:none) rather than being torn down when the Frame
// tab isn't active (see workspace.spec.ts: "tabs are views, not gates").
// composeFrame's mask id is content-hashed for determinism (CLAUDE.md: pure
// function), so a gallery tile whose Frame/color/letters exactly match the
// live main preview generates an id-for-id identical <mask>. A <mask>
// inside a display:none subtree corrupts every other element referencing
// that same id elsewhere in the document, including the visible main
// preview's own cutout — this silently broke the whole feature (a filled
// Frame just rendered as an uncut solid shape) until the Frame gallery
// stopped previewing the fill/cutout combo at all.
test("no two <mask> elements share an id across the whole page, even with the matching Frame selected in the gallery", async ({
  page,
}) => {
  await page.goto("/");

  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();

  await openTab(page, "Colors");
  await page.getByLabel("Fill Frame").check();

  const maskIds = await page.evaluate(() =>
    [...document.querySelectorAll("mask[id]")].map((m) => m.id),
  );
  expect(maskIds.length).toBeGreaterThan(0);
  expect(new Set(maskIds).size).toBe(maskIds.length);
});
