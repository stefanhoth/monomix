/**
 * The rendering engine is pure: (letters, design, frame, colors) in, an SVG
 * markup string out. No DOM access, no globals — see CLAUDE.md. This keeps
 * every Design/Frame combination unit-testable without a browser.
 */
export function composeMonogram(letters: string): string {
  const clean = letters.toUpperCase().slice(0, 3);
  return `<monogram letters="${clean}" />`;
}
