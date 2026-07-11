import type { Project } from "./project";

/**
 * Storage-adapter seam (issue #14): the app (and the pure helpers in
 * project.ts, e.g. `createNewProject`) depend only on this interface, never
 * on IndexedDB directly. That's what lets unit tests swap in the in-memory
 * fake (project-store-memory.ts) instead of requiring real IndexedDB in
 * Vitest/jsdom. Production wires up project-store-indexeddb.ts.
 */
export interface ProjectStore {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | undefined>;
  put(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
  /** The Project with the most recent `lastEditedAt`, or undefined if none exist. */
  getLastEdited(): Promise<Project | undefined>;
}
