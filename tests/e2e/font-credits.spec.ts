import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

// Font credits panel (ADR 0003: "an about page credits every font").

test("the credits panel lists every catalog font with its license and specimen link", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Fonts & licenses" }).click();
  const dialog = page.getByRole("dialog", { name: "Fonts & licenses" });
  await expect(dialog).toBeVisible();

  // Complete catalog, not just the fonts the curated Designs use. The count
  // is a deliberate hardcoded tripwire (mirroring the FONTS.length unit
  // assertion): e2e specs can't import src/engine (import.meta.glob), and
  // a catalog change SHOULD consciously touch this line.
  await expect(dialog.getByRole("listitem")).toHaveCount(23);

  const rye = dialog.getByRole("link", { name: "Rye" });
  await expect(rye).toHaveAttribute(
    "href",
    "https://fonts.google.com/specimen/Rye",
  );
  await expect(dialog.getByText("Apache License 2.0")).toBeVisible();

  // Specimens for fonts no Design uses load lazily once the panel opens —
  // Tangerine is such a font, so its tile proves the lazy path works.
  const tangerineRow = dialog
    .getByRole("listitem")
    .filter({ hasText: "Tangerine" });
  await expect(tangerineRow.locator("svg")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0);
});
