/**
 * Minimal localStorage-backed stand-in for "has the user finished
 * onboarding?" (issue #13). A thin DOM-adjacent read/write wrapper only —
 * the actual first-run decision logic lives in src/lib/first-run.ts
 * (isFirstRun), which stays storage-agnostic and unit-tested without
 * touching `window`.
 *
 * This runs on the app startup path (it decides first-run before the UI
 * renders), so reads/writes are guarded: a throwing localStorage (Safari
 * private mode, storage-blocked/enterprise contexts, some webviews)
 * degrades gracefully instead of crashing the app — treated as
 * not-yet-onboarded on read, silently ignored on write.
 *
 * Issue #14 widened "first run?" to also mean "no Project exists yet" —
 * App.svelte ORs this flag together with "does any Project exist"
 * (src/lib/project-store.ts's `getLastEdited`) before calling isFirstRun(),
 * so onboarding never shows again once a Project exists, even if this
 * localStorage flag itself gets cleared. This module's role is unchanged:
 * it's still just the localStorage half of that OR.
 */
const STORAGE_KEY = "monomix:onboarded";

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Storage unavailable (private mode, blocked storage, etc.) — don't
    // block the user from proceeding; it just won't persist this session.
  }
}
