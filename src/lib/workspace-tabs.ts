// The workspace sidebar's tab model (issue #47). Tabs are views over the
// same live editor state, never gates — there is no order dependency and no
// per-tab state here; App.svelte owns which tab is active.

export const WORKSPACE_TABS = ["design", "frame", "colors", "export"] as const;

export type WorkspaceTab = (typeof WORKSPACE_TABS)[number];

/**
 * Roving-focus keyboard model for the tablist, per the WAI-ARIA tabs
 * pattern: horizontal arrows move selection (wrapping), Home/End jump to the
 * ends. Returns undefined for every other key so the caller knows not to
 * preventDefault() — Tab must still leave the tablist.
 */
export function tabForKey(
  current: WorkspaceTab,
  key: string,
): WorkspaceTab | undefined {
  const count = WORKSPACE_TABS.length;
  const index = WORKSPACE_TABS.indexOf(current);
  switch (key) {
    case "ArrowRight":
      return WORKSPACE_TABS[(index + 1) % count];
    case "ArrowLeft":
      return WORKSPACE_TABS[(index - 1 + count) % count];
    case "Home":
      return WORKSPACE_TABS[0];
    case "End":
      return WORKSPACE_TABS[count - 1];
    default:
      return undefined;
  }
}
