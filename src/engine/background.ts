import { sanitizeColor } from "./color";
import { resolvePaint, type Gradient } from "./paint";

/**
 * A background beyond a flat color (issue #63 image, issue #64 gradient).
 * Kept as an explicit `kind` variant rather than several optional fields on
 * `ComposeOptions` directly, so a caller can't accidentally combine e.g. an
 * image and a gradient — exactly one fill is ever active, matching the
 * color/transparent toggle it replaces.
 */
export type BackgroundFill =
  | { kind: "image"; dataUrl: string; transform?: ImageTransform }
  | { kind: "gradient"; gradient: Gradient };

/**
 * Zoom + pan for an image background (issue #123). Before this, an image was
 * always drawn full-bleed and centered — whatever crop `cover` picked was
 * what shipped, with no way to move the interesting part of a photo into
 * frame.
 */
export interface ImageTransform {
  /** 1 = the original `cover` fit. Below 1 would leave the canvas partly
   * empty, so it's clamped away (see `MIN_IMAGE_ZOOM`). */
  zoom: number;
  /** -1 … 1, as a fraction of the pan range the current zoom opens up.
   * 0 is centered; -1/1 pin the image's opposite edges to the canvas. At
   * zoom 1 there is no range, so any offset resolves to centered. */
  offsetX: number;
  offsetY: number;
}

export const MIN_IMAGE_ZOOM = 1;
export const MAX_IMAGE_ZOOM = 4;

export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  zoom: MIN_IMAGE_ZOOM,
  offsetX: 0,
  offsetY: 0,
};

function clampRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

/**
 * The bounds as named functions, so the engine, `normalizeProject`, and the
 * drag handler all narrow to the same range instead of restating `-1`/`1`
 * and `1`/`4` in three separate places.
 */
export function clampImageZoom(value: unknown): number {
  return clampRange(value, MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM, MIN_IMAGE_ZOOM);
}

export function clampImageOffset(value: unknown): number {
  return clampRange(value, -1, 1, 0);
}

/**
 * Where the `<image>` rect goes, in viewBox units, for a given transform.
 *
 * Offsets are **relative to the pan range the zoom actually opens up**
 * rather than absolute viewBox units: at zoom 1 the image exactly covers
 * the canvas, so there is nothing to pan and every offset resolves to the
 * same centered placement. That's what makes it impossible to drag a gap
 * into frame — the issue's own "should pan be clamped so the image can
 * never under-fill the canvas?" open question, answered by construction
 * instead of by a separate bounds check.
 *
 * At the default transform this returns exactly `{ x: 0, y: 0, size }` —
 * the same numbers the pre-#123 markup hardcoded, so every existing
 * Project's SVG stays byte-identical.
 */
export function imagePlacement(
  transform: ImageTransform | undefined,
  size: number,
): { x: number; y: number; size: number } {
  const zoom = clampImageZoom(transform?.zoom);
  const offsetX = clampImageOffset(transform?.offsetX);
  const offsetY = clampImageOffset(transform?.offsetY);

  const scaled = size * zoom;
  // Total slack in each axis once zoomed in; 0 at zoom 1.
  const overflow = scaled - size;
  return {
    x: round(-overflow / 2 + (offsetX * overflow) / 2),
    y: round(-overflow / 2 + (offsetY * overflow) / 2),
    size: round(scaled),
  };
}

/** 3 decimals: enough to keep a 4x zoom smooth at 1000 viewBox units,
 * without trailing float noise like 133.33333333333331 in exported SVG.
 * Negative zero is folded to 0 — `-0 * anything` is how a centered image at
 * zoom 1 falls out of the math, and `x="-0"` in exported SVG is valid but
 * gratuitous. */
function round(value: number): number {
  const rounded = Math.round(value * 1000) / 1000;
  return rounded === 0 ? 0 : rounded;
}

/**
 * Data URLs are the only way to embed an image inside a self-contained SVG
 * string with no DOM/fetch inside the engine (CLAUDE.md: "no DOM access,
 * no side effects") — the actual file read + downscale happens in
 * src/lib/background-image.ts, outside the engine boundary. This allow-list
 * mirrors color.ts's SAFE_COLOR_PATTERN reasoning: the value lands in an
 * `href="${...}"` attribute inside a string later rendered via `{@html}`,
 * so anything other than a base64 raster payload (in particular
 * `javascript:`/`data:text/html` or an unescaped `"`) is a real XSS vector,
 * not just a cosmetic bug.
 */
const SAFE_IMAGE_DATA_URL =
  /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

export interface BackgroundLayer {
  /** `<defs>...</defs>` markup, or "" when the fill needs none (image, flat color). */
  defs: string;
  /** The `<rect>`/`<image>` markup itself, or "" for a transparent background. */
  markup: string;
}

const EMPTY_LAYER: BackgroundLayer = { defs: "", markup: "" };

/**
 * Resolves `ComposeOptions.background` (CLAUDE.md: `render.ts`) into SVG
 * markup. Accepts a plain color/"transparent" string (the original API,
 * unchanged) or a `BackgroundFill` object for the richer fill kinds.
 */
export function composeBackgroundLayer(
  background: string | BackgroundFill | undefined,
  size: number,
): BackgroundLayer {
  if (background === undefined) return EMPTY_LAYER;

  if (typeof background === "string") {
    const color = sanitizeColor(background, "transparent");
    if (color === "transparent") return EMPTY_LAYER;
    return {
      defs: "",
      markup: `<rect width="${size}" height="${size}" fill="${color}"/>`,
    };
  }

  if (background.kind === "image") {
    if (!SAFE_IMAGE_DATA_URL.test(background.dataUrl)) return EMPTY_LAYER;
    // preserveAspectRatio="xMidYMid slice" covers the placement rect like
    // CSS `background-size: cover` — the source image is already
    // downscaled/cropped-to-square by src/lib/background-image.ts, but
    // "slice" keeps this robust even if that ever changes. Zoom/pan (issue
    // #123) move and grow that rect; the outermost <svg> clips whatever
    // spills past the viewBox.
    const placed = imagePlacement(background.transform, size);
    return {
      defs: "",
      markup: `<image href="${background.dataUrl}" x="${placed.x}" y="${placed.y}" width="${placed.size}" height="${placed.size}" preserveAspectRatio="xMidYMid slice"/>`,
    };
  }

  if (background.kind === "gradient") {
    // Same content-hashed <defs> builder the letters and Frame paints use
    // (src/engine/paint.ts) — the background just happens to have been the
    // first thing in the app that could carry a gradient.
    const { defs, value } = resolvePaint(
      background.gradient,
      "transparent",
      "mm-bg-gradient",
    );
    return {
      defs,
      markup: `<rect width="${size}" height="${size}" fill="${value}"/>`,
    };
  }

  return EMPTY_LAYER;
}
