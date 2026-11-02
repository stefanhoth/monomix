import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_WORKSPACE_MODE,
  getStoredWorkspaceMode,
  storeWorkspaceMode,
} from "../../src/lib/workspace-mode";

describe("workspace mode storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("DEFAULT_WORKSPACE_MODE is full — a visitor with no stored preference must not be narrowed", () => {
    // A pre-existing user (or a session with the key cleared) already has a
    // Project from before Easy mode shipped; defaulting them into a
    // suddenly-narrower UI would be a regression, not a simplification.
    expect(DEFAULT_WORKSPACE_MODE).toBe("full");
  });

  it("getStoredWorkspaceMode returns null when nothing is stored", () => {
    expect(getStoredWorkspaceMode()).toBeNull();
  });

  it("round-trips a stored mode", () => {
    storeWorkspaceMode("easy");
    expect(getStoredWorkspaceMode()).toBe("easy");
    storeWorkspaceMode("full");
    expect(getStoredWorkspaceMode()).toBe("full");
  });

  it("getStoredWorkspaceMode ignores a garbage value", () => {
    localStorage.setItem("monomix:workspace-mode", "not-a-mode");
    expect(getStoredWorkspaceMode()).toBeNull();
  });

  it("getStoredWorkspaceMode returns null when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(getStoredWorkspaceMode()).toBeNull();
  });

  it("storeWorkspaceMode does not throw when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    expect(() => storeWorkspaceMode("easy")).not.toThrow();
  });
});
