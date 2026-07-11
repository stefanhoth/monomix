import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Project } from "./project";
import type { ProjectStore } from "./project-store";

const DB_NAME = "monomix";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const LAST_EDITED_INDEX = "lastEditedAt";

interface MonoMixDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
    indexes: { lastEditedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<MonoMixDB>> | undefined;

function getDb(): Promise<IDBPDatabase<MonoMixDB>> {
  // Lazily opened and memoized (not opened at module load) — this module is
  // imported from App.svelte, which also runs under Vitest's jsdom
  // environment for unrelated component-adjacent imports; jsdom has no
  // indexedDB, so eagerly opening at import time would break anything that
  // merely imports this file, not just things that call it.
  dbPromise ??= openDB<MonoMixDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex(LAST_EDITED_INDEX, "lastEditedAt");
    },
  });
  return dbPromise;
}

/**
 * Real IndexedDB-backed ProjectStore (issue #14) — production storage for
 * Projects. Uses the tiny (~1.2 kB gzipped) MIT-licensed `idb` package
 * (Jake Archibald) instead of hand-rolled raw IndexedDB: it wraps the
 * callback-based IndexedDB API in Promises, which removes an entire class
 * of easy-to-get-wrong transaction/callback bugs for a negligible bundle
 * cost. See src/lib/project-store-memory.ts for the unit-test fake that
 * implements the same ProjectStore interface without touching IndexedDB.
 */
export function createIndexedDbProjectStore(): ProjectStore {
  return {
    async list() {
      const db = await getDb();
      return db.getAll(STORE_NAME);
    },
    async get(id) {
      const db = await getDb();
      return db.get(STORE_NAME, id);
    },
    async put(project) {
      const db = await getDb();
      await db.put(STORE_NAME, project);
    },
    async delete(id) {
      const db = await getDb();
      await db.delete(STORE_NAME, id);
    },
    async getLastEdited() {
      const db = await getDb();
      const cursor = await db
        .transaction(STORE_NAME)
        .store.index(LAST_EDITED_INDEX)
        .openCursor(null, "prev");
      return cursor?.value;
    },
  };
}
