import { NO_FRAME_ID, type Gradient } from "../engine";
import { DEFAULT_PROJECT_SETTINGS, type ProjectSettings } from "./project";
import type { DictKey } from "./i18n/dictionary";

/**
 * Curated Designs (impeccable shape brief, 2026-08-08 — formerly the
 * one-time "jump-off gallery", 2026-08-07): a small hand-curated set of
 * *fully styled* starting points, rendered in Easy mode's Design step
 * (src/components/EasyDesignGallery.svelte). Each entry is a real,
 * renderable settings overlay (deliberately not the full catalog, see
 * docs/BACKLOG.md's rejected "gradient-accurate gallery tiles" — this
 * gallery is small enough to render every tile with its true paint, no
 * solid-color substitution needed).
 *
 * Every combination below is picked to demonstrate exactly one capability a
 * newcomer wouldn't discover by scrolling font names alone (gradient
 * letters, a filled+cut-out Frame, a gradient Background, ...) — deliberately
 * excludes a background-image example, since that needs a real photo asset
 * this repo doesn't ship one of; revisit once a licensed sample image
 * exists.
 */
export interface CuratedDesignEntry {
  id: string;
  captionKey: DictKey;
  /** Everything a curated entry fixes, on top of DEFAULT_PROJECT_SETTINGS —
   * never `letters`/`letterCase`, which stay whatever the visitor already
   * has live. */
  overrides: Partial<Omit<ProjectSettings, "letters" | "letterCase">>;
}

const GOLD_FRAME_GRADIENT: Gradient = {
  style: "linear",
  angle: 135,
  stops: [
    { color: "#f6e27a", offset: 0 },
    { color: "#c9971c", offset: 100 },
  ],
};

const SUNSET_BACKGROUND_GRADIENT: Gradient = {
  style: "radial",
  angle: 0,
  stops: [
    { color: "#ff8a65", offset: 0 },
    { color: "#6a1b9a", offset: 100 },
  ],
};

export const CURATED_DESIGNS: CuratedDesignEntry[] = [
  {
    id: "plain",
    captionKey: "curatedDesign.caption.plain",
    overrides: {
      designId: "poppins-classic",
      frameId: NO_FRAME_ID,
      lettersColor: "#111111",
    },
  },
  {
    id: "gradient-letters",
    captionKey: "curatedDesign.caption.gradientLetters",
    overrides: {
      designId: "kelly-slab-circle",
      frameId: NO_FRAME_ID,
      lettersColorKind: "gradient",
      lettersGradient: DEFAULT_PROJECT_SETTINGS.lettersGradient,
    },
  },
  {
    id: "gradient-frame",
    captionKey: "curatedDesign.caption.gradientFrame",
    overrides: {
      designId: "playfair-display-diamond",
      frameId: "diamond",
      lettersColor: "#1c1c1e",
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
      lettersColor: "#b5533c",
      frameColor: "#b5533c",
      backgroundKind: "color",
      backgroundColor: "#f7efe4",
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
      lettersColor: "#16213e",
      lettersOpacity: 0.1,
      backgroundKind: "color",
      backgroundColor: "#f4ede1",
    },
  },
  {
    id: "gradient-background",
    captionKey: "curatedDesign.caption.gradientBackground",
    overrides: {
      designId: "alfa-slab-one-circle",
      frameId: NO_FRAME_ID,
      lettersColor: "#fdf8f0",
      backgroundKind: "gradient",
      backgroundGradient: SUNSET_BACKGROUND_GRADIENT,
    },
  },
  {
    id: "dashed-frame",
    captionKey: "curatedDesign.caption.dashedFrame",
    overrides: {
      designId: "pirata-one-circle",
      frameId: "dashed-circle",
      lettersColor: "#1c1c1e",
      frameColor: "#7a1f2b",
    },
  },
];

/** Resolves an entry into full `ProjectSettings` — an overlay on the app's
 * own defaults, so an entry only has to state what it actually changes.
 * `letters`/`letterCase` come along from `DEFAULT_PROJECT_SETTINGS` (an
 * entry's `overrides` can never touch them); callers that apply an entry to
 * the live editor (EasyDesignGallery via App.svelte) keep whatever letters
 * are already typed instead of using this function's placeholder value. */
export function curatedDesignSettings(
  entry: CuratedDesignEntry,
): ProjectSettings {
  return { ...DEFAULT_PROJECT_SETTINGS, ...entry.overrides };
}
