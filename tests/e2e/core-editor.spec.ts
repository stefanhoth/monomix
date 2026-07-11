import { test, expect } from "@playwright/test";

test("typing letters updates the live preview (the core journey)", async ({
  page,
}) => {
  await page.goto("/");
  const lettersInput = page.getByLabel("Letters");
  const preview = page.locator(".preview svg");

  await expect(preview).toBeVisible();
  const initialPaths = await preview.locator("path").count();
  expect(initialPaths).toBe(2); // default "MX"

  await lettersInput.fill("ABC");
  await expect(lettersInput).toHaveValue("ABC");
  await expect(preview.locator("path")).toHaveCount(3);
});

test("input is capped at 3 characters and uppercased automatically", async ({
  page,
}) => {
  await page.goto("/");
  const lettersInput = page.getByLabel("Letters");

  await lettersInput.fill("abcdef");
  await expect(lettersInput).toHaveValue("ABC");
});

test("typing an umlaut is rejected with a hint, not silently transliterated", async ({
  page,
}) => {
  await page.goto("/");
  const lettersInput = page.getByLabel("Letters");

  await lettersInput.fill("");
  await lettersInput.pressSequentially("Mä");

  // The umlaut never made it into the field, and nothing silently became "AE".
  await expect(lettersInput).toHaveValue("M");
  await expect(page.getByRole("alert")).toContainText("A-Z");
  await expect(page.getByRole("alert")).toContainText("AE");
});

test("shows a hint for an invalid character even once already at the 3-letter cap", async ({
  page,
}) => {
  // Regression test: a native maxlength="3" would block the browser from
  // ever firing an input event for a 4th keystroke, silently swallowing an
  // invalid character with no hint — real typing, not .fill(), is required
  // to exercise this, since .fill() sets the value programmatically and
  // bypasses native input constraints entirely.
  await page.goto("/");
  const lettersInput = page.getByLabel("Letters");

  await lettersInput.fill("");
  await lettersInput.pressSequentially("ABC");
  await expect(lettersInput).toHaveValue("ABC");

  await lettersInput.pressSequentially("ü");
  await expect(lettersInput).toHaveValue("ABC");
  await expect(page.getByRole("alert")).toContainText("A-Z");
});

test("layout adapts to a narrow mobile viewport without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await expect(page.getByRole("heading", { name: "MonoMix" })).toBeVisible();
  await expect(page.getByLabel("Letters")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export SVG" })).toBeVisible();
});
