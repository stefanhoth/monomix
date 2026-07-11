import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasCompletedOnboarding,
  markOnboardingComplete,
} from "../../src/lib/onboarding";

describe("onboarding storage guards", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("hasCompletedOnboarding returns false when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(hasCompletedOnboarding()).toBe(false);
  });

  it("markOnboardingComplete does not throw when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    expect(() => markOnboardingComplete()).not.toThrow();
  });
});
