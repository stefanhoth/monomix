import {
  DESIGNS,
  NO_FRAME_ID,
  clampImageOffset,
  clampImageZoom,
  DEFAULT_IMAGE_TRANSFORM,
  type BackgroundFill,
  type Gradient,
  type Paint,
} from "../engine";
import { DEFAULT_FRAME_GAP } from "./frame-gap";
import type { LetterCaseMode } from "./letters-input";

/**
 * The background's active fill type (issue #63 image, issue #64 gradient —
 * this replaces the old standalone `transparentBackground` boolean, which
 * could only ever express "off/on" for a single flat color). Exactly one
 * kind is ever active; the fields below it (`backgroundColor`,
 * `backgroundImage`, `backgroundGradient`) hold every kind's settings at
 * once so switching kinds in the UI doesn't lose the other kinds'
 * last-picked values.
 */
export type BackgroundKind = "transparent" | "color" | "image" | "gradient";

/**
 * Which fill is active for the letters and for the Frame (issue #122).
 * Deliberately the same "kind enum + one field per kind" shape as
 * `BackgroundKind` above rather than making `lettersColor` itself a
 * `string | Gradient` union: switching a fill to Gradient and back must not
 * throw away the solid color it had, exactly as switching Background kinds
 * doesn't. The engine still takes the union (`Paint`) — the resolvers at
 * the bottom of this file are the one place that turns these fields into
 * it, mirroring `resolveProjectBackground`.
 */
export type PaintKind = "color" | "gradient";

const PAINT_KINDS: PaintKind[] = ["color", "gradient"];

const BACKGROUND_KINDS: BackgroundKind[] = [
  "transparent",
  "color",
  "image",
  "gradient",
];

/** The Gradient a Project starts with once "Gradient" is first picked — the
 * app's own accent blue (matches the active-tab/badge color elsewhere in
 * the UI), so the first gradient a user sees already looks intentional
 * rather than a plain placeholder black-to-white ramp. */
export const DEFAULT_GRADIENT: Gradient = {
  style: "linear",
  angle: 180,
  stops: [
    { color: "#a8c7fa", offset: 0 },
    { color: "#0b57d0", offset: 100 },
  ],
};

/**
 * A Project (CONTEXT.md) captures the full editor state that #12's core
 * editor exposes: letters, the resolved Design/Frame ids, the Frame Gap,
 * and the three colors / background fill. Kept separate from `Project`'s
 * identity/metadata fields so it can be diffed, inherited by a new
 * Project, and round-tripped independently of *which* Project it belongs
 * to.
 */
export interface ProjectSettings {
  letters: string;
  /** Issue #62 / ADR 0008: "upper" (default) uppercases every letter as
   * before; "preserve" keeps each letter's case exactly as typed. */
  letterCase: LetterCaseMode;
  designId: string;
  frameId: string;
  frameGap: number;
  lettersColor: string;
  /** Issue #122. Defaults to "color" — a solid `lettersColor`, as before. */
  lettersColorKind: PaintKind;
  /** Issue #122. Always populated (never null), like `backgroundGradient`,
   * so the gradient editor always has something concrete to mutate. */
  lettersGradient: Gradient;
  /** Issue #65: letter fill opacity, 0-1. Defaults to 1 (fully opaque). */
  lettersOpacity: number;
  frameColor: string;
  /** Issue #122. Applies to both the Frame's stroke and, when
   * `frameFilled` is on, its interior. */
  frameColorKind: PaintKind;
  frameGradient: Gradient;
  /** Issue #65 follow-up: fills the Frame's interior with `frameColor`
   * instead of leaving it an unfilled ring, so reduced Letter Opacity has
   * something to cut a visible stencil out of even without a Background
   * set. No-op when `frameId` is "No Frame". Defaults to false — an
   * unfilled ring is the original look. */
  frameFilled: boolean;
  backgroundKind: BackgroundKind;
  backgroundColor: string;
  /** A data URL (issue #63), or null when no image has been picked yet. */
  backgroundImage: string | null;
  /** Issue #123: zoom + pan for the background image. Deliberately three
   * flat primitives rather than one nested object — that keeps them clear
   * of the `$state.snapshot()` requirement every object-typed field carries
   * (docs/DECISIONS.md, 2026-07-17), which the issue itself flagged.
   * Defaults reproduce the original centered `cover` fit exactly. */
  backgroundImageZoom: number;
  /** -1 … 1, relative to the pan range the current zoom opens up. */
  backgroundImageOffsetX: number;
  backgroundImageOffsetY: number;
  /** Issue #64. Always populated (never null) so the gradient editor UI
   * never has to synthesize a starting value on the fly. */
  backgroundGradient: Gradient;
}

export interface Project extends ProjectSettings {
  id: string;
  name: string;
  createdAt: number;
  lastEditedAt: number;
}

// Mirrors the hardcoded initial state App.svelte shipped with pre-#14 (#12's
// core editor) — this is only ever used when there is truly no prior Project
// to inherit from (the very first Project any user ever creates).
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  letters: "MX",
  letterCase: "upper",
  designId: DESIGNS[0]!.id,
  frameId: NO_FRAME_ID,
  frameGap: DEFAULT_FRAME_GAP,
  lettersColor: "#111111",
  lettersColorKind: "color",
  lettersGradient: DEFAULT_GRADIENT,
  lettersOpacity: 1,
  frameColor: "#111111",
  frameColorKind: "color",
  frameGradient: DEFAULT_GRADIENT,
  frameFilled: false,
  backgroundKind: "transparent",
  backgroundColor: "#ffffff",
  backgroundImage: null,
  backgroundImageZoom: DEFAULT_IMAGE_TRANSFORM.zoom,
  backgroundImageOffsetX: DEFAULT_IMAGE_TRANSFORM.offsetX,
  backgroundImageOffsetY: DEFAULT_IMAGE_TRANSFORM.offsetY,
  backgroundGradient: DEFAULT_GRADIENT,
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isPaintKind(value: unknown): value is PaintKind {
  return typeof value === "string" && (PAINT_KINDS as string[]).includes(value);
}

function isBackgroundKind(value: unknown): value is BackgroundKind {
  return (
    typeof value === "string" && (BACKGROUND_KINDS as string[]).includes(value)
  );
}

function isGradientStop(value: unknown): value is Gradient["stops"][number] {
  if (typeof value !== "object" || value === null) return false;
  const stop = value as Record<string, unknown>;
  return isString(stop.color) && isFiniteNumber(stop.offset);
}

function isGradient(value: unknown): value is Gradient {
  if (typeof value !== "object" || value === null) return false;
  const gradient = value as Record<string, unknown>;
  return (
    (gradient.style === "linear" || gradient.style === "radial") &&
    isFiniteNumber(gradient.angle) &&
    Array.isArray(gradient.stops) &&
    gradient.stops.length >= 2 &&
    gradient.stops.every(isGradientStop)
  );
}

/** Reads `backgroundKind` when present; otherwise derives it from the
 * pre-issue-#63 `transparentBackground` boolean a stored Project may still
 * carry, so existing Projects don't silently reset to the default fill. */
function resolveBackgroundKind(raw: Record<string, unknown>): BackgroundKind {
  if (isBackgroundKind(raw.backgroundKind)) return raw.backgroundKind;
  if (isBoolean(raw.transparentBackground)) {
    return raw.transparentBackground ? "transparent" : "color";
  }
  return DEFAULT_PROJECT_SETTINGS.backgroundKind;
}

/**
 * Defensive normalization from an untyped record — e.g. `JSON.parse`
 * output, or a record read back from IndexedDB that may predate a future
 * schema change — into a valid Project. Missing/malformed fields fall back
 * to defaults rather than throwing. Pure (no DOM), so it's unit-testable
 * without a browser.
 */
export function normalizeProject(raw: Record<string, unknown>): Project {
  const now = Date.now();
  return {
    id: isString(raw.id) ? raw.id : crypto.randomUUID(),
    name:
      isString(raw.name) && raw.name.trim().length > 0 ? raw.name : "Untitled",
    letters: isString(raw.letters)
      ? raw.letters
      : DEFAULT_PROJECT_SETTINGS.letters,
    letterCase:
      raw.letterCase === "upper" || raw.letterCase === "preserve"
        ? raw.letterCase
        : DEFAULT_PROJECT_SETTINGS.letterCase,
    designId: isString(raw.designId)
      ? raw.designId
      : DEFAULT_PROJECT_SETTINGS.designId,
    frameId: isString(raw.frameId)
      ? raw.frameId
      : DEFAULT_PROJECT_SETTINGS.frameId,
    frameGap: isFiniteNumber(raw.frameGap)
      ? raw.frameGap
      : DEFAULT_PROJECT_SETTINGS.frameGap,
    lettersColor: isString(raw.lettersColor)
      ? raw.lettersColor
      : DEFAULT_PROJECT_SETTINGS.lettersColor,
    lettersColorKind: isPaintKind(raw.lettersColorKind)
      ? raw.lettersColorKind
      : DEFAULT_PROJECT_SETTINGS.lettersColorKind,
    lettersGradient: isGradient(raw.lettersGradient)
      ? raw.lettersGradient
      : DEFAULT_PROJECT_SETTINGS.lettersGradient,
    lettersOpacity:
      isFiniteNumber(raw.lettersOpacity) &&
      raw.lettersOpacity >= 0 &&
      raw.lettersOpacity <= 1
        ? raw.lettersOpacity
        : DEFAULT_PROJECT_SETTINGS.lettersOpacity,
    frameColor: isString(raw.frameColor)
      ? raw.frameColor
      : DEFAULT_PROJECT_SETTINGS.frameColor,
    frameColorKind: isPaintKind(raw.frameColorKind)
      ? raw.frameColorKind
      : DEFAULT_PROJECT_SETTINGS.frameColorKind,
    frameGradient: isGradient(raw.frameGradient)
      ? raw.frameGradient
      : DEFAULT_PROJECT_SETTINGS.frameGradient,
    frameFilled: isBoolean(raw.frameFilled)
      ? raw.frameFilled
      : DEFAULT_PROJECT_SETTINGS.frameFilled,
    backgroundKind: resolveBackgroundKind(raw),
    backgroundColor: isString(raw.backgroundColor)
      ? raw.backgroundColor
      : DEFAULT_PROJECT_SETTINGS.backgroundColor,
    backgroundImage: isString(raw.backgroundImage)
      ? raw.backgroundImage
      : DEFAULT_PROJECT_SETTINGS.backgroundImage,
    // Narrowed to range here, not just checked for NaN: the engine clamps
    // again before rendering, but an out-of-range value reaching the editor
    // state (via a share link or a hand-edited record) would still show a
    // "9900%" zoom slider and skew the drag gain, which reads the raw value.
    // Same posture as `lettersOpacity` above.
    backgroundImageZoom: clampImageZoom(raw.backgroundImageZoom),
    backgroundImageOffsetX: clampImageOffset(raw.backgroundImageOffsetX),
    backgroundImageOffsetY: clampImageOffset(raw.backgroundImageOffsetY),
    backgroundGradient: isGradient(raw.backgroundGradient)
      ? raw.backgroundGradient
      : DEFAULT_PROJECT_SETTINGS.backgroundGradient,
    createdAt: isFiniteNumber(raw.createdAt) ? raw.createdAt : now,
    lastEditedAt: isFiniteNumber(raw.lastEditedAt) ? raw.lastEditedAt : now,
  };
}

/** Pure JSON round-trip (issue #14 test plan) built on `normalizeProject` —
 * see its docstring for why deserialization is defensive rather than a
 * plain `JSON.parse` cast. */
export function serializeProject(project: Project): string {
  return JSON.stringify(project);
}

export function deserializeProject(json: string): Project {
  return normalizeProject(JSON.parse(json) as Record<string, unknown>);
}

/** Strips a Project down to just the settings a new Project can inherit. */
export function toProjectSettings(project: Project): ProjectSettings {
  return {
    letters: project.letters,
    letterCase: project.letterCase,
    designId: project.designId,
    frameId: project.frameId,
    frameGap: project.frameGap,
    lettersColor: project.lettersColor,
    lettersColorKind: project.lettersColorKind,
    lettersGradient: project.lettersGradient,
    lettersOpacity: project.lettersOpacity,
    frameColor: project.frameColor,
    frameColorKind: project.frameColorKind,
    frameGradient: project.frameGradient,
    frameFilled: project.frameFilled,
    backgroundKind: project.backgroundKind,
    backgroundColor: project.backgroundColor,
    backgroundImage: project.backgroundImage,
    backgroundImageZoom: project.backgroundImageZoom,
    backgroundImageOffsetX: project.backgroundImageOffsetX,
    backgroundImageOffsetY: project.backgroundImageOffsetY,
    backgroundGradient: project.backgroundGradient,
  };
}

/** Whether two ProjectSettings are equivalent — used to skip a redundant
 * autosave write when nothing actually changed (e.g. switching the active
 * Project reassigns every field to values that already match). Gradients
 * are compared via JSON.stringify rather than a field-by-field diff: a
 * Gradient is small, plain, serializable data (the same shape it's stored
 * in), so this is a proportionate check, not a swap-in for a general deep-
 * equal dependency. */
export function projectSettingsEqual(
  a: ProjectSettings,
  b: ProjectSettings,
): boolean {
  return (
    a.letters === b.letters &&
    a.letterCase === b.letterCase &&
    a.designId === b.designId &&
    a.frameId === b.frameId &&
    a.frameGap === b.frameGap &&
    a.lettersColor === b.lettersColor &&
    a.lettersColorKind === b.lettersColorKind &&
    JSON.stringify(a.lettersGradient) === JSON.stringify(b.lettersGradient) &&
    a.lettersOpacity === b.lettersOpacity &&
    a.frameColor === b.frameColor &&
    a.frameColorKind === b.frameColorKind &&
    JSON.stringify(a.frameGradient) === JSON.stringify(b.frameGradient) &&
    a.frameFilled === b.frameFilled &&
    a.backgroundKind === b.backgroundKind &&
    a.backgroundColor === b.backgroundColor &&
    a.backgroundImage === b.backgroundImage &&
    a.backgroundImageZoom === b.backgroundImageZoom &&
    a.backgroundImageOffsetX === b.backgroundImageOffsetX &&
    a.backgroundImageOffsetY === b.backgroundImageOffsetY &&
    JSON.stringify(a.backgroundGradient) ===
      JSON.stringify(b.backgroundGradient)
  );
}

/**
 * Builds a brand-new Project from `settings`. "Start blank" (issue #48)
 * passes nothing and gets DEFAULT_PROJECT_SETTINGS — deliberately NOT the
 * last-used settings; that inheritance (#14) was the unnamed precursor of
 * Remix and got folded into `remixProject` below (docs/DECISIONS.md,
 * 2026-07-14). The name defaults to the letters themselves (e.g. "MX")
 * rather than a generic "Untitled", so the New surface's Remix tiles are
 * legible at a glance without every tile saying the same thing.
 */
export function createProject(
  settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS,
): Project {
  const now = Date.now();
  return {
    ...settings,
    id: crypto.randomUUID(),
    name: settings.letters.trim() || "Untitled",
    createdAt: now,
    lastEditedAt: now,
  };
}

/**
 * Resolves the background settings fields into what `composeMonogram`
 * (src/engine) actually accepts — shared by App.svelte's live preview and
 * NewProjectSurface.svelte's remix thumbnails so both render a Project's
 * background the same way. Falls back to transparent for "image" with
 * nothing picked yet (issue #63 AC), rather than a broken/empty fill.
 */
export function resolveProjectBackground(
  settings: Pick<
    ProjectSettings,
    | "backgroundKind"
    | "backgroundColor"
    | "backgroundImage"
    | "backgroundImageZoom"
    | "backgroundImageOffsetX"
    | "backgroundImageOffsetY"
    | "backgroundGradient"
  >,
): string | BackgroundFill {
  if (settings.backgroundKind === "color") return settings.backgroundColor;
  if (settings.backgroundKind === "image" && settings.backgroundImage) {
    return {
      kind: "image",
      dataUrl: settings.backgroundImage,
      transform: {
        zoom: settings.backgroundImageZoom,
        offsetX: settings.backgroundImageOffsetX,
        offsetY: settings.backgroundImageOffsetY,
      },
    };
  }
  if (settings.backgroundKind === "gradient") {
    return { kind: "gradient", gradient: settings.backgroundGradient };
  }
  return "transparent";
}

/**
 * Resolves the letters' fill fields into the `Paint` `composeMonogram`
 * accepts (issue #122) — the letters' counterpart to
 * `resolveProjectBackground`, and the one place the kind enum is turned
 * into an engine value.
 */
export function resolveProjectLettersPaint(
  settings: Pick<
    ProjectSettings,
    "lettersColorKind" | "lettersColor" | "lettersGradient"
  >,
): Paint {
  return settings.lettersColorKind === "gradient"
    ? settings.lettersGradient
    : settings.lettersColor;
}

/**
 * The same for the Frame. Applies to the Frame's stroke; `frameFilled` then
 * decides whether the *same* Paint also fills its interior — matching the
 * issue #65 follow-up decision to reuse `frameColor` rather than introduce
 * a second, mostly-redundant color control.
 */
export function resolveProjectFramePaint(
  settings: Pick<
    ProjectSettings,
    "frameColorKind" | "frameColor" | "frameGradient"
  >,
): Paint {
  return settings.frameColorKind === "gradient"
    ? settings.frameGradient
    : settings.frameColor;
}

/**
 * Resolves `frameFilled`/the Frame's Paint into the `fill` value
 * `composeFrame` (src/engine) accepts — shared the same way
 * `resolveProjectBackground` is, so the live preview, remix thumbnails, and
 * the Frame gallery all fill a Frame identically. `undefined` (not
 * "transparent") when off, matching `composeFrame`'s own "omitted keeps the
 * unfilled look" contract.
 */
export function resolveProjectFrameFill(
  settings: Pick<
    ProjectSettings,
    "frameFilled" | "frameColorKind" | "frameColor" | "frameGradient"
  >,
): Paint | undefined {
  return settings.frameFilled ? resolveProjectFramePaint(settings) : undefined;
}

/**
 * Remix (CONTEXT.md, issue #48): a brand-new Project seeded from an
 * existing Project's settings — fresh identity and timestamps, source left
 * untouched. This is the only way to build on a past Project; non-active
 * Projects are frozen snapshots and never re-opened for editing.
 */
export function remixProject(source: Project): Project {
  const now = Date.now();
  return {
    ...toProjectSettings(source),
    id: crypto.randomUUID(),
    name: `${source.name} Remix`,
    createdAt: now,
    lastEditedAt: now,
  };
}
