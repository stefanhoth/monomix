import { describe, expect, it } from "vitest";
import { COLOR_PRESETS } from "../../src/lib/color-presets";
import { dictionary } from "../../src/lib/i18n/dictionary";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function expectValidGradient(gradient: { style: string; stops: unknown[] }) {
  expect(["linear", "radial"]).toContain(gradient.style);
  expect(gradient.stops.length).toBeGreaterThanOrEqual(2);
  for (const stop of gradient.stops as { color: string; offset: number }[]) {
    expect(stop.color).toMatch(HEX_COLOR);
    expect(stop.offset).toBeGreaterThanOrEqual(0);
    expect(stop.offset).toBeLessThanOrEqual(100);
  }
}

describe("COLOR_PRESETS", () => {
  it("has no duplicate ids", () => {
    const ids = COLOR_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is a real set of options, not a token gesture — includes both plain and gradient looks", () => {
    expect(COLOR_PRESETS.length).toBeGreaterThanOrEqual(10);
    expect(COLOR_PRESETS.length).toBeLessThanOrEqual(16);
    // Doubling from an all-solid set (issue caught in review, 2026-08-08):
    // a Colors step that can only ever flatten a curated Design's gradient
    // background to a solid felt like a downgrade — some presets must
    // actually be gradients themselves.
    const hasBackgroundGradient = COLOR_PRESETS.some(
      (p) => p.backgroundKind === "gradient",
    );
    const hasLettersGradient = COLOR_PRESETS.some(
      (p) => p.lettersColorKind === "gradient",
    );
    expect(hasBackgroundGradient).toBe(true);
    expect(hasLettersGradient).toBe(true);
  });

  it("every preset's colors are valid hex, its gradients (if any) are valid, and its name is a real dictionary key", () => {
    for (const preset of COLOR_PRESETS) {
      expect(preset.lettersColor).toMatch(HEX_COLOR);
      if (preset.backgroundKind === "color") {
        expect(preset.backgroundColor).toMatch(HEX_COLOR);
      }
      if (preset.backgroundKind === "gradient") {
        expect(preset.backgroundGradient, preset.id).toBeDefined();
        expectValidGradient(preset.backgroundGradient!);
      }
      if (preset.lettersColorKind === "gradient") {
        expect(preset.lettersGradient, preset.id).toBeDefined();
        expectValidGradient(preset.lettersGradient!);
      }
      expect(dictionary).toHaveProperty(preset.nameKey);
    }
  });
});
