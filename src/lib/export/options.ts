const MIN_SIZE = 128;
const MAX_SIZE = 4096;
export const DEFAULT_EXPORT_SIZE = 1024;
const DEFAULT_JPG_BACKGROUND = "#ffffff";

/** Clamps a requested raster export size to a sane, integer pixel range. */
export function resolveExportSize(requested: number | undefined): number {
  if (requested === undefined || Number.isNaN(requested)) {
    return DEFAULT_EXPORT_SIZE;
  }
  return Math.round(Math.min(Math.max(requested, MIN_SIZE), MAX_SIZE));
}

/** JPG has no alpha channel, so a transparent/unset background needs a solid fallback. */
export function resolveJpgBackground(background: string | undefined): string {
  if (!background || background === "transparent") {
    return DEFAULT_JPG_BACKGROUND;
  }
  return background;
}
