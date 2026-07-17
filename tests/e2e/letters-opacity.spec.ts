import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

test("reducing Letter Opacity applies fill-opacity to the glyph group, and it's omitted at full opacity", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();
  const glyphGroup = preview.locator("g").first();
  await expect(glyphGroup).not.toHaveAttribute("fill-opacity", /.*/);

  await openTab(page, "Colors");
  const slider = page.getByLabel("Letter Opacity");
  await slider.fill("40");
  await slider.dispatchEvent("input");

  await expect(glyphGroup).toHaveAttribute("fill-opacity", "0.4");
  await expect(page.getByText("40%")).toBeVisible();

  await slider.fill("0");
  await slider.dispatchEvent("input");
  await expect(glyphGroup).toHaveAttribute("fill-opacity", "0");
});

test("reduced letter opacity round-trips into SVG and PNG exports", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Colors");
  const slider = page.getByLabel("Letter Opacity");
  await slider.fill("30");
  await slider.dispatchEvent("input");
  await expect(
    page.locator(".preview:not([inert]) svg g").first(),
  ).toHaveAttribute("fill-opacity", "0.3");

  await openTab(page, "Export");

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const svgBytes = await readFile((await svgDownload.path())!, "utf-8");
  expect(svgBytes).toContain('fill-opacity="0.3"');

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngBytes = await readFile((await pngDownload.path())!);
  expect(pngBytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
});
