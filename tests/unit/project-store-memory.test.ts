import { describe, expect, it } from "vitest";
import { createMemoryProjectStore } from "../../src/lib/project-store-memory";
import type { Project } from "../../src/lib/project";

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "MX",
    letters: "MX",
    letterCase: "upper",
    designId: "cinzel-classic",
    frameId: "none",
    frameGap: 40,
    lettersColor: "#111111",
    frameColor: "#111111",
    backgroundKind: "transparent",
    backgroundColor: "#ffffff",
    backgroundImage: null,
    createdAt: 1000,
    lastEditedAt: 1000,
    ...overrides,
  };
}

// The fake in-memory adapter (issue #14: storage-adapter seam) is exercised
// directly here so both the adapter's CRUD contract and anything built on
// top of the ProjectStore interface are testable without real IndexedDB,
// per the test plan.
describe("createMemoryProjectStore", () => {
  it("put/get round-trips a Project", async () => {
    const store = createMemoryProjectStore();
    const p = project();
    await store.put(p);
    expect(await store.get(p.id)).toEqual(p);
  });

  it("get returns undefined for an unknown id", async () => {
    const store = createMemoryProjectStore();
    expect(await store.get("missing")).toBeUndefined();
  });

  it("list returns every stored Project", async () => {
    const store = createMemoryProjectStore([
      project({ id: "a" }),
      project({ id: "b" }),
    ]);
    const list = await store.list();
    expect(list.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("delete removes a Project", async () => {
    const store = createMemoryProjectStore([project({ id: "a" })]);
    await store.delete("a");
    expect(await store.list()).toEqual([]);
  });

  it("getLastEdited returns the Project with the greatest lastEditedAt", async () => {
    const store = createMemoryProjectStore([
      project({ id: "older", lastEditedAt: 100 }),
      project({ id: "newer", lastEditedAt: 500 }),
      project({ id: "middle", lastEditedAt: 300 }),
    ]);
    expect((await store.getLastEdited())?.id).toBe("newer");
  });

  it("getLastEdited returns undefined when the store is empty", async () => {
    const store = createMemoryProjectStore();
    expect(await store.getLastEdited()).toBeUndefined();
  });

  it("put overwrites an existing Project with the same id", async () => {
    const store = createMemoryProjectStore([project({ id: "a", name: "Old" })]);
    await store.put(project({ id: "a", name: "New" }));
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("New");
  });
});
