import type { Page } from "@playwright/test";

/** Sidebar tab names as rendered in the default (en) locale. */
export type WorkspaceTabName = "Design" | "Frame" | "Colors" | "Export";

/**
 * Activates a workspace sidebar tab (issue #47) so the controls living in
 * its panel become visible. Tabs are views over the same live state, not
 * gates — specs may open them in any order.
 */
export async function openTab(
  page: Page,
  name: WorkspaceTabName,
): Promise<void> {
  await page.getByRole("tab", { name, exact: true }).click();
}
