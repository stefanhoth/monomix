import { test, expect, type Page } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";
import {
  clearAppStorage,
  readAllProjects,
  readPersistedField,
} from "./helpers/storage";

// The New surface (issue #48): "Start blank" + recent Projects as Remix
// seeds. Remix-only — non-active Projects are frozen snapshots (rename,
// delete, remix; never re-opened for editing).

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await clearAppStorage(page);
});

function newSurface(page: Page) {
  return page.getByRole("dialog", { name: "New Project" });
}

async function openNewSurface(page: Page) {
  await page.getByRole("button", { name: "New Project" }).click();
  const dialog = newSurface(page);
  await expect(dialog).toBeVisible();
  return dialog;
}

test("remixing seeds a new active Project and leaves the source untouched (the core Remix journey)", async ({
  page,
}) => {
  await page.goto("/");
  // Give the source Project distinctive content, and let the autosave land.
  await page.getByLabel("Letters").fill("ABC");
  await expect.poll(() => readPersistedField(page, "letters")).toBe("ABC");

  const dialog = await openNewSurface(page);
  await dialog.getByRole("button", { name: "Remix" }).click();
  await expect(dialog).toHaveCount(0);

  // The remix is active: same settings as the source, new identity.
  await expect(page.getByLabel("Letters")).toHaveValue("ABC");

  // Editing now must land on the remix, not the source.
  await page.getByLabel("Letters").fill("XYZ");
  await expect.poll(() => readPersistedField(page, "letters")).toBe("XYZ");

  const projects = await readAllProjects(page);
  expect(projects).toHaveLength(2);
  const source = projects.find((p) => p.name === "MX");
  const remix = projects.find((p) => p.name === "MX Remix");
  // The source's content and lastEditedAt are untouched (issue #48 AC).
  expect(source?.letters).toBe("ABC");
  expect(remix?.letters).toBe("XYZ");
  expect(source?.lastEditedAt as number).toBeLessThan(
    remix?.lastEditedAt as number,
  );
});

test("remixing the active Project right after an edit captures that edit (no stale seed from the autosave debounce)", async ({
  page,
}) => {
  await page.goto("/");
  // Deliberately NO poll for the autosave here — remix immediately, while
  // the edit may still sit inside the 400ms debounce window. The remix
  // must seed from the live editor state either way.
  await page.getByLabel("Letters").fill("QQQ");
  const dialog = await openNewSurface(page);
  await dialog.getByRole("button", { name: "Remix" }).click();

  await expect(page.getByLabel("Letters")).toHaveValue("QQQ");
  await expect.poll(() => readPersistedField(page, "letters")).toBe("QQQ");
});

test("'Start blank' starts from app defaults, not the last-used settings", async ({
  page,
}) => {
  await page.goto("/");
  // Make the active Project distinctly non-default first.
  await page.getByLabel("Letters").fill("ABC");
  await openTab(page, "Frame");
  await page.getByRole("option", { name: "Circle", exact: true }).click();
  await expect.poll(() => readPersistedField(page, "frameId")).toBe("circle");

  const dialog = await openNewSurface(page);
  await dialog.getByRole("button", { name: "Start blank" }).click();
  await expect(dialog).toHaveCount(0);

  // App defaults (reverses #14's "inherit last settings" — that path is
  // Remix now): default letters, no Frame.
  await expect(page.getByLabel("Letters")).toHaveValue("MX");
  await expect.poll(() => readPersistedField(page, "frameId")).toBe("none");
});

test("the New surface supports renaming and deleting a Project", async ({
  page,
}) => {
  await page.goto("/");

  const dialog = await openNewSurface(page);
  const items = dialog.getByRole("listitem");
  await expect(items).toHaveCount(1);

  // Rename the (only) Project.
  await items.first().getByRole("button", { name: "Rename" }).click();
  const renameInput = page.getByLabel("Project name");
  await renameInput.fill("My Monogram");
  await renameInput.press("Enter");
  await expect(items.filter({ hasText: "My Monogram" }).first()).toBeVisible();

  // Create a second Project, then delete the renamed one.
  await dialog.getByRole("button", { name: "Start blank" }).click();
  await openNewSurface(page);
  await expect(items).toHaveCount(2);
  await items
    .filter({ hasText: "My Monogram" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(items).toHaveCount(1);
  await expect(items.filter({ hasText: "My Monogram" })).toHaveCount(0);
});

test("deleting the active Project falls back to the most recently edited remaining one", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Letters").fill("ABC");
  await expect.poll(() => readPersistedField(page, "letters")).toBe("ABC");

  // Distinguish the two Projects by name before creating the second.
  let dialog = await openNewSurface(page);
  await dialog
    .getByRole("listitem")
    .first()
    .getByRole("button", { name: "Rename" })
    .click();
  const renameInput = page.getByLabel("Project name");
  await renameInput.fill("Original");
  await renameInput.press("Enter");

  // "Start blank" → a fresh default Project ("MX") becomes active.
  await dialog.getByRole("button", { name: "Start blank" }).click();
  await expect(page.getByLabel("Letters")).toHaveValue("MX");

  // Delete the active blank Project from the New surface.
  dialog = await openNewSurface(page);
  await dialog
    .getByRole("listitem")
    .filter({ hasText: "MX" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(dialog.getByRole("listitem")).toHaveCount(1);

  // The editor fell back to the remaining Project's content.
  await expect(page.getByLabel("Letters")).toHaveValue("ABC");
});
