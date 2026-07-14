// The preview's transparency checkerboard adapts to the letters color, not
// to the UI theme (issue #46, docs/DECISIONS.md 2026-07-14): near-black
// default letters on the dark-mode board were unreadable, and an always-light
// board would fail mirrored for deliberately white letters. Preview-only UI —
// never exported.

export type BackdropTone = "light" | "dark";

// Single source of truth for the checkerboard colors; App.svelte feeds these
// into the CSS via custom properties, so the tone decision below can never
// drift from the colors actually rendered.
export const BACKDROP_COLORS: Record<
  BackdropTone,
  { base: string; check: string }
> = {
  light: { base: "#ffffff", check: "#dddddd" },
  dark: { base: "#1c1c1e", check: "#333333" },
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

// WCAG relative luminance of a hex color, or undefined for anything that
// isn't a plain #rgb/#rrggbb value (color inputs only ever produce #rrggbb,
// but Project settings are read back from IndexedDB and untrusted).
function relativeLuminance(color: string): number | undefined {
  const hex = color.trim();
  if (!HEX_COLOR.test(hex)) return undefined;
  const digits = hex.slice(1);
  const channels =
    digits.length === 3
      ? [...digits].map((d) => parseInt(d + d, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255);
  // The regex above guarantees exactly three channels; the destructuring
  // defaults only satisfy noUncheckedIndexedAccess.
  const [r = 0, g = 0, b = 0] = channels.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// Each board's effective luminance is the mean of its two square colors —
// derived from BACKDROP_COLORS so the constants can't disagree. The non-null
// assertions are safe: both constants are plain #rrggbb values.
function boardLuminance(tone: BackdropTone): number {
  const { base, check } = BACKDROP_COLORS[tone];
  return (relativeLuminance(base)! + relativeLuminance(check)!) / 2;
}

const BOARD_LUMINANCE = {
  light: boardLuminance("light"),
  dark: boardLuminance("dark"),
};

// Picks the board with the higher WCAG contrast ratio to the letters color,
// so preview legibility is an invariant of the system rather than a lucky
// theme/color combination. Unparseable input falls back to the light board
// (the safe choice for the near-black default letters).
export function backdropTone(lettersColor: string): BackdropTone {
  const luminance = relativeLuminance(lettersColor);
  if (luminance === undefined) return "light";
  return contrastRatio(luminance, BOARD_LUMINANCE.light) >=
    contrastRatio(luminance, BOARD_LUMINANCE.dark)
    ? "light"
    : "dark";
}
