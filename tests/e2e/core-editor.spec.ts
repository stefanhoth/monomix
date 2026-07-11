import { test, expect } from "@playwright/test";

test("typing letters, picking a Frame, adjusting the gap, and changing colors all update the live preview (the core journey)", async ({
  page,
}) => {
  await page.goto("/");
  // Svelte's out-transition applies `inert` to the outgoing keyed .preview
  // block during the crossfade, so a plain ".preview svg" locator can catch
  // a stale copy mid-transition.
  const lettersInput = page.getByLabel("Letters");
  const preview = page.locator(".preview:not([inert]) svg");

  await expect(preview).toBeVisible();
  const initialPaths = await preview.locator("path").count();
  expect(initialPaths).toBe(2); // default "MX"

  await lettersInput.fill("ABC");
  await expect(lettersInput).toHaveValue("ABC");
  await expect(preview.locator("path")).toHaveCount(3);

  // "No Frame" is the default: no stroked shape behind the letters yet.
  await expect(preview.locator("circle")).toHaveCount(0);

  const frameGallery = page.getByRole("listbox", { name: "Frames" });
  const circleFrame = frameGallery.getByRole("option", {
    name: "Circle",
    exact: true,
  });
  await expect(circleFrame).toHaveAttribute("aria-selected", "false");

  await circleFrame.click();
  await expect(circleFrame).toHaveAttribute("aria-selected", "true");
  await expect(preview.locator("circle")).toHaveCount(1);

  const initialRadius = await preview.locator("circle").getAttribute("r");
  await page.getByLabel("Frame Gap").fill("120");
  await expect
    .poll(async () => preview.locator("circle").getAttribute("r"))
    .not.toBe(initialRadius);

  await page.getByLabel("Letter Color").fill("#ff0000");
  await expect(preview.locator("g")).toHaveAttribute("fill", "#ff0000");

  await page.getByLabel("Frame Color").fill("#00ff00");
  await expect(preview.locator("circle")).toHaveAttribute("stroke", "#00ff00");
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

test("the background defaults to a transparent checkerboard and switches to an opaque fill", async ({
  page,
}) => {
  await page.goto("/");
  const previewContainer = page.locator(".preview:not([inert])");
  const preview = previewContainer.locator("svg");
  await expect(preview).toBeVisible();

  // Default: transparent — no background rect in the SVG at all, and the
  // container itself renders a checkerboard (not a plain white/gray fill).
  await expect(preview.locator("rect")).toHaveCount(0);
  const checkerboardImage = await previewContainer.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  expect(checkerboardImage).toContain("gradient");

  const transparentToggle = page.getByLabel("Transparent background");
  await expect(transparentToggle).toBeChecked();

  await transparentToggle.uncheck();
  await page.getByLabel("Background Color").fill("#3355ff");

  // A real background rect now covers the whole canvas.
  await expect(preview.locator("rect")).toHaveAttribute("fill", "#3355ff");
});
