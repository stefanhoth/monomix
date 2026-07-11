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
