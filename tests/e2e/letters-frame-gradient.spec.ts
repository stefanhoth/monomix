import { test, expect, type Download, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { readPersistedField } from "./helpers/storage";
import { openTab } from "./helpers/tabs";

// Gradient fills for letters and Frames (issue #122) — the Background could
// already carry a gradient (issue #64); this gives the other two the same.

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
});

const preview = (page: Page) => page.locator(".preview:not([inert]) svg");

async function readDownload(download: Download): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

/** The Colors tab's three fill choosers, each a fieldset named after its
 * target ("Letters", "Frame", "Background"). */
type FillTarget = "Letters" | "Frame" | "Background";

const fillGroup = (page: Page, target: FillTarget) =>
  page.getByRole("group", { name: target, exact: true });

async function pickGradient(page: Page, target: FillTarget) {
  await fillGroup(page, target)
    .getByRole("radio", { name: "Gradient" })
    .check();
}

test("letters can be painted with a gradient, and it survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  await expect(preview(page).locator("g[fill]")).toHaveCount(1);

  await openTab(page, "Colors");
  await pickGradient(page, "Letters");

  // The glyph group now references a paint server instead of a flat color.
  const glyphGroup = preview(page).locator(
    "g[fill^='url(#mm-letters-gradient']",
  );
  await expect(glyphGroup).toHaveCount(1);
  await expect(
    preview(page).locator("linearGradient[id^='mm-letters-gradient']"),
  ).toHaveCount(1);

  // Autosave round-trip: a gradient is an object-typed ProjectSettings
  // field, the exact shape that broke persistence in issue #64. Wait for the
  // write to actually land in IndexedDB before reloading — the debounce
  // (400ms) outlives the assertions above, and only real storage can prove
  // the object survived structured cloning.
  await expect
    .poll(() => readPersistedField(page, "lettersColorKind"))
    .toBe("gradient");
  await expect
    .poll(async () => {
      const stored = await readPersistedField(page, "lettersGradient");
      return (stored as { stops?: unknown[] } | undefined)?.stops?.length;
    })
    .toBe(2);

  await page.reload();
  await expect(
    preview(page).locator("g[fill^='url(#mm-letters-gradient']"),
  ).toHaveCount(1);
  await openTab(page, "Colors");
  await expect(
    fillGroup(page, "Letters").getByRole("radio", { name: "Gradient" }),
  ).toBeChecked();
});

test("switching a fill to gradient and back keeps the solid color it had", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Colors");

  await page.getByLabel("Letter Color", { exact: true }).fill("#c2185b");
  await expect(preview(page).locator('g[fill="#c2185b"]')).toHaveCount(1);

  await pickGradient(page, "Letters");
  await expect(preview(page).locator('g[fill="#c2185b"]')).toHaveCount(0);

  await fillGroup(page, "Letters")
    .getByRole("radio", { name: "Solid color" })
    .check();
  // The picked color is still there — the kind chooses which fill is live,
  // it doesn't discard the other one.
  await expect(preview(page).locator('g[fill="#c2185b"]')).toHaveCount(1);
  await expect(page.getByLabel("Letter Color", { exact: true })).toHaveValue(
    "#c2185b",
  );
});

test("a Frame's stroke and fill can both be gradient, with the letters still cut out", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();

  await openTab(page, "Colors");
  await pickGradient(page, "Frame");
  await page.getByLabel("Fill Frame").check();

  await expect(
    preview(page).locator("circle[stroke^='url(#mm-frame-gradient']"),
  ).toHaveCount(1);
  // The cutout mask still applies over a gradient fill — the hole is a
  // <mask>, not a color operation (docs/DECISIONS.md, 2026-07-17).
  const filled = preview(page).locator(
    "circle[fill^='url(#mm-frame-fill-gradient'][mask]",
  );
  await expect(filled).toHaveCount(1);
});

test("no two gradient defs share an id across the whole page, even with galleries mounted", async ({
  page,
}) => {
  // The guard for this feature's real hazard: a <defs id> is document-global,
  // and the Design/Frame gallery panels stay mounted-but-hidden when another
  // tab is active. Gallery tiles therefore paint with a representative solid,
  // never the gradient itself (docs/DECISIONS.md) — this is what proves it.
  await page.goto("/");
  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Circle", exact: true })
    .click();

  await openTab(page, "Colors");
  // Deliberately the same gradient for all three fills, the worst case for
  // content-hashed ids.
  await pickGradient(page, "Letters");
  await pickGradient(page, "Frame");
  await page.getByLabel("Fill Frame").check();
  await pickGradient(page, "Background");

  await expect(preview(page).locator("g[fill^='url(#']")).toHaveCount(1);

  const ids = await page.evaluate(() =>
    [
      ...document.querySelectorAll("linearGradient[id], radialGradient[id]"),
    ].map((el) => el.id),
  );
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
});

test("a gradient-painted monogram round-trips into every export format", async ({
  page,
}) => {
  await page.goto("/");
  await openTab(page, "Colors");
  await pickGradient(page, "Letters");
  // Red -> blue, so each stop is unmistakable in the rasterized output.
  const stops = page.getByRole("group", { name: "Letter gradient" });
  await stops.getByLabel("Color stop 1", { exact: true }).fill("#ff0000");
  await stops.getByLabel("Color stop 2", { exact: true }).fill("#0000ff");
  await expect(
    preview(page).locator("g[fill^='url(#mm-letters-gradient']"),
  ).toHaveCount(1);

  await openTab(page, "Export");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);
  const svg = (await readDownload(download)).toString("utf8");

  expect(svg).toContain("<linearGradient");
  expect(svg).toMatch(/<g fill="url\(#mm-letters-gradient-[^"]+\)"/);

  // The raster and PDF paths don't carry that markup through — canvas
  // rasterizes it and svg2pdf re-draws it — so "it's in the SVG" is no
  // evidence for either. Both stops must actually survive, or a silently
  // flattened gradient would pass unnoticed.
  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PNG" }).click(),
  ]);
  const pngBytes = [...(await readDownload(png))];
  const spread = await page.evaluate(async (bytes) => {
    const bmp = await createImageBitmap(
      new Blob([new Uint8Array(bytes)], { type: "image/png" }),
    );
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const data = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    let reddish = 0;
    let bluish = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 128) continue;
      if (data[i]! > 150 && data[i + 2]! < 100) reddish++;
      if (data[i + 2]! > 150 && data[i]! < 100) bluish++;
    }
    return { reddish, bluish };
  }, pngBytes);
  // Both ends of the ramp are present, so this is a real gradient rather
  // than either stop's color applied flat.
  expect(spread.reddish).toBeGreaterThan(100);
  expect(spread.bluish).toBeGreaterThan(100);

  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export PDF" }).click(),
  ]);
  // svg2pdf emits a genuine PDF shading pattern rather than dropping the
  // fill or flattening it to one color.
  const pdfText = (await readDownload(pdf)).toString("latin1");
  expect(pdfText).toContain("/Shading");
  expect(pdfText).toContain("/Pattern");
});
