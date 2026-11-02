/**
 * Easy/Full workspace mode (impeccable shape brief, 2026-08-08): Easy mode
 * surfaces a curated Design gallery, a handful of curated color presets, and
 * Export — nothing else. Full mode is today's complete rail (Frame, per-
 * channel gradient editors, opacity, background image, ...). This is a
 * standing, always-available toggle, not a one-time overlay — it subsumes
 * the old jump-off-gallery + coach-hint mechanism (docs/DECISIONS.md).
 *
 * Same guarded-localStorage shape as src/lib/onboarding.ts: reads/writes
 * degrade to "not stored" rather than throwing (Safari private mode,
 * storage-blocked contexts, ...).
 */
export type WorkspaceMode = "easy" | "full";

const STORAGE_KEY = "monomix:workspace-mode";

/**
 * The mode a visitor with no stored preference gets. Deliberately "full",
 * not "easy": a visitor with no stored mode key already has a Project from
 * before this feature shipped (or is mid-session with the flag cleared), so
 * defaulting them into a suddenly-narrower UI would be a regression, not a
 * simplification. `completeOnboarding` (App.svelte) is the one call site
 * that explicitly stores "easy" — only a genuinely fresh onboarding
 * completion opts in.
 */
export const DEFAULT_WORKSPACE_MODE: WorkspaceMode = "full";

export function getStoredWorkspaceMode(): WorkspaceMode | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "easy" || value === "full" ? value : null;
  } catch {
    return null;
  }
}

export function storeWorkspaceMode(mode: WorkspaceMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable — the choice just won't persist across reloads.
  }
}
