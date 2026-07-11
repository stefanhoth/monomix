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

  describe("settleInFlight", () => {
    it("resolves immediately when nothing is in flight", async () => {
      const store = createMemoryProjectStore();
      const autosave = createAutosaveController(store, { delayMs: 400 });

      await expect(autosave.settleInFlight()).resolves.toBeUndefined();
    });

    // Regression for the delete-vs-in-flight-autosave race found in PR #31
    // review: cancelPending() only clears an *unfired* debounce timer. Once
    // the timer has fired, flush() has already captured `pending` and
    // called store.put() — cancelPending() is a no-op against that write,
    // so a delete() racing the still-unresolved put could land *before* it
    // and get resurrected. This reproduces the in-flight window (via a
    // store.put() that doesn't resolve until we say so) and proves
    // handleDeleteProject's guard — cancelPending() then
    // `await settleInFlight()` *before* store.delete() — closes it: the
    // Project stays deleted even though a write for its id was in flight
    // at the moment delete was requested.
    it("closes the delete-vs-in-flight-write race: a delete that awaits it after cancelPending is not resurrected", async () => {
      const store = createMemoryProjectStore([project()]);
      let releasePut!: () => void;
      const putGate = new Promise<void>((resolve) => {
        releasePut = resolve;
      });
      const originalPut = store.put.bind(store);
      const putSpy = vi.spyOn(store, "put").mockImplementation(async (p) => {
        await putGate;
        return originalPut(p);
      });

      const autosave = createAutosaveController(store, { delayMs: 400 });
      autosave.scheduleSave(project({ letters: "MX2" }));

      // Fire the debounce timer: flush() runs, captures `pending`, and
      // calls store.put() — which is now blocked on putGate, simulating
      // the "timer fired but the write hasn't landed yet" window.
      await vi.advanceTimersByTimeAsync(400);
      expect(putSpy).toHaveBeenCalledTimes(1);

      // Mirror handleDeleteProject's guard, in order: cancelPending() is
      // too late (the write is already in flight) but settleInFlight()
      // waits it out before we proceed to delete.
      autosave.cancelPending();
      const settled = autosave.settleInFlight();
      releasePut();
      await settled;
      await store.delete("p1");

      expect(await store.get("p1")).toBeUndefined();
    });
  });
});
