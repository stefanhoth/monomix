/**
 * FNV-1a string hash — derives a short, deterministic SVG element id from
 * content, never from an incrementing counter (CLAUDE.md: the engine must
 * stay a pure function, and a counter would make two calls with identical
 * input return different output strings). Two calls with the same `text`
 * always produce the same id; two different `text`s produce different ids
 * (collisions aside), so unrelated elements rendered into the same document
 * never clash.
 */
export function fnv1aId(prefix: string, text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${prefix}-${(hash >>> 0).toString(16)}`;
}
