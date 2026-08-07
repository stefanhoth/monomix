/**
 * A **Paint** is anything that can fill or stroke part of a monogram: a
 * solid color string, or a Gradient (issue #122). Extracted from
 * `background.ts`, which owned the only gradient in the app until letters
 * and Frames gained one — the `<defs>` builder, stop sanitization, and the
 * content-hashed id are the same work regardless of *what* is being
 * painted, so they live here and `background.ts` now consumes them like any
 * other caller.
 *
 * Pure (no DOM), like the rest of `src/engine/` — see CLAUDE.md.
 */
import { sanitizeColor } from "./color";
import { fnv1aId } from "./hash";

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
 * What a fill/stroke can be: a plain color string (the original API
 * everywhere, unchanged) or a Gradient. A union rather than an optional
 * second field so a caller can't express "both a color and a gradient" —
 * exactly one is ever active, mirroring `BackgroundFill`.
 */
export type Paint = string | Gradient;

export function isGradient(paint: Paint | undefined): paint is Gradient {
  return typeof paint === "object" && paint !== null;
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
export function sanitizeStops(stops: GradientStop[]): GradientStop[] {
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

/**
 * A resolved Paint, ready to interpolate into markup: the `<defs>` it needs
 * (empty for a solid color, so solid-painted output stays byte-identical to
 * what shipped before gradients existed) and the value for the `fill=` /
 * `stroke=` attribute itself.
 */
export interface ResolvedPaint {
  defs: string;
  value: string;
}

/**
 * `idScope` is the id prefix, and it must be **distinct per role** —
 * "mm-letters-gradient" vs "mm-frame-gradient" vs "mm-bg-gradient". Ids are
 * hashed over the gradient's content, so painting the letters and the Frame
 * with the *same* gradient under a shared prefix would emit two identical
 * `<defs id>` elements into one document. Distinct scopes cost a few hundred
 * duplicated bytes in that one case and buy a guarantee that no two `<defs>`
 * in a composed monogram ever collide — the failure mode issue #65's
 * `<mask>` ids hit the hard way (docs/DECISIONS.md, 2026-07-17).
 */
export function resolvePaint(
  paint: Paint | undefined,
  fallback: string,
  idScope: string,
): ResolvedPaint {
  if (!isGradient(paint)) {
    return { defs: "", value: sanitizeColor(paint, fallback) };
  }

  const stops = sanitizeStops(paint.stops);
  // Hashed over the sanitized/sorted stops, not the raw input — two
  // gradients that sanitize to the same effective content (e.g. stops
  // given in a different array order) must render with the same id, not
  // just the same visible output, or the "pure function" guarantee
  // (same effective input -> byte-identical output) doesn't hold.
  const id = fnv1aId(
    idScope,
    JSON.stringify({ style: paint.style, angle: paint.angle, stops }),
  );
  const stopsMarkup = stops
    .map(
      (stop) => `<stop offset="${stop.offset}%" stop-color="${stop.color}"/>`,
    )
    .join("");

  const def =
    paint.style === "radial"
      ? // r="70.7%" (√2 / 2) reaches the viewBox's corners from its
        // center, so the gradient always fully covers a square viewBox
        // regardless of angle (radial has none).
        `<radialGradient id="${id}" cx="50%" cy="50%" r="70.7%">${stopsMarkup}</radialGradient>`
      : // Base vector is top-to-bottom (angle 0); gradientTransform's
        // rotate() pivots around the unit square's center (0.5, 0.5),
        // which is the coordinate space objectBoundingBox percentages
        // resolve into — simpler and more robust than computing x1/y1/
        // x2/y2 from the angle by hand.
        `<linearGradient id="${id}" x1="50%" y1="0%" x2="50%" y2="100%" gradientTransform="rotate(${paint.angle} 0.5 0.5)">${stopsMarkup}</linearGradient>`;

  return { defs: `<defs>${def}</defs>`, value: `url(#${id})` };
}

/**
 * One representative solid color for a Paint — a gradient's first stop.
 *
 * This is what gallery thumbnails paint with instead of the real gradient.
 * A `<defs id>` is document-global, and the Design/Frame gallery panels stay
 * *mounted but hidden* when their tab isn't active ("tabs are views, not
 * gates"), so letting ~30 tiles each emit the same content-hashed gradient
 * id as the live preview would recreate exactly the hidden-subtree id
 * corruption issue #65's `<mask>` hit (docs/DECISIONS.md, 2026-07-17).
 * Tiles preview a Design's *shape* and a Frame's *silhouette*; a two-inch
 * thumbnail is not where a gradient reads anyway.
 */
export function paintSolidColor(
  paint: Paint | undefined,
  fallback: string,
): string {
  if (!isGradient(paint)) return sanitizeColor(paint, fallback);
  return sanitizeStops(paint.stops)[0]?.color ?? fallback;
}
