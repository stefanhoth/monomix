import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaveController } from "../../src/lib/autosave";
import { createMemoryProjectStore } from "../../src/lib/project-store-memory";
import type { Project } from "../../src/lib/project";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "MX",
    letters: "MX",
    designId: "cinzel-classic",
    frameId: "none",
    frameGap: 40,
    lettersColor: "#111111",
    frameColor: "#111111",
    transparentBackground: true,
    backgroundColor: "#ffffff",
    createdAt: 1000,
    lastEditedAt: 1000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutosaveController", () => {
  it("does not write before the debounce delay has elapsed", async () => {
    const store = createMemoryProjectStore();
    const autosave = createAutosaveController(store, { delayMs: 400 });

    autosave.scheduleSave(project());
    await vi.advanceTimersByTimeAsync(399);

    expect(await store.get("p1")).toBeUndefined();
  });

  it("writes once the debounce delay elapses", async () => {
    const store = createMemoryProjectStore();
    const autosave = createAutosaveController(store, { delayMs: 400 });

    autosave.scheduleSave(project());
    await vi.advanceTimersByTimeAsync(400);

    expect(await store.get("p1")).toEqual(project());
  });

  it("coalesces rapid successive schedules into a single write of the latest value", async () => {
    const store = createMemoryProjectStore();
    const autosave = createAutosaveController(store, { delayMs: 400 });

    autosave.scheduleSave(project({ letters: "M" }));
    await vi.advanceTimersByTimeAsync(200);
    autosave.scheduleSave(project({ letters: "MX" }));
    await vi.advanceTimersByTimeAsync(200);
    // Still within 400ms of the *second* call — no write yet.
    expect(await store.get("p1")).toBeUndefined();

    await vi.advanceTimersByTimeAsync(200);
    expect((await store.get("p1"))?.letters).toBe("MX");
  });

  it("calls onSaved with the persisted Project after a debounced write lands", async () => {
    const store = createMemoryProjectStore();
    const onSaved = vi.fn();
    const autosave = createAutosaveController(store, { delayMs: 400, onSaved });

    autosave.scheduleSave(project());
    await vi.advanceTimersByTimeAsync(400);

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledWith(project());
  });

  describe("flush", () => {
    it("performs a pending write immediately, without waiting for the delay", async () => {
      const store = createMemoryProjectStore();
      const autosave = createAutosaveController(store, { delayMs: 400 });

      autosave.scheduleSave(project());
      await autosave.flush();

      expect(await store.get("p1")).toEqual(project());
    });

    it("is a no-op when nothing is pending", async () => {
      const store = createMemoryProjectStore();
      const autosave = createAutosaveController(store, { delayMs: 400 });

      await expect(autosave.flush()).resolves.toBeUndefined();
      expect(await store.list()).toEqual([]);
    });

    it("does not double-write once the debounce timer later fires", async () => {
      const store = createMemoryProjectStore();
      const putSpy = vi.spyOn(store, "put");
      const autosave = createAutosaveController(store, { delayMs: 400 });

      autosave.scheduleSave(project());
      await autosave.flush();
      await vi.advanceTimersByTimeAsync(400);

      expect(putSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelPending", () => {
    it("discards a pending write so it never lands", async () => {
      const store = createMemoryProjectStore();
      const autosave = createAutosaveController(store, { delayMs: 400 });

      autosave.scheduleSave(project());
      autosave.cancelPending();
      await vi.advanceTimersByTimeAsync(1000);

      expect(await store.get("p1")).toBeUndefined();
    });

    it("leaves the controller usable for a later scheduleSave", async () => {
      const store = createMemoryProjectStore();
      const autosave = createAutosaveController(store, { delayMs: 400 });

      autosave.scheduleSave(project());
      autosave.cancelPending();
      autosave.scheduleSave(project({ letters: "AB" }));
      await vi.advanceTimersByTimeAsync(400);

      expect((await store.get("p1"))?.letters).toBe("AB");
    });
  });
});
