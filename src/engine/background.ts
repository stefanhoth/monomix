import { sanitizeColor } from "./color";

/** issue #64: linear or radial, kept deliberately small per the issue's own
 * "keep the initial set small and curated" open question — no conic, no
 * repeating gradients. */
export type GradientStyle = "linear" | "radial";

export interface GradientStop {
  color: string;
  /** 0-100. */
  offset: number;
}

export interface Gradient {
  style: GradientStyle;
  /** Degrees, clockwise, 0 = top-to-bottom. Ignored for "radial". */
  angle: number;
  /** 2-3 stops, first-to-last. */
  stops: GradientStop[];
}

/**
 * A background beyond a flat color (issue #63 image, issue #64 gradient).
 * Kept as an explicit `kind` variant rather than several optional fields on
 * `ComposeOptions` directly, so a caller can't accidentally combine e.g. an
 * image and a gradient — exactly one fill is ever active, matching the
 * color/transparent toggle it replaces.
 */
export type BackgroundFill =
  { kind: "image"; dataUrl: string } | { kind: "gradient"; gradient: Gradient };

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

/**
 * A short deterministic id derived from the gradient's own content (FNV-1a
 * over its JSON form), not an incrementing counter — `composeMonogram` must
 * stay a pure function (CLAUDE.md), and a module-level counter would make
 * two calls with identical inputs return different `<defs id>`s. Two
 * *different* gradients rendered into the same document (e.g. several
 * NewProjectSurface remix thumbnails) get different ids; two identical
 * ones harmlessly share one, which is correct since their defs are
 * identical too.
 */
function gradientId(gradient: Gradient): string {
  let hash = 0x811c9dc5;
  const text = JSON.stringify(gradient);
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `mm-bg-gradient-${(hash >>> 0).toString(16)}`;
}

function clampOffset(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;
}

/** 2-3 stops, each color-sanitized and offset-clamped, then sorted by
 * offset; falls back to a plain white-to-black pair if fewer than 2 valid
 * stops survive (mirrors sanitizeColor's "never let malformed input reach
 * the SVG string" rule — a gradient with 0-1 stops isn't renderable as a
 * gradient at all). The sort matters for correctness, not just tidiness:
 * SVG clamps an out-of-order stop's offset up to the previous stop's
 * offset, so e.g. stops arriving as [{0%}, {100%}, {50%}] (array order, not
 * offset order — this is exactly what naively appending a new middle stop
 * produces) would render the 50% stop clamped to 100%, collapsing it onto
 * the previous stop as a hard color break instead of a smooth blend. */
function sanitizeStops(stops: GradientStop[]): GradientStop[] {
  const cleaned = stops
    .slice(0, 3)
    .map((stop) => ({
      color: sanitizeColor(stop.color, "#ffffff"),
      offset: clampOffset(stop.offset),
    }))
    .sort((a, b) => a.offset - b.offset);
  return cleaned.length >= 2
    ? cleaned
    : [
        { color: "#ffffff", offset: 0 },
        { color: "#000000", offset: 100 },
      ];
}

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

  if (background.kind === "gradient") {
    const { gradient } = background;
    const stops = sanitizeStops(gradient.stops);
    // Hashed over the sanitized/sorted stops, not the raw input — two
    // gradients that sanitize to the same effective content (e.g. stops
    // given in a different array order) must render with the same id, not
    // just the same visible output, or the "pure function" guarantee
    // (same effective input -> byte-identical output) doesn't hold.
    const id = gradientId({
      style: gradient.style,
      angle: gradient.angle,
      stops,
    });
    const stopsMarkup = stops
      .map(
        (stop) => `<stop offset="${stop.offset}%" stop-color="${stop.color}"/>`,
      )
      .join("");

    const def =
      gradient.style === "radial"
        ? // r="70.7%" (√2 / 2) reaches the viewBox's corners from its
          // center, so the gradient always fully covers a square viewBox
          // regardless of angle (radial has none).
          `<radialGradient id="${id}" cx="50%" cy="50%" r="70.7%">${stopsMarkup}</radialGradient>`
        : // Base vector is top-to-bottom (angle 0); gradientTransform's
          // rotate() pivots around the unit square's center (0.5, 0.5),
          // which is the coordinate space objectBoundingBox percentages
          // resolve into — simpler and more robust than computing x1/y1/
          // x2/y2 from the angle by hand.
          `<linearGradient id="${id}" x1="50%" y1="0%" x2="50%" y2="100%" gradientTransform="rotate(${gradient.angle} 0.5 0.5)">${stopsMarkup}</linearGradient>`;

    return {
      defs: `<defs>${def}</defs>`,
      markup: `<rect width="${size}" height="${size}" fill="url(#${id})"/>`,
    };
  }

  return EMPTY_LAYER;
}
