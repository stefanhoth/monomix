import { describe, expect, it } from "vitest";
import type { Font } from "opentype.js";
import { DESIGNS, FRAMES, composeMonogram } from "../../src/engine";
import {
  JUMP_OFF_ENTRIES,
  jumpOffSettings,
} from "../../src/lib/jump-off-gallery";
import {
  resolveProjectBackground,
  resolveProjectFrameFill,
  resolveProjectFramePaint,
  resolveProjectLettersPaint,
} from "../../src/lib/project";
import { loadTestFont } from "./helpers/load-test-font";

const SAMPLE_LETTERS: Record<number, string> = { 1: "A", 2: "AB", 3: "ABC" };

const fontCache = new Map<string, Font>();
function fontFor(fontId: string): Font {
  const cached = fontCache.get(fontId);
  if (cached) return cached;
  const font = loadTestFont(fontId);
  fontCache.set(fontId, font);
  return font;
}

describe("JUMP_OFF_ENTRIES", () => {
  it("has no duplicate ids", () => {
    const ids = JUMP_OFF_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is small enough to render every tile with its true paint (no solid-color substitution needed)", () => {
    // The whole reason this gallery can skip the Design/Frame galleries'
    // solid-color tile substitution (docs/DECISIONS.md, 2026-08-07) is that
    // it's small and never hidden-but-mounted — keep it that way.
    expect(JUMP_OFF_ENTRIES.length).toBeGreaterThanOrEqual(6);
    expect(JUMP_OFF_ENTRIES.length).toBeLessThanOrEqual(9);
  });

  it.each(JUMP_OFF_ENTRIES)(
    "$id references a real Design supporting every Letter Count",
    (entry) => {
      const settings = jumpOffSettings(entry);
      const design = DESIGNS.find((d) => d.id === settings.designId);
      expect(design, `unknown designId "${settings.designId}"`).toBeDefined();
      // Curated entries deliberately stick to Designs that support 1-3
      // letters, so the gallery never needs to filter by Letter Count the
      // way the full DesignGallery does (see jump-off-gallery.ts).
      expect(design?.supports).toEqual(expect.arrayContaining([1, 2, 3]));
    },
  );

  it.each(JUMP_OFF_ENTRIES)("$id references a real Frame", (entry) => {
    const settings = jumpOffSettings(entry);
    const frame = FRAMES.find((f) => f.id === settings.frameId);
    expect(frame, `unknown frameId "${settings.frameId}"`).toBeDefined();
  });

  it.each(
    JUMP_OFF_ENTRIES.flatMap((entry) =>
      ([1, 2, 3] as const).map((count) => ({ entry, count })),
    ),
  )(
    "$entry.id composes a valid monogram for $count-letter input",
    ({ entry, count }) => {
      const settings = jumpOffSettings(entry);
      const design = DESIGNS.find((d) => d.id === settings.designId)!;
      const font = fontFor(design.fontId);
      const letters = SAMPLE_LETTERS[count]!;

      const svg = composeMonogram(letters, font, {
        arrangement: design.arrangement,
        shape: design.shape,
        frame: {
          id: settings.frameId,
          gap: settings.frameGap,
          color: resolveProjectFramePaint(settings),
          fill: resolveProjectFrameFill(settings),
        },
        lettersColor: resolveProjectLettersPaint(settings),
        lettersOpacity: settings.lettersOpacity,
        background: resolveProjectBackground(settings),
      });

      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
      expect(svg).not.toContain("NaN");
    },
  );

  it("never sets a background image (no shipped photo asset to seed it with)", () => {
    for (const entry of JUMP_OFF_ENTRIES) {
      expect(jumpOffSettings(entry).backgroundKind).not.toBe("image");
    }
  });
});
