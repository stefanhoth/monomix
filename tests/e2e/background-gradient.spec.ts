import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

test("picking a gradient background renders a linear gradient by default, switches to radial, and supports a 2-3 stop range", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.locator(".preview:not([inert]) svg");
  await expect(preview).toBeVisible();

  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Gradient" }).check();

  await expect(preview.locator("linearGradient")).toHaveCount(1);
  await expect(preview.locator("linearGradient stop")).toHaveCount(2);
  await expect(page.getByRole("radio", { name: "Linear" })).toBeChecked();

  // Add a third stop.
  await page.getByRole("button", { name: "Add color stop" }).click();
  await expect(preview.locator("linearGradient stop")).toHaveCount(3);
  const removeButtons = page.getByRole("button", {
    name: /Remove color stop/,
  });
  await expect(removeButtons).toHaveCount(3);

  // Remove back down to 2 — the remove control disappears at the floor.
  await removeButtons.first().click();
  await expect(preview.locator("linearGradient stop")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: /Remove color stop/ }),
  ).toHaveCount(0);

  // Switch to radial.
  await page.getByRole("radio", { name: "Radial" }).check();
  await expect(preview.locator("radialGradient")).toHaveCount(1);
  await expect(preview.locator("linearGradient")).toHaveCount(0);
  // The angle control only makes sense for linear.
  await expect(page.getByText("Angle")).toHaveCount(0);
});

test("a gradient background round-trips into SVG and PNG exports", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Gradient" }).check();
  await expect(
    page.locator(".preview:not([inert]) svg linearGradient"),
  ).toHaveCount(1);

  await openTab(page, "Export");

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const svgBytes = await readFile((await svgDownload.path())!, "utf-8");
  expect(svgBytes).toContain("<linearGradient");
  expect(svgBytes).toContain("<stop ");

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngBytes = await readFile((await pngDownload.path())!);
  expect(pngBytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
});
