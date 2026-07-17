import { sanitizeColor } from "./color";

/**
 * A background beyond a flat color (issue #63: image; issue #64 adds
 * gradient to this same union). Kept as an explicit `kind` variant rather
 * than several optional fields on `ComposeOptions` directly, so a caller
 * can't accidentally combine e.g. an image and a gradient — exactly one
 * fill is ever active, matching the color/transparent toggle it replaces.
 */
export type BackgroundFill = { kind: "image"; dataUrl: string };

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
    // preserveAspectRatio="xMidYMid slice" covers the square viewBox like
    // CSS `background-size: cover` — the source image is already
    // downscaled/cropped-to-square by src/lib/background-image.ts, but
    // "slice" keeps this robust even if that ever changes.
    return {
      defs: "",
      markup: `<image href="${background.dataUrl}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>`,
    };
  }

  return EMPTY_LAYER;
}
