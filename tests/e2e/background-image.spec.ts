import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

// A tiny valid 1x1 red PNG — small enough to inline, real enough to
// exercise the actual decode/downscale/re-encode path (issue #63).
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("picking a background image shows it behind the letters, falls back cleanly on removal", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  await expect(preview.locator("image")).toHaveCount(0);

  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Image" }).check();
  await page.getByLabel("Upload background image").setInputFiles({
    name: "swatch.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });

  const previewImage = preview.locator("image");
  await expect(previewImage).toHaveCount(1);
  await expect(previewImage).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/,
  );
  // The image is drawn before the letters, i.e. it's a background layer.
  await expect(preview.locator("path").first()).toBeVisible();

  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(preview.locator("image")).toHaveCount(0);
});

test("a background image round-trips into SVG and PNG exports", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Image" }).check();
  await page.getByLabel("Upload background image").setInputFiles({
    name: "swatch.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await expect(page.locator(".preview:not([inert]) svg image")).toHaveCount(1);

  await openTab(page, "Export");

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const svgPath = await svgDownload.path();
  const svgBytes = await readFile(svgPath!, "utf-8");
  expect(svgBytes).toContain("<image");
  expect(svgBytes).toContain("data:image/png;base64,");

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngPath = await pngDownload.path();
  const pngBytes = await readFile(pngPath!);
  expect(pngBytes.length).toBeGreaterThan(0);
  // PNG signature.
  expect(pngBytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
});
