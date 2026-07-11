import type { Project } from "./project";
import type { ProjectStore } from "./project-store";

export interface AutosaveOptions {
  /** Debounce window in ms. Reasonable default: long enough to coalesce a
   * burst of edits (typing, dragging the Frame Gap slider) into one write,
   * short enough that a reload moments later still sees the latest edit. */
  delayMs?: number;
  /** Fired after a debounced (or flushed) write actually lands in the store. */
  onSaved?: (project: Project) => void;
}

export interface AutosaveController {
  /** Schedule a debounced write of `project`. Rapid calls coalesce into a
   * single write of the *latest* project, `delayMs` after the last call. */
  scheduleSave(project: Project): void;
  /** If a write is pending, perform it immediately and wait for it to land
   * (e.g. before switching the active Project, so its last edit isn't
   * lost). No-op (resolves immediately) if nothing is pending. */
  flush(): Promise<void>;
  /** Discard any pending write without performing it — e.g. the active
   * Project was just deleted, so a stale debounced write must not
   * resurrect it. The controller stays usable afterwards. */
  cancelPending(): void;
}

/**
 * Debounced, coalescing autosave (issue #14): mirrors the existing debounce
 * pattern in App.svelte (the `debouncedLetters` effect) — trigger/debounce
 * logic lives here, decoupled from the actual write, so it's unit-testable
 * against a fake ProjectStore with fake timers, without real IndexedDB or
 * wall-clock waiting.
 */
export function createAutosaveController(
  store: ProjectStore,
  options: AutosaveOptions = {},
): AutosaveController {
  const delayMs = options.delayMs ?? 400;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: Project | undefined;

  async function flush(): Promise<void> {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    const project = pending;
    pending = undefined;
    if (!project) return;
    await store.put(project);
    options.onSaved?.(project);
  }

  return {
    scheduleSave(project) {
      pending = project;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, delayMs);
    },
    flush,
    cancelPending() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      pending = undefined;
    },
  };
}
