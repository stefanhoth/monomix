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
   * for the plain-arrangement Designs (ADR 0007). */
  shape: Shape;
  supports: LetterCount[];
}

interface ArrangementVariant {
  suffix: string;
  arrangement: Arrangement;
  label: string;
  supports: LetterCount[];
}

// Every font is offered in both arrangements, except "stacked" has no
// "middle" to stack when there's only one letter — it's mathematically
// identical to "classic" at Letter Count 1 (a single row), which would
// make the gallery show two pixel-identical tiles under different names.
const ARRANGEMENTS: ArrangementVariant[] = [
  {
    suffix: "classic",
    arrangement: "horizontal",
    label: "Classic",
    supports: [1, 2, 3],
  },
  {
    suffix: "stacked",
    arrangement: "stacked",
    label: "Stacked",
    supports: [2, 3],
  },
];

interface ShapeVariant {
  suffix: string;
  shape: Shape;
  label: string;
  supports: LetterCount[];
}

// The Shape catalog (ADR 0007): each entry is one Design per font, pressing
// its "classic" horizontal row into the Shape's silhouette — a "stacked"
// column has no reference circle-monogram equivalent, so Shape variants
// build on horizontal only. Further Shapes (docs/BACKLOG.md) are each just
// one more entry here plus a matching mapping function in src/engine/shape.ts.
const SHAPES: ShapeVariant[] = [
  { suffix: "circle", shape: "circle", label: "Circle", supports: [1, 2, 3] },
  {
    suffix: "diamond",
    shape: "diamond",
    label: "Diamond",
    supports: [1, 2, 3],
  },
];

function designsForFont(font: FontEntry): Design[] {
  const arrangementDesigns = ARRANGEMENTS.map((variant) => ({
    id: `${font.id}-${variant.suffix}`,
    name: `${font.family} ${variant.label}`,
    fontId: font.id,
    arrangement: variant.arrangement,
    shape: "none" as Shape,
    supports: variant.supports,
  }));

  const shapeDesigns = SHAPES.map((variant) => ({
    id: `${font.id}-${variant.suffix}`,
    name: `${font.family} ${variant.label}`,
    fontId: font.id,
    arrangement: "horizontal" as Arrangement,
    shape: variant.shape,
    supports: variant.supports,
  }));

  return [...arrangementDesigns, ...shapeDesigns];
}

export const DESIGNS: Design[] = FONTS.flatMap(designsForFont);
