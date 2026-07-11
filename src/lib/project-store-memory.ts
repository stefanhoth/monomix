import type { Project } from "./project";
import type { ProjectStore } from "./project-store";

/**
 * In-memory fake ProjectStore (issue #14). Unit tests use this instead of
 * the real IndexedDB adapter (project-store-indexeddb.ts) so Project
 * persistence logic (autosave, "new Project inherits settings", etc.) is
 * testable in Vitest/jsdom without touching `window.indexedDB`.
 */
export function createMemoryProjectStore(seed: Project[] = []): ProjectStore {
  const projects = new Map(seed.map((project) => [project.id, project]));

  return {
    async list() {
      return [...projects.values()];
    },
    async get(id) {
      return projects.get(id);
    },
    async put(project) {
      projects.set(project.id, project);
    },
    async delete(id) {
      projects.delete(id);
    },
    async getLastEdited() {
      let latest: Project | undefined;
      for (const project of projects.values()) {
        if (!latest || project.lastEditedAt > latest.lastEditedAt) {
          latest = project;
        }
      }
      return latest;
    },
  };
}
