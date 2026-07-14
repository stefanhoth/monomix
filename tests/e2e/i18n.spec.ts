import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";
import { openTab } from "./helpers/tabs";

test("switching the language via the manual override re-renders the UI and persists across reload", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await openTab(page, "Frame");
  await expect(
    page.getByRole("option", { name: "Circle", exact: true }),
  ).toBeVisible();
  await openTab(page, "Export");
  await expect(page.getByRole("button", { name: "Export SVG" })).toBeVisible();

  await page.getByLabel("Language").selectOption("de");
  await expect(
    page.getByRole("button", { name: "SVG exportieren" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Rahmen", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Kreis", exact: true }),
  ).toBeVisible();

  await page.reload();
  // The active tab resets to Design on reload — prove the persisted locale
  // on the always-visible chrome AND inside a re-opened panel.
  await expect(
    page.getByRole("button", { name: "Neues Projekt" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Rahmen", exact: true }).click();
  await expect(
    page.getByRole("option", { name: "Kreis", exact: true }),
  ).toBeVisible();
});
