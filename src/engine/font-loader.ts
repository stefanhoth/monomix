import * as opentype from "opentype.js";

/**
 * Thin fetch+parse wrapper — the only non-pure piece of the engine (see
 * CLAUDE.md), and deliberately untested here: mocking fetch to cover three
 * lines of glue isn't worth it. layout.ts and render.ts, which do the real
 * work, take an already-parsed Font so they stay pure and easy to test with
 * a real font loaded from disk.
 */
export async function loadFont(url: string): Promise<opentype.Font> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return opentype.parse(buffer);
}
