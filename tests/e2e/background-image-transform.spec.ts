import { test, expect, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { readPersistedField } from "./helpers/storage";
import { openTab } from "./helpers/tabs";

// Zoom + reposition for image backgrounds (issue #123). Before this, an
// image was always drawn full-bleed and centered — whatever crop `cover`
// picked was what shipped.

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

const preview = (page: Page) => page.locator(".preview:not([inert])");
const bgImage = (page: Page) => preview(page).locator("svg image");

/**
 * A 64x64 PNG, left half pure red and right half pure blue — generated, not
 * hand-written, so the pixel assertions below rest on known content. Panning
 * a zoomed-in crop changes which half fills the canvas, which is what makes
 * the effect observable in rendered pixels rather than only in markup.
 */
const HALF_RED_HALF_BLUE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR4nO3PsQkAAAzDsPz/dHpFliLwbFCaTBvvu94DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPAAcuOzw4j9XSHcAAAAASUVORK5CYII=";

async function pickImage(page: Page) {
  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Image", exact: true }).check();
  await page.getByLabel("Upload background image").setInputFiles({
    name: "halves.png",
    mimeType: "image/png",
    buffer: Buffer.from(HALF_RED_HALF_BLUE_PNG, "base64"),
  });
  await expect(bgImage(page)).toHaveCount(1);
}

test("a picked image starts at the original centered cover fit", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);

  // Exactly the attributes the pre-#123 markup hardcoded, so every existing
  // Project keeps rendering byte-identically.
  await expect(bgImage(page)).toHaveAttribute("x", "0");
  await expect(bgImage(page)).toHaveAttribute("y", "0");
  await expect(bgImage(page)).toHaveAttribute("width", "1000");
  await expect(bgImage(page)).toHaveAttribute("height", "1000");

  // Panning is inert until there's slack to pan into.
  await expect(page.getByLabel("Horizontal")).toBeDisabled();
  await expect(page.getByText("Zoom in to reposition")).toBeVisible();
});

test("zooming enlarges the image rect and unlocks the position sliders", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);

  await page.getByLabel("Zoom").fill("2");

  await expect(bgImage(page)).toHaveAttribute("width", "2000");
  // Still centered: the extra 1000 units hang off each edge evenly.
  await expect(bgImage(page)).toHaveAttribute("x", "-500");
  await expect(bgImage(page)).toHaveAttribute("y", "-500");

  await expect(page.getByLabel("Horizontal")).toBeEnabled();
  await expect(page.getByText("Drag the preview to reposition")).toBeVisible();
});

test("the position sliders move the crop, and it survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("2");
  await page.getByLabel("Horizontal").fill("-1");
  await page.getByLabel("Vertical").fill("1");

  // offsetX -1 pins the image's right edge to the canvas's right edge;
  // offsetY +1 pins its top edge to the canvas's top edge.
  await expect(bgImage(page)).toHaveAttribute("x", "-1000");
  await expect(bgImage(page)).toHaveAttribute("y", "0");

  await expect
    .poll(() => readPersistedField(page, "backgroundImageZoom"))
    .toBe(2);
  await expect
    .poll(() => readPersistedField(page, "backgroundImageOffsetX"))
    .toBe(-1);

  await page.reload();
  await expect(bgImage(page)).toHaveAttribute("x", "-1000");
  await expect(bgImage(page)).toHaveAttribute("width", "2000");
});

test("dragging the preview repositions the image, but only once zoomed in", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);

  const box = (await preview(page).boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

  // At 1x there is no pan range, so a drag must be a no-op rather than
  // sliding a gap into frame.
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x - box.width / 4, centre.y, { steps: 8 });
  await page.mouse.up();
  await expect(bgImage(page)).toHaveAttribute("x", "0");

  await page.getByLabel("Zoom").fill("2");
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x - box.width / 4, centre.y, { steps: 8 });
  await page.mouse.up();

  // Dragging left moves the image left, i.e. x decreases from its centered
  // -500, and stays within the range that keeps the canvas covered.
  const x = Number(await bgImage(page).getAttribute("x"));
  expect(x).toBeLessThan(-500);
  expect(x).toBeGreaterThanOrEqual(-1000);
  await expect(page.getByLabel("Horizontal")).not.toHaveValue("0");
});

test("panning changes which part of the photo is actually rendered", async ({
  page,
}) => {
  // Markup assertions alone can't catch a placement that the renderer
  // ignores, so this reads real pixels: the source is red|blue halves, and
  // panning to each extreme should fill the canvas with one colour or the
  // other.
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("4");

  const sample = async () => {
    const shot = await preview(page).screenshot();
    return page.evaluate(
      async (bytes) => {
        const bmp = await createImageBitmap(
          new Blob([new Uint8Array(bytes)], { type: "image/png" }),
        );
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bmp, 0, 0);
        const d = ctx.getImageData(
          Math.floor(bmp.width / 2),
          Math.floor(bmp.height / 2),
          1,
          1,
        ).data;
        return { r: d[0]!, b: d[2]! };
      },
      [...new Uint8Array(shot)],
    );
  };

  await page.getByLabel("Horizontal").fill("1");
  const leftEdge = await sample();
  await page.getByLabel("Horizontal").fill("-1");
  const rightEdge = await sample();

  // Pinning the image's left edge shows its red half; the right edge shows
  // its blue half. Whichever way round the renderer maps them, the two ends
  // of the range must not render the same pixels.
  expect(leftEdge).not.toEqual(rightEdge);
  expect(leftEdge.r > leftEdge.b).toBe(true);
  expect(rightEdge.b > rightEdge.r).toBe(true);
});

test("a zoomed, repositioned background round-trips into SVG and PNG exports", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("2");
  await page.getByLabel("Horizontal").fill("-1");

  await openTab(page, "Export");
  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const chunks: Buffer[] = [];
  for await (const chunk of await svgDownload.createReadStream()) {
    chunks.push(chunk as Buffer);
  }
  const svg = Buffer.concat(chunks).toString("utf8");
  expect(svg).toContain('x="-1000"');
  expect(svg).toContain('width="2000"');
  // The outermost <svg> clips the overhang rather than growing the canvas.
  expect(svg).toContain('viewBox="0 0 1000 1000"');

  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  let bytes = 0;
  for await (const chunk of await png.createReadStream()) {
    bytes += (chunk as Buffer).length;
  }
  expect(bytes).toBeGreaterThan(1000);
});

test("removing the image resets the framing too", async ({ page }) => {
  // Symmetric with picking a new one — otherwise a stale crop stays
  // persisted (and encoded into share links) with nothing to apply it to.
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("3");
  await expect(bgImage(page)).toHaveAttribute("width", "3000");

  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(bgImage(page)).toHaveCount(0);

  await pickImage(page);
  await expect(bgImage(page)).toHaveAttribute("width", "1000");
});

test("a drag interrupted by a Design change doesn't leave panning dead", async ({
  page,
}) => {
  // The preview lives inside {#key resolvedDesignId}, so switching Design
  // mid-drag tears down the element the pointer was captured on. Without
  // the lostpointercapture reset, every later drag would be refused.
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("2");

  const box = (await preview(page).boundingBox())!;
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await page.mouse.move(centre.x - 40, centre.y, { steps: 4 });

  // Programmatic click: a real mouse can't press a tile while its button is
  // already held, but a second touch point can — and either way the effect
  // on the DOM is the same, which is what this guards.
  await openTab(page, "Design");
  await page.evaluate(() => {
    const tiles = document.querySelectorAll<HTMLButtonElement>(
      '[role="listbox"][aria-label="Designs"] [role="option"]',
    );
    tiles[1]?.click();
  });
  await page.mouse.up();

  // Panning still works afterwards.
  await openTab(page, "Colors");
  await page.getByLabel("Horizontal").fill("0");
  const after = (await preview(page).boundingBox())!;
  const c2 = { x: after.x + after.width / 2, y: after.y + after.height / 2 };
  await page.mouse.move(c2.x, c2.y);
  await page.mouse.down();
  await page.mouse.move(c2.x - after.width / 4, c2.y, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByLabel("Horizontal")).not.toHaveValue("0");
});

test("the sidebar thumbnail shows the same framing the canvas renders", async ({
  page,
}) => {
  await page.goto("/");
  await pickImage(page);
  const thumb = page.locator(".image-preview img");
  await expect(thumb).toHaveAttribute("style", /width:\s*100%/);

  await page.getByLabel("Zoom").fill("2");
  await page.getByLabel("Horizontal").fill("-1");
  // Same numbers imagePlacement produces for the canvas, in percent.
  await expect(thumb).toHaveAttribute("style", /width:\s*200%/);
  await expect(thumb).toHaveAttribute("style", /left:\s*-100%/);
});

test("picking a different image resets the framing", async ({ page }) => {
  await page.goto("/");
  await pickImage(page);
  await page.getByLabel("Zoom").fill("3");
  await expect(bgImage(page)).toHaveAttribute("width", "3000");

  await pickImage(page);
  // A new picture gets a clean crop rather than inheriting one tuned for
  // the previous photo.
  await expect(bgImage(page)).toHaveAttribute("width", "1000");
  await expect(page.getByLabel("Zoom")).toHaveValue("1");
});
