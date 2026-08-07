/**
 * Shareable links (issue #121): encodes a Project's settings into the URL
 * hash so a link fully reproduces a monogram, and decodes one back on the
 * receiving side. MonoMix has no server and no accounts (CONTEXT.md), so the
 * link itself *is* the transport — there is nothing to look a share id up in.
 *
 * Pure (no DOM beyond `btoa`/`atob`, no `location`, no storage), so it's
 * unit-testable without a browser; App.svelte owns the actual hash reads and
 * `history.replaceState` writes, the same split `AboutPanel`'s `#about` hash
 * already uses (docs/DECISIONS.md, 2026-07-16).
 *
 * ## What a link can't carry: `backgroundImage`
 *
 * A background image is a client-downscaled data URL (1600px long edge, see
 * background-image.ts) — hundreds of KB, orders of magnitude past what any
 * URL survives in a chat app, an address bar, or an email client. The
 * decision here is to **drop it explicitly and say so**, never to truncate
 * it: the payload carries a single `bi` flag meaning "the sender's active
 * background was an image", the recipient keeps `backgroundKind: "image"`
 * with no image (which `resolveProjectBackground` already renders as
 * transparent, the same as picking Image before choosing a file), and the UI
 * tells both sides. That leaves the recipient one file-pick away from their
 * own image rather than silently handing them a corrupt link.
 */
import { sanitizeLettersInput } from "./letters-input";
import {
  DEFAULT_PROJECT_SETTINGS,
  normalizeProject,
  toProjectSettings,
  type ProjectSettings,
} from "./project";

/**
 * Payload format version, carried as `v` inside the payload. A link from a
 * future (or unrecognized) format is rejected outright rather than
 * best-effort parsed — half-decoding someone else's monogram into a
 * silently-wrong one is worse than telling them the link couldn't be read.
 */
export const SHARE_VERSION = 1;

/**
 * Hash key the payload lives under: `#m=<payload>`. Deliberately distinct
 * from the bare `#about` hash so the two can never be confused for each
 * other, and short because it's the one part of the link that isn't data.
 */
export const SHARE_HASH_KEY = "m";

/** A decoded share link: the settings plus what the link couldn't carry. */
export interface SharedMonogram {
  settings: ProjectSettings;
  /** The sender's active background was an image — see the module docstring. */
  backgroundImageOmitted: boolean;
}

/**
 * Wire shape. Keys are abbreviated and every field that matches
 * `DEFAULT_PROJECT_SETTINGS` is omitted entirely (the decoder restores it
 * from the same defaults), which keeps a typical link short enough to paste
 * anywhere — a default-ish monogram encodes to well under 100 characters.
 */
interface SharePayload {
  v: number;
  /** letters — always written, it's the identity of the monogram. */
  l: string;
  /** letterCase, only when "preserve" (absent means the "upper" default). */
  c?: "preserve";
  d?: string; // designId
  f?: string; // frameId
  g?: number; // frameGap
  lc?: string; // lettersColor
  lo?: number; // lettersOpacity
  fc?: string; // frameColor
  ff?: 1; // frameFilled
  bk?: string; // backgroundKind
  bc?: string; // backgroundColor
  bi?: 1; // sender's background was an image (the image itself is dropped)
  bg?: { s: string; a: number; p: [string, number][] }; // backgroundGradient
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // `-`/`_` and no padding: all three of `+`, `/`, `=` are legal in a URL
  // fragment but routinely mangled by chat apps and link auto-detection.
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
  // Re-pad rather than relying on atob's forgiving-base64 behavior.
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Encodes settings into the payload string (no `#m=` prefix). */
export function encodeShareSettings(settings: ProjectSettings): string {
  const defaults = DEFAULT_PROJECT_SETTINGS;
  const payload: SharePayload = { v: SHARE_VERSION, l: settings.letters };

  if (settings.letterCase === "preserve") payload.c = "preserve";
  if (settings.designId !== defaults.designId) payload.d = settings.designId;
  if (settings.frameId !== defaults.frameId) payload.f = settings.frameId;
  if (settings.frameGap !== defaults.frameGap) {
    payload.g = Math.round(settings.frameGap);
  }
  if (settings.lettersColor !== defaults.lettersColor) {
    payload.lc = settings.lettersColor;
  }
  if (settings.lettersOpacity !== defaults.lettersOpacity) {
    // Two decimals is finer than the UI's own whole-percent slider, so this
    // never loses a value a user could actually have picked.
    payload.lo = Math.round(settings.lettersOpacity * 100) / 100;
  }
  if (settings.frameColor !== defaults.frameColor) {
    payload.fc = settings.frameColor;
  }
  if (settings.frameFilled) payload.ff = 1;
  if (settings.backgroundKind !== defaults.backgroundKind) {
    payload.bk = settings.backgroundKind;
  }
  if (settings.backgroundColor !== defaults.backgroundColor) {
    payload.bc = settings.backgroundColor;
  }
  // Only flagged when the image is the *active* fill — that's the visible
  // loss the recipient needs told about. An image stashed behind another
  // background kind isn't part of what's being shared.
  if (settings.backgroundKind === "image" && settings.backgroundImage) {
    payload.bi = 1;
  }
  if (
    JSON.stringify(settings.backgroundGradient) !==
    JSON.stringify(defaults.backgroundGradient)
  ) {
    payload.bg = {
      s: settings.backgroundGradient.style,
      a: Math.round(settings.backgroundGradient.angle),
      // Stops as [color, offset] pairs rather than objects: same data, ~40%
      // fewer characters once base64'd.
      p: settings.backgroundGradient.stops.map((stop) => [
        stop.color,
        Math.round(stop.offset),
      ]),
    };
  }

  return toBase64Url(JSON.stringify(payload));
}

function isStopPair(value: unknown): value is [string, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "number"
  );
}

/**
 * Decodes a payload string back into settings, or `null` when it isn't a
 * readable MonoMix payload (truncated by a chat app, hand-edited, a future
 * format version, ...).
 *
 * Field validation is deliberately delegated to `normalizeProject` rather
 * than re-implemented: a share payload is exactly as untrusted as a record
 * read back from IndexedDB, and that function is already the one defensive
 * "untyped record in, valid Project out" boundary (see its docstring). This
 * only has to map short keys back to long ones and leave absent fields
 * absent so the defaults apply.
 */
export function decodeShareSettings(payload: string): SharedMonogram | null {
  const json = fromBase64Url(payload);
  if (json === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const raw = parsed as Record<string, unknown>;
  if (raw.v !== SHARE_VERSION) return null;
  if (typeof raw.l !== "string") return null;

  // Letters get the same sanitization a keystroke does, not just
  // `normalizeProject`'s "is it a string?" check: a link is the one way
  // letters can reach the editor without passing through the letters field,
  // and nothing downstream re-enforces the 1-3 A-Z cap (the engine would
  // happily lay out 50 glyphs). The hint is dropped — there's no keystroke
  // to explain, and the recipient didn't type anything.
  const letterCase = raw.c === "preserve" ? "preserve" : "upper";
  const record: Record<string, unknown> = {
    letters: sanitizeLettersInput(raw.l, letterCase).letters,
  };
  if (raw.c !== undefined) record.letterCase = raw.c;
  if (raw.d !== undefined) record.designId = raw.d;
  if (raw.f !== undefined) record.frameId = raw.f;
  if (raw.g !== undefined) record.frameGap = raw.g;
  if (raw.lc !== undefined) record.lettersColor = raw.lc;
  if (raw.lo !== undefined) record.lettersOpacity = raw.lo;
  if (raw.fc !== undefined) record.frameColor = raw.fc;
  if (raw.ff !== undefined) record.frameFilled = raw.ff === 1;
  if (raw.bk !== undefined) record.backgroundKind = raw.bk;
  if (raw.bc !== undefined) record.backgroundColor = raw.bc;

  const gradient = raw.bg;
  if (typeof gradient === "object" && gradient !== null) {
    const { s, a, p } = gradient as Record<string, unknown>;
    if (Array.isArray(p)) {
      record.backgroundGradient = {
        style: s,
        angle: a,
        stops: p
          .filter(isStopPair)
          .map(([color, offset]) => ({ color, offset })),
      };
    }
  }

  return {
    settings: toProjectSettings(normalizeProject(record)),
    backgroundImageOmitted: raw.bi === 1,
  };
}

/**
 * Extracts the payload from a `#m=<payload>` hash, or `null` for any other
 * hash (`#about`, empty, ...). Accepts the hash with or without the leading
 * `#` so it can be fed `location.hash` directly.
 */
export function readSharePayload(hash: string): string | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const prefix = `${SHARE_HASH_KEY}=`;
  if (!value.startsWith(prefix)) return null;
  const payload = value.slice(prefix.length);
  return payload.length > 0 ? payload : null;
}

/**
 * Builds the full shareable URL: `href` with its hash replaced by this
 * monogram's payload. Any existing hash (`#about`, a previous `#m=`) is
 * overwritten, so re-sharing never stacks payloads.
 */
export function buildShareUrl(href: string, settings: ProjectSettings): string {
  const url = new URL(href);
  url.hash = `${SHARE_HASH_KEY}=${encodeShareSettings(settings)}`;
  return url.toString();
}
