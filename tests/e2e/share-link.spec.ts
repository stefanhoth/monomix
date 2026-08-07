import { test, expect, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { readAllProjects } from "./helpers/storage";
import { openTab } from "./helpers/tabs";

// Shareable links (issue #121): the whole monogram travels in the URL hash
// as `#m=<payload>`; opening one imports it as a brand-new local Project.

/** A tiny valid 1x1 red PNG, for the "images can't travel in a link" case. */
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/**
 * Copies the current monogram's share link via the real UI button and reads
 * it back off the clipboard. Clipboard permissions are granted on the
 * context so the button takes its primary path rather than the
 * manual-copy fallback.
 */
async function copyShareLink(page: Page): Promise<string> {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });
  await openTab(page, "Export");
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByText("Link copied.")).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

test("a copied link reproduces the monogram for a first-run visitor, as their own Project", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  // Build something clearly distinguishable from the defaults.
  await page.getByLabel("Letters").fill("QT");
  await openTab(page, "Frame");
  await page
    .getByRole("listbox", { name: "Frames" })
    .getByRole("option", { name: "Dotted Circle", exact: true })
    .click();
  await openTab(page, "Colors");
  await page.getByLabel("Letter Color").fill("#c2185b");

  const link = await copyShareLink(page);
  expect(link).toContain("#m=");

  // A genuinely fresh visitor: no onboarding flag, no Projects, nothing but
  // the link. The shared monogram must resolve without the initials prompt
  // ever gating it — that prompt would hide what the link was sent for.
  const recipient = await page.context().browser()!.newContext();
  const recipientPage = await recipient.newPage();
  await recipientPage.goto(link);

  await expect(
    recipientPage.getByRole("button", { name: "See my monogram" }),
  ).toHaveCount(0);
  await expect(recipientPage.getByLabel("Letters")).toHaveValue("QT");
  const preview = recipientPage.locator(".preview:not([inert]) svg");
  await expect(preview.locator('g[fill="#c2185b"]')).toHaveCount(1);
  await expect(preview.locator("circle[stroke-dasharray]")).toHaveCount(1);

  // Imported as a real, autosaved Project of their own — not transient state.
  await expect
    .poll(async () => (await readAllProjects(recipientPage)).length)
    .toBe(1);

  // The payload is dropped from the URL, so a reload can't import a second
  // copy of the same monogram.
  await expect(recipientPage).not.toHaveURL(/#m=/);
  await recipientPage.reload();
  await expect(recipientPage.getByLabel("Letters")).toHaveValue("QT");
  await expect
    .poll(async () => (await readAllProjects(recipientPage)).length)
    .toBe(1);

  await recipient.close();
});

test("opening a link in an existing session keeps the previous Project alongside the imported one", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");
  await page.getByLabel("Letters").fill("AA");
  const link = await copyShareLink(page);

  // Edit on, so the existing Project is genuinely different from the link.
  await page.getByLabel("Letters").fill("BB");
  await expect.poll(async () => (await readAllProjects(page)).length).toBe(1);

  // Same tab, hash changed without a reload — the app has to import on
  // hashchange, not just on initial load.
  await page.evaluate((url) => {
    location.hash = new URL(url).hash;
  }, link);

  await expect(page.getByLabel("Letters")).toHaveValue("AA");
  // A new Project, seeded from the link — the one being edited is untouched.
  await expect.poll(async () => (await readAllProjects(page)).length).toBe(2);
  const letters = (await readAllProjects(page)).map((p) => p.letters).sort();
  expect(letters).toEqual(["AA", "BB"]);
});

test("a background image is dropped from the link, and both sides are told", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await openTab(page, "Colors");
  await page.getByRole("radio", { name: "Image" }).check();
  await page.getByLabel("Upload background image").setInputFiles({
    name: "swatch.png",
    mimeType: "image/png",
    buffer: Buffer.from(TINY_PNG_BASE64, "base64"),
  });
  await expect(page.locator(".preview:not([inert]) svg image")).toHaveCount(1);

  // Sender is warned before sharing.
  await openTab(page, "Export");
  await expect(
    page.getByText("The background image is too large for a link"),
  ).toBeVisible();

  const link = await copyShareLink(page);
  // The data URL is genuinely absent, not truncated into the payload.
  expect(link).not.toContain("data:image");
  expect(link.length).toBeLessThan(500);

  const recipient = await page.context().browser()!.newContext();
  const recipientPage = await recipient.newPage();
  await recipientPage.goto(link);

  await expect(
    recipientPage.getByText("Its background image couldn't travel in the link"),
  ).toBeVisible();
  // Everything else arrived; the background renders transparent with the
  // Image control still selected, one file-pick away from being restored.
  await expect(
    recipientPage.locator(".preview:not([inert]) svg image"),
  ).toHaveCount(0);
  await openTab(recipientPage, "Colors");
  await expect(
    recipientPage.getByRole("radio", { name: "Image" }),
  ).toBeChecked();

  await recipientPage.getByRole("button", { name: "Dismiss" }).click();
  await expect(
    recipientPage.getByText("Its background image couldn't travel in the link"),
  ).toHaveCount(0);

  await recipient.close();
});

test("a corrupted link reports itself instead of silently loading a wrong monogram", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/#m=this-is-not-a-real-payload");

  await expect(
    page.getByText("That share link couldn't be read"),
  ).toBeVisible();
  // The editor is still fully usable, on the app defaults.
  await expect(page.getByLabel("Letters")).toHaveValue("MX");
  await expect(page.locator(".preview:not([inert]) svg")).toBeVisible();
  await expect(page).not.toHaveURL(/#m=/);
});

test("the #about hash still works and is never mistaken for a share link", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/#about");

  await expect(
    page.getByRole("dialog", { name: "About MonoMix" }),
  ).toBeVisible();
  await expect(page.getByText("That share link couldn't be read")).toHaveCount(
    0,
  );
});
