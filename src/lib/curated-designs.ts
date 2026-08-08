import { NO_FRAME_ID, type Gradient } from "../engine";
import { DEFAULT_PROJECT_SETTINGS, type ProjectSettings } from "./project";
import type { DictKey } from "./i18n/dictionary";

/**
 * Curated Designs (impeccable shape brief, 2026-08-08 — formerly the
 * one-time "jump-off gallery", 2026-08-07): a small hand-curated set of
 * Design + Frame starting points, rendered in Easy mode's Design step
 * (src/components/EasyDesignGallery.svelte).
 *
 * Deliberately Frame-only: an entry may set the Frame's own shape/color/fill
 * and letters *opacity* (no overlap with Colors' domain — see
 * CuratedDesignEntry's own doc comment), but never letters color or the
 * Background. Colors presets (src/lib/color-presets.ts) already demonstrate
 * gradient letters and gradient backgrounds on their own; letting Design
 * *also* set those fields meant picking any Colors preset after a
 * color-rich Design silently discarded it — caught in review, 2026-08-08,
 * see docs/DECISIONS.md.
 */
export interface CuratedDesignEntry {
  id: string;
  captionKey: DictKey;
  /** Everything a curated entry fixes, on top of DEFAULT_PROJECT_SETTINGS.
   * Deliberately narrowed to Frame + `lettersOpacity` — never `designId`'s
   * letters color/background counterparts, and never `letters`/`letterCase`
   * (the visitor's own typed letters stay put). The type itself is the
   * guarantee: a field Colors also writes cannot appear here at all. */
  overrides: Partial<
    Pick<
      ProjectSettings,
      | "designId"
      | "frameId"
      | "frameGap"
      | "frameColor"
      | "frameColorKind"
      | "frameGradient"
      | "frameFilled"
      | "lettersOpacity"
    >
  >;
}

const GOLD_FRAME_GRADIENT: Gradient = {
  style: "linear",
  angle: 135,
  stops: [
    { color: "#f6e27a", offset: 0 },
    { color: "#c9971c", offset: 100 },
  ],
};

export const CURATED_DESIGNS: CuratedDesignEntry[] = [
  {
    id: "plain",
    captionKey: "curatedDesign.caption.plain",
    overrides: {
      designId: "poppins-classic",
      frameId: NO_FRAME_ID,
    },
  },
  {
    id: "gradient-frame",
    captionKey: "curatedDesign.caption.gradientFrame",
    overrides: {
      designId: "playfair-display-diamond",
      frameId: "diamond",
      frameColorKind: "gradient",
      frameGradient: GOLD_FRAME_GRADIENT,
    },
  },
  {
    id: "dotted-frame",
    captionKey: "curatedDesign.caption.dottedFrame",
    overrides: {
      designId: "alex-brush-circle",
      frameId: "dotted-circle",
      frameColor: "#b5533c",
    },
  },
  {
    id: "filled-frame-cutout",
    captionKey: "curatedDesign.caption.filledFrameCutout",
    overrides: {
      designId: "archivo-black-circle",
      frameId: "circle",
      frameColor: "#16213e",
      frameFilled: true,
      lettersOpacity: 0.1,
    },
  },
  {
    id: "dashed-frame",
    captionKey: "curatedDesign.caption.dashedFrame",
    overrides: {
      designId: "pirata-one-circle",
      frameId: "dashed-circle",
      frameColor: "#7a1f2b",
    },
  },
  {
    id: "square-frame",
    captionKey: "curatedDesign.caption.squareFrame",
    overrides: {
      designId: "kelly-slab-circle",
      frameId: "square",
      frameColor: "#1b6b57",
    },
  },
];

/** Resolves an entry into full `ProjectSettings` — an overlay on the app's
 * own defaults, so an entry only has to state what it actually changes.
 * `letters`/`letterCase` come along from `DEFAULT_PROJECT_SETTINGS` (an
 * entry's `overrides` can never touch them); callers that apply an entry to
 * the live editor (`handleCuratedDesignSelect` in App.svelte) apply only the
 * Frame-domain fields, leaving letters color and Background exactly as they
 * already were. */
export function curatedDesignSettings(
  entry: CuratedDesignEntry,
): ProjectSettings {
  return { ...DEFAULT_PROJECT_SETTINGS, ...entry.overrides };
}
