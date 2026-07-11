import { describe, expect, it } from "vitest";
import { isFirstRun } from "../../src/lib/first-run";

describe("isFirstRun", () => {
  it("is true when onboarding has not been completed", () => {
    expect(isFirstRun({ onboardingComplete: false })).toBe(true);
  });

  it("is false once onboarding has been completed", () => {
    expect(isFirstRun({ onboardingComplete: true })).toBe(false);
  });
});
