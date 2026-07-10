import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as opentype from "opentype.js";

// Resolved as a static `import.meta.url` (no interpolation) so Vite doesn't
// intercept it as a `new URL(dynamic, import.meta.url)` asset reference —
// that pattern gets rewritten to a root-relative public URL, not a real
// filesystem path, when the first argument isn't a static string literal.
const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Loads a real font from src/assets/fonts for use in engine unit tests —
 * no mocking, the actual subsetted font files are fast and deterministic.
 *
 * Note: must slice the Buffer's underlying ArrayBuffer by byteOffset/length,
 * not pass `.buffer` directly — Node pools small allocations, so `.buffer`
 * alone can silently hand back unrelated bytes for small files.
 */
export function loadTestFont(id: string): opentype.Font {
  const path = join(
    HERE,
    "..",
    "..",
    "..",
    "src",
    "assets",
    "fonts",
    id,
    "font.ttf",
  );
  const buf = readFileSync(path);
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  );
  return opentype.parse(arrayBuffer);
}
