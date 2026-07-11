import { FONTS, type FontEntry } from "./fonts";
import type { Arrangement } from "./layout";

/** How many letters a Monogram consists of (CONTEXT.md: Letter Count). */
export type LetterCount = 1 | 2 | 3;

export interface Design {
  id: string;
  name: string;
  fontId: string;
  arrangement: Arrangement;
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
// Genuinely distinct composition styles (circle, diamond, interlocked
// glyphs) are deliberately out of scope for v1 — see docs/BACKLOG.md.
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

function designsForFont(font: FontEntry): Design[] {
  return ARRANGEMENTS.map((variant) => ({
    id: `${font.id}-${variant.suffix}`,
    name: `${font.family} ${variant.label}`,
    fontId: font.id,
    arrangement: variant.arrangement,
    supports: variant.supports,
  }));
}

export const DESIGNS: Design[] = FONTS.flatMap(designsForFont);
