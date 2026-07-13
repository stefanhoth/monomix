import { describe, expect, it } from "vitest";
import {
  resolveFrameGap,
  DEFAULT_FRAME_GAP,
  MAX_GAP,
} from "../../src/lib/frame-gap";

describe("resolveFrameGap", () => {
  it("returns the default when unset", () => {
    expect(resolveFrameGap(undefined)).toBe(DEFAULT_FRAME_GAP);
  });

  it("passes through a gap within range", () => {
    expect(resolveFrameGap(120)).toBe(120);
  });

  it("clamps a negative gap to zero", () => {
    expect(resolveFrameGap(-20)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(resolveFrameGap(999999)).toBe(MAX_GAP);
  });

  it("rounds non-integer gaps", () => {
    expect(resolveFrameGap(50.6)).toBe(51);
  });

  it("falls back to the default for NaN instead of crashing", () => {
    expect(resolveFrameGap(Number.NaN)).toBe(DEFAULT_FRAME_GAP);
  });
});
