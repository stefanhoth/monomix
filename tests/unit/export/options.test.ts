import { describe, expect, it } from "vitest";
import {
  resolveExportSize,
  resolveJpgBackground,
  DEFAULT_EXPORT_SIZE,
} from "../../../src/lib/export/options";

describe("resolveExportSize", () => {
  it("returns the default when unset", () => {
    expect(resolveExportSize(undefined)).toBe(DEFAULT_EXPORT_SIZE);
  });

  it("passes through a size within range", () => {
    expect(resolveExportSize(2048)).toBe(2048);
  });

  it("clamps below the minimum", () => {
    expect(resolveExportSize(10)).toBe(128);
  });

  it("clamps above the maximum", () => {
    expect(resolveExportSize(999999)).toBe(4096);
  });

  it("rounds non-integer sizes", () => {
    expect(resolveExportSize(512.6)).toBe(513);
  });

  it("falls back to the default for NaN instead of crashing", () => {
    expect(resolveExportSize(Number.NaN)).toBe(DEFAULT_EXPORT_SIZE);
  });
});

describe("resolveJpgBackground", () => {
  it("substitutes a solid default when unset", () => {
    expect(resolveJpgBackground(undefined)).toBe("#ffffff");
  });

  it("substitutes a solid default when explicitly transparent", () => {
    expect(resolveJpgBackground("transparent")).toBe("#ffffff");
  });

  it("passes through a configured solid color", () => {
    expect(resolveJpgBackground("#00ff00")).toBe("#00ff00");
  });
});
