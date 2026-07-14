import { FONTS, type FontEntry } from "./fonts";
import type { Arrangement } from "./layout";
import type { Shape } from "./shape";

/** How many letters a Monogram consists of (CONTEXT.md: Letter Count). */
export type LetterCount = 1 | 2 | 3;

export interface Design {
  id: string;
  name: string;
  fontId: string;
  arrangement: Arrangement;
  /** The Shape (CONTEXT.md) this Design presses its letters into. "none"
   * for the plain-arrangement Designs. */
  shape: Shape;
  supports: LetterCount[];
}

function font(id: string): FontEntry {
  const found = FONTS.find((f) => f.id === id);
  if (!found) {
    throw new Error(`Unknown font id in curated Design catalog: "${id}"`);
  }
  return found;
}

interface ShapeVariant {
  fontId: string;
  shape: Exclude<Shape, "none">;
  label: string;
}

// The curated Shape catalog (issue #39): one font per distinct style voice,
// picked by visually reviewing every font x {circle, diamond} x Letter Count
// combination on the dev-only contact sheet (contact-sheet.html) — see
// DECISIONS.md for the culling call. Shaped Designs lead the gallery, per
// "the gallery leads with shaped Designs" (issue #39).
const SHAPED: ShapeVariant[] = [
  { fontId: "playfair-display", shape: "circle", label: "Circle" },
  { fontId: "playfair-display", shape: "diamond", label: "Diamond" },
  { fontId: "cinzel-decorative", shape: "circle", label: "Circle" },
  { fontId: "cinzel-decorative", shape: "diamond", label: "Diamond" },
  { fontId: "archivo-black", shape: "circle", label: "Circle" },
  { fontId: "archivo-black", shape: "diamond", label: "Diamond" },
  { fontId: "alfa-slab-one", shape: "circle", label: "Circle" },
  { fontId: "alfa-slab-one", shape: "diamond", label: "Diamond" },
  { fontId: "alex-brush", shape: "circle", label: "Circle" },
  { fontId: "alex-brush", shape: "diamond", label: "Diamond" },
  { fontId: "unifraktur-cook", shape: "circle", label: "Circle" },
  { fontId: "unifraktur-cook", shape: "diamond", label: "Diamond" },
];

interface ArrangementVariant {
  fontId: string;
  suffix: string;
  arrangement: Arrangement;
  label: string;
  supports: LetterCount[];
}

// A small tail of plain (unshaped) Designs survives the cull, for a look
// shaped Designs don't offer — a font's letters shown as-is. Kept short and
// deliberately drawn from fonts not already used above, so the curated
// catalog doesn't repeat the same font under two different-looking entries.
const UNSHAPED: ArrangementVariant[] = [
  {
    fontId: "poppins",
    suffix: "classic",
    arrangement: "horizontal",
    label: "Classic",
    supports: [1, 2, 3],
  },
  {
    fontId: "kelly-slab",
    suffix: "classic",
    arrangement: "horizontal",
    label: "Classic",
    supports: [1, 2, 3],
  },
  {
    fontId: "cormorant-garamond",
    suffix: "stacked",
    arrangement: "stacked",
    label: "Stacked",
    supports: [2, 3],
  },
];

const shapedDesigns: Design[] = SHAPED.map((variant) => {
  const f = font(variant.fontId);
  return {
    id: `${f.id}-${variant.shape}`,
    name: `${f.family} ${variant.label}`,
    fontId: f.id,
    arrangement: "horizontal",
    shape: variant.shape,
    supports: [1, 2, 3],
  };
});

const unshapedDesigns: Design[] = UNSHAPED.map((variant) => {
  const f = font(variant.fontId);
  return {
    id: `${f.id}-${variant.suffix}`,
    name: `${f.family} ${variant.label}`,
    fontId: f.id,
    arrangement: variant.arrangement,
    shape: "none",
    supports: variant.supports,
  };
});

// Shaped Designs first (issue #39 AC: "the gallery leads with shaped
// Designs"). DESIGNS[0] also seeds DEFAULT_PROJECT_SETTINGS.designId
// (src/lib/project.ts), so this ordering is what makes a circle template
// (Playfair Display Circle) the first-run default.
export const DESIGNS: Design[] = [...shapedDesigns, ...unshapedDesigns];
