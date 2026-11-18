#!/usr/bin/env -S npx tsx
/**
 * Generates the app's branding assets from one mark: a Playfair Display "M"
 * (OFL, vendored in src/assets/fonts) inside a hairline ring — a nod to the
 * Frames around a monogram — in cream on the app accent (#861657).
 * Glyph outlines are converted to paths, so the SVGs have no font dependency.
 *
 *   npx tsx scripts/generate-icons.ts
 *
 * Writes public/favicon.svg, icon-192.png, icon-512.png, icon-maskable-512.png
 * and apple-touch-icon.png. To swap the mark, edit `mark` below (or replace
 * the files in public/ directly). Rasterised with sharp, no browser needed.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACCENT = "#861657";
const CREAM = "#f7f1e8";

const buf = await fs.readFile(
  path.join(root, "src/assets/fonts/playfair-display/font.ttf"),
);
const font = opentype.parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
);

/** The mark in a 100x100 box, scaled by `s` about the center. */
function mark(s: number, ring: boolean): string {
  const glyph = font.getPath("M", 0, 0, 100);
  const b = glyph.getBoundingBox();
  const k = (ring ? 46 : 58) / Math.max(b.x2 - b.x1, b.y2 - b.y1);
  const tx = 50 - ((b.x1 + b.x2) / 2) * k;
  const ty = 50 - ((b.y1 + b.y2) / 2) * k;
  const parts = [
    `<path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${k.toFixed(4)})" d="${glyph.toPathData(2)}" fill="${CREAM}"/>`,
  ];
  if (ring) {
    parts.unshift(
      `<circle cx="50" cy="50" r="37" fill="none" stroke="${CREAM}" stroke-width="1.6"/>`,
    );
  }
  return `<g transform="translate(50 50) scale(${s}) translate(-50 -50)">${parts.join("")}</g>`;
}

function svg(opts: { rx: number; scale: number; ring: boolean }): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="${opts.rx}" fill="${ACCENT}"/>` +
    mark(opts.scale, opts.ring) +
    `</svg>`
  );
}

const pub = (f: string) => path.join(root, "public", f);
// Favicon: no ring (it turns to mud at 16px), bigger glyph.
await fs.writeFile(
  pub("favicon.svg"),
  svg({ rx: 22, scale: 1, ring: false }) + "\n",
);
const rounded = svg({ rx: 22, scale: 1, ring: true });
// Maskable: full-bleed, content inside the central 80% safe zone.
const maskable = svg({ rx: 0, scale: 0.8, ring: true });
// iOS rounds the corners itself.
const full = svg({ rx: 0, scale: 1, ring: true });

const png = (s: string, px: number, f: string) =>
  sharp(Buffer.from(s), { density: 384 }).resize(px, px).png().toFile(pub(f));
await Promise.all([
  png(rounded, 192, "icon-192.png"),
  png(rounded, 512, "icon-512.png"),
  png(maskable, 512, "icon-maskable-512.png"),
  png(full, 180, "apple-touch-icon.png"),
]);
console.log("icons written to public/");
