import { test, expect } from "@playwright/test";
import { skipOnboarding } from "./helpers/onboarding";

test("selecting a different Design in the gallery updates the main preview", async ({
  page,
}) => {
  await skipOnboarding(page);
  await page.goto("/");

  const gallery = page.getByRole("listbox", { name: "Designs" });
  const tiles = gallery.getByRole("option");
  await expect(tiles.first()).toBeVisible();

  const firstTile = tiles.first();
  const secondTile = tiles.nth(1);
  await expect(firstTile).toHaveAttribute("aria-selected", "true");
  await expect(secondTile).toHaveAttribute("aria-selected", "false");

  const initialPreview = await page
    .locator(".preview:not([inert])")
    .innerHTML();

  await secondTile.click();

  await expect(secondTile).toHaveAttribute("aria-selected", "true");
  await expect(firstTile).toHaveAttribute("aria-selected", "false");
  await expect
    .poll(async () => page.locator(".preview:not([inert])").innerHTML())
    .not.toBe(initialPreview);
});
