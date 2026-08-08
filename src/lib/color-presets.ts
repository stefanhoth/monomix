import type { Gradient } from "../engine";
import type { BackgroundKind, PaintKind } from "./project";
import type { DictKey } from "./i18n/dictionary";

/**
 * Curated color presets (impeccable shape brief, 2026-08-08): Easy mode's
 * Colors step. Narrower than the full PaintPicker/GradientEditor stack —
 * one click applies a complete, pre-made look, no stop/angle editing, no
 * opacity, no image — but not narrower than "solid only": a preset may be a
 * pre-made gradient (letters or background), since a curated Design
 * (src/lib/curated-designs.ts) can itself set a gradient background, and a
 * Colors step that could only ever flatten that back to a solid felt like a
 * downgrade, not a choice (caught in review, 2026-08-08 — see
 * docs/DECISIONS.md). A preset only ever touches the letters and the
 * background, never the Frame, so applying one never fights the Design
 * step's own Frame choice.
 */
export interface ColorPreset {
  id: string;
  nameKey: DictKey;
  lettersColor: string;
  /** Defaults to "color" when omitted. */
  lettersColorKind?: PaintKind;
  /** Required when lettersColorKind is "gradient". */
  lettersGradient?: Gradient;
  backgroundKind: Extract<BackgroundKind, "transparent" | "color" | "gradient">;
  /** Ignored unless backgroundKind is "color". */
  backgroundColor: string;
  /** Required when backgroundKind is "gradient". */
  backgroundGradient?: Gradient;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "ink",
    nameKey: "colorPreset.ink",
    lettersColor: "#111111",
    backgroundKind: "transparent",
    backgroundColor: "#ffffff",
  },
  {
    id: "rosewood",
    nameKey: "colorPreset.rosewood",
    lettersColor: "#861657",
    backgroundKind: "transparent",
    backgroundColor: "#ffffff",
  },
  {
    id: "ivory",
    nameKey: "colorPreset.ivory",
    lettersColor: "#1c1c1e",
    backgroundKind: "color",
    backgroundColor: "#f7f3ec",
  },
  {
    id: "ocean",
    nameKey: "colorPreset.ocean",
    lettersColor: "#eaf4fb",
    backgroundKind: "color",
    backgroundColor: "#0b3b5c",
  },
  {
    id: "charcoal-cream",
    nameKey: "colorPreset.charcoalCream",
    lettersColor: "#2b2b2b",
    backgroundKind: "color",
    backgroundColor: "#f4ede1",
  },
  {
    id: "blush",
    nameKey: "colorPreset.blush",
    lettersColor: "#7a1f2b",
    backgroundKind: "color",
    backgroundColor: "#fbeee9",
  },
  {
    id: "sunset",
    nameKey: "colorPreset.sunset",
    lettersColor: "#fdf8f0",
    backgroundKind: "gradient",
    backgroundColor: "#ffffff",
    backgroundGradient: {
      style: "radial",
      angle: 0,
      stops: [
        { color: "#ff8a65", offset: 0 },
        { color: "#6a1b9a", offset: 100 },
      ],
    },
  },
  {
    id: "dusk",
    nameKey: "colorPreset.dusk",
    lettersColor: "#f2ecff",
    backgroundKind: "gradient",
    backgroundColor: "#ffffff",
    backgroundGradient: {
      style: "linear",
      angle: 160,
      stops: [
        { color: "#1b2a4a", offset: 0 },
        { color: "#4a2a6a", offset: 100 },
      ],
    },
  },
  {
    id: "citrus",
    nameKey: "colorPreset.citrus",
    lettersColor: "#1c1c1e",
    backgroundKind: "gradient",
    backgroundColor: "#ffffff",
    backgroundGradient: {
      style: "radial",
      angle: 0,
      stops: [
        { color: "#ffe27a", offset: 0 },
        { color: "#ff8a3d", offset: 100 },
      ],
    },
  },
  {
    id: "twilight",
    nameKey: "colorPreset.twilight",
    lettersColor: "#fdf6ec",
    backgroundKind: "gradient",
    backgroundColor: "#ffffff",
    backgroundGradient: {
      style: "linear",
      angle: 200,
      stops: [
        { color: "#0b1e3d", offset: 0 },
        { color: "#3a1a5c", offset: 100 },
      ],
    },
  },
  {
    id: "aurora",
    nameKey: "colorPreset.aurora",
    lettersColor: "#c9527a",
    lettersColorKind: "gradient",
    lettersGradient: {
      style: "linear",
      angle: 180,
      stops: [
        { color: "#f6a5c0", offset: 0 },
        { color: "#6a1b9a", offset: 100 },
      ],
    },
    backgroundKind: "transparent",
    backgroundColor: "#ffffff",
  },
  {
    id: "berry",
    nameKey: "colorPreset.berry",
    lettersColor: "#c9527a",
    lettersColorKind: "gradient",
    lettersGradient: {
      style: "linear",
      angle: 180,
      stops: [
        { color: "#c9527a", offset: 0 },
        { color: "#861657", offset: 100 },
      ],
    },
    backgroundKind: "color",
    backgroundColor: "#faf3f6",
  },
];
