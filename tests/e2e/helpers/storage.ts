import type { Page } from "@playwright/test";

/** IndexedDB database name used by src/lib/project-store-indexeddb.ts. */
export const PROJECTS_DB_NAME = "monomix";

/**
 * Deletes the Projects IndexedDB database before the app's own script runs
 * on the *first* navigation (issue #14). Every Playwright test already gets
 * a fresh, storage-less browser context by default, so this is primarily
 * defensive — a safety net against any future change to that default (e.g.
 * shared storageState) silently leaking Projects between tests, which would
 * make persistence specs order-dependent.
 *
 * `addInitScript` re-runs on *every* navigation in this page, including a
 * test's own `page.reload()` — without the sessionStorage guard below, a
 * spec that reloads to prove persistence would have its own just-autosaved
 * Project wiped out by this same script on that reload. sessionStorage
 * survives a reload (cleared only when the tab/context closes), so it's
 * exactly the "did this already run once this test?" marker needed here.
 */
export async function clearAppStorage(page: Page): Promise<void> {
  await page.addInitScript((dbName) => {
    const marker = "monomix:e2e-storage-cleared";
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "true");
    } catch {
      // Storage unavailable — fall through and still attempt the delete.
    }
    try {
      indexedDB.deleteDatabase(dbName);
    } catch {
      // Storage unavailable (private mode, etc.) — nothing to clear.
    }
  }, PROJECTS_DB_NAME);
}

/**
 * Reads one field of the most recently edited persisted Project directly
 * from IndexedDB, bypassing the UI entirely. Used to confirm an autosave
 * has actually landed (not just that the debounce timer fired) before a
 * test proceeds to reload the page — the one thing only a real browser's
 * IndexedDB can prove.
 */
export async function readPersistedField(
  page: Page,
  field: string,
): Promise<unknown> {
  return page.evaluate(
    ({ dbName, field }) => {
      return new Promise<unknown>((resolve) => {
        const openRequest = indexedDB.open(dbName);
        openRequest.onerror = () => resolve(undefined);
        openRequest.onsuccess = () => {
          const db = openRequest.result;
          if (!db.objectStoreNames.contains("projects")) {
            db.close();
            resolve(undefined);
            return;
          }
          const store = db
            .transaction("projects", "readonly")
            .objectStore("projects");
          const cursorRequest = store
            .index("lastEditedAt")
            .openCursor(null, "prev");
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result;
            resolve(
              cursor
                ? (cursor.value as Record<string, unknown>)[field]
                : undefined,
            );
            db.close();
          };
          cursorRequest.onerror = () => {
            resolve(undefined);
            db.close();
          };
        };
      });
    },
    { dbName: PROJECTS_DB_NAME, field },
  );
}
