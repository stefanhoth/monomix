/**
 * localStorage-backed "last seen" changelog entry id — mirrors
 * src/lib/onboarding.ts's guarded read/write pattern (Safari private mode,
 * storage-blocked contexts, etc. degrade gracefully instead of crashing the
 * app; worst case, the badge just shows again next load).
 */
const STORAGE_KEY = "monomix:whatsnew-last-seen";

export function getLastSeenEntryId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function markEntrySeen(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage unavailable — the badge just won't stay cleared this session.
  }
}
