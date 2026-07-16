import { DESIGNS, NO_FRAME_ID } from "../engine";
import { DEFAULT_FRAME_GAP } from "./frame-gap";
import type { LetterCaseMode } from "./letters-input";

/**
 * A Project (CONTEXT.md) captures the full editor state that #12's core
 * editor exposes: letters, the resolved Design/Frame ids, the Frame Gap,
 * and the three colors / transparent-background flag. Kept separate from
 * `Project`'s identity/metadata fields so it can be diffed, inherited by a
 * new Project, and round-tripped independently of *which* Project it
 * belongs to.
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
  frameColor: string;
  transparentBackground: boolean;
  backgroundColor: string;
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
  frameColor: "#111111",
  transparentBackground: true,
  backgroundColor: "#ffffff",
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
    frameColor: isString(raw.frameColor)
      ? raw.frameColor
      : DEFAULT_PROJECT_SETTINGS.frameColor,
    transparentBackground: isBoolean(raw.transparentBackground)
      ? raw.transparentBackground
      : DEFAULT_PROJECT_SETTINGS.transparentBackground,
    backgroundColor: isString(raw.backgroundColor)
      ? raw.backgroundColor
      : DEFAULT_PROJECT_SETTINGS.backgroundColor,
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
    frameColor: project.frameColor,
    transparentBackground: project.transparentBackground,
    backgroundColor: project.backgroundColor,
  };
}

/** Whether two ProjectSettings are equivalent — used to skip a redundant
 * autosave write when nothing actually changed (e.g. switching the active
 * Project reassigns every field to values that already match). */
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
    a.frameColor === b.frameColor &&
    a.transparentBackground === b.transparentBackground &&
    a.backgroundColor === b.backgroundColor
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
