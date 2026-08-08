import type { DictKey } from "./i18n/dictionary";

/**
 * Curated color presets (impeccable shape brief, 2026-08-08): Easy mode's
 * Colors step. Deliberately narrower than the full PaintPicker/GradientEditor
 * stack — solid letters color plus a transparent-or-solid background, no
 * gradients, no opacity, no image. A curated Design (src/lib/curated-designs.ts)
 * already picked its own Frame paint; a preset here only ever touches the
 * letters and the background, so applying one never fights the Design step's
 * choice.
 */
export interface ColorPreset {
  id: string;
  nameKey: DictKey;
  lettersColor: string;
  backgroundKind: "transparent" | "color";
  /** Ignored when backgroundKind is "transparent". */
  backgroundColor: string;
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
];
