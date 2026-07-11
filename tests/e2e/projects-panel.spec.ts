import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { clearAppStorage } from "./helpers/storage";

test.beforeEach(async ({ page }) => {
  await skipOnboarding(page);
  await clearAppStorage(page);
});

test("the recent-projects list supports renaming and deleting a Project", async ({
  page,
}) => {
  await page.goto("/");

  const list = page.locator(".projects-list");
  const originalItem = list.getByRole("listitem").filter({ hasText: "MX" });
  await expect(originalItem).toBeVisible();

  // Edit the active Project's letters (this mutates its content, not its
  // name — a Project's name only changes via explicit rename), then create
  // a second Project inheriting those settings (CONTEXT.md: "a new Project
  // starts from the most recently used settings"). This gives the list two
  // distinguishably-named tiles to target below.
  await page.getByLabel("Letters").fill("ABC");
  await page.getByRole("button", { name: "New Project" }).click();

  const newItem = list.getByRole("listitem").filter({ hasText: "ABC" });
  await expect(newItem).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  // Rename the new Project.
  await newItem.getByRole("button", { name: "Rename" }).click();
  const renameInput = page.getByLabel("Project name");
  await renameInput.fill("My Monogram");
  await renameInput.press("Enter");

  const renamedItem = list
    .getByRole("listitem")
    .filter({ hasText: "My Monogram" });
  await expect(renamedItem).toBeVisible();
  await expect(
    list.getByRole("listitem").filter({ hasText: "ABC" }),
  ).toHaveCount(0);

  // Delete the original Project.
  await originalItem.getByRole("button", { name: "Delete" }).click();

  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(originalItem).toHaveCount(0);
  await expect(renamedItem).toBeVisible();
});

test("the recent-projects list orders Projects by last-edited, most recent first", async ({
  page,
}) => {
  await page.goto("/");

  const list = page.locator(".projects-list");
  await expect(list.getByRole("listitem")).toHaveCount(1);

  await page.getByLabel("Letters").fill("ABC");
  await page.getByRole("button", { name: "New Project" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  // The just-created (and therefore most recently edited) Project sorts first.
  await expect(list.getByRole("listitem").first()).toContainText("ABC");

  // Switching to the original "MX" Project alone must not reorder the list
  // (viewing isn't editing) — only an actual edit afterwards should.
  await list
    .getByRole("listitem")
    .filter({ hasText: "MX" })
    .locator(".project-tile")
    .click();
  await expect(list.getByRole("listitem").first()).toContainText("ABC");

  await page.getByLabel("Letter Color").fill("#00ff00");

  await expect
    .poll(
      async () =>
        (await list.getByRole("listitem").first().textContent()) ?? "",
    )
    .toContain("MX");
});
