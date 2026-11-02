// The workspace sidebar's tab model (issue #47). Tabs are views over the
// same live editor state, never gates — there is no order dependency and no
// per-tab state here; App.svelte owns which tab is active.

import type { WorkspaceMode } from "./workspace-mode";

export const WORKSPACE_TABS = ["design", "frame", "colors", "export"] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

/**
 * The rail's visible steps for a mode (impeccable shape brief, 2026-08-08).
 * Easy mode hides Frame: a curated Design (src/lib/curated-designs.ts)
 * already carries its own Frame, and fine-tuning it separately is exactly
 * the kind of control Easy mode exists to hide. Full mode is the complete,
 * unfiltered rail.
 */
export function tabsForMode(mode: WorkspaceMode): readonly WorkspaceTab[] {
  return mode === "easy"
    ? WORKSPACE_TABS.filter((tab) => tab !== "frame")
    : WORKSPACE_TABS;
}

/**
 * Roving-focus keyboard model for the tablist, per the WAI-ARIA tabs
 * pattern: horizontal arrows move selection (wrapping), Home/End jump to the
 * ends. Returns undefined for every other key so the caller knows not to
 * preventDefault() — Tab must still leave the tablist. Takes the currently
 * *visible* tab list (not the constant above) so Easy mode's narrower rail
 * never lands keyboard focus on a step that isn't rendered.
 */
export function tabForKey(
  tabs: readonly WorkspaceTab[],
  current: WorkspaceTab,
  key: string,
): WorkspaceTab | undefined {
  const count = tabs.length;
  const index = tabs.indexOf(current);
  switch (key) {
    case "ArrowRight":
      return tabs[(index + 1) % count];
    case "ArrowLeft":
      return tabs[(index - 1 + count) % count];
    case "Home":
      return tabs[0];
    case "End":
      return tabs[count - 1];
    default:
      return undefined;
  }
}
