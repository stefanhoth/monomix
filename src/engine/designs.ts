import { FONTS, type FontEntry } from "./fonts";
import type { Arrangement } from "./layout";

/** How many letters a Monogram consists of (CONTEXT.md: Letter Count). */
export type LetterCount = 1 | 2 | 3;

const ALL_LETTER_COUNTS: LetterCount[] = [1, 2, 3];

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
}

// Every font is offered in both arrangements — the underlying composition
// engine (layoutLetters) is letter-count-agnostic, so there's no technical
// reason to restrict any combination. Genuinely distinct composition styles
// (circle, diamond, interlocked glyphs) are deliberately out of scope for
// v1 — see docs/BACKLOG.md.
const ARRANGEMENTS: ArrangementVariant[] = [
  { suffix: "classic", arrangement: "horizontal", label: "Classic" },
  { suffix: "stacked", arrangement: "stacked", label: "Stacked" },
];

function designsForFont(font: FontEntry): Design[] {
  return ARRANGEMENTS.map((variant) => ({
    id: `${font.id}-${variant.suffix}`,
    name: `${font.family} ${variant.label}`,
    fontId: font.id,
    arrangement: variant.arrangement,
    supports: ALL_LETTER_COUNTS,
  }));
}

export const DESIGNS: Design[] = FONTS.flatMap(designsForFont);
