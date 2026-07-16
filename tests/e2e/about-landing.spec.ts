import { test, expect } from "@playwright/test";

// The /about marketing page (issue: "market this app with style") — a
// standalone static page, separate from the in-app About panel covered by
// about.spec.ts. No skipOnboarding here: this page never touches the SPA.

test("the /about page loads, links into the app, and its FAQ expands", async ({
  page,
}) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: "Your initials, pressed into shape." }),
  ).toBeVisible();

  const openApp = page.getByRole("link", { name: "Open MonoMix" }).first();
  await expect(openApp).toHaveAttribute("href", "/");

  const faqItem = page.getByText("Does my monogram get uploaded anywhere?");
  await expect(faqItem).toBeVisible();
  await faqItem.click();
  await expect(
    page.getByText("No. MonoMix runs entirely in your browser"),
  ).toBeVisible();
});
