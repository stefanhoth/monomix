#!/usr/bin/env -S npx tsx
/**
 * One-off generator: renders real monograms via the actual engine
 * (composeMonogram) for the /about marketing page, so the landing page
 * shows genuine product output instead of fabricated screenshots. Each
 * sample also carries a real Frame and real letter/frame colors — the
 * page exists to market exactly those two customization axes, so the
 * examples need to show them, not just the Shape warp in plain ink.
 *
 * Run with `npx tsx scripts/generate-about-monograms.ts` — writes
 * .tmp-about-monograms.json, which scripts/reinject-about-monograms.mjs
 * then splices into about.html in place of the 5 existing <svg> tiles.
 * about.html itself has no build-time dependency on either script;
 * re-run both only if the sample designs below change.
 *
 * Only imports render.ts's own dependency tree (layout/shape/fit/frames/
 * color/svg-path) — NOT designs.ts or fonts.ts, which pull in
 * `import.meta.glob` and only resolve under Vite.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { composeMonogram } from "../src/engine/render.ts";
import type { Shape } from "../src/engine/shape.ts";
import type { Arrangement } from "../src/engine/layout.ts";
import type { FrameShapeKind } from "../src/engine/frames.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.join(__dirname, "../src/assets/fonts");

interface Sample {
  key: string;
  letters: string;
  fontId: string;
  shape?: Shape;
  arrangement?: Arrangement;
  lettersColor: string;
  frameId: FrameShapeKind;
  frameColor: string;
}

// Real curated Designs (src/engine/designs.ts) — one entry per sample tile
// on the /about bento grid. Every sample carries a real Frame (the Frame
// catalog's `id` matches its `shape` 1:1 — src/engine/frames.ts) and a real
// color pair, since Frames + colors are core, marketable features.
const SAMPLES: Sample[] = [
  {
    key: "MX",
    letters: "MX",
    fontId: "playfair-display",
    shape: "circle",
    lettersColor: "#1c2b3a",
    frameId: "circle",
    frameColor: "#c99a2e",
  },
  {
    key: "AB",
    letters: "AB",
    fontId: "archivo-black",
    shape: "diamond",
    lettersColor: "#b5171f",
    frameId: "diamond",
    frameColor: "#1c1c1e",
  },
  {
    key: "JS",
    letters: "JS",
    fontId: "kelly-slab",
    shape: "circle",
    lettersColor: "#123a5c",
    frameId: "dotted-circle",
    frameColor: "#e08e45",
  },
  {
    key: "R",
    letters: "R",
    fontId: "alex-brush",
    shape: "diamond",
    lettersColor: "#7a2048",
    frameId: "dashed-circle",
    frameColor: "#c9a66b",
  },
  {
    key: "KV",
    letters: "KV",
    fontId: "unifraktur-cook",
    shape: "diamond-wide",
    lettersColor: "#141414",
    frameId: "square",
    frameColor: "#2f5233",
  },
];

async function loadFont(fontId: string) {
  const buf = await fs.readFile(path.join(FONTS_DIR, fontId, "font.ttf"));
  const arrayBuffer = buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  );
  return opentype.parse(arrayBuffer as ArrayBuffer);
}

const out: Record<string, string> = {};
for (const sample of SAMPLES) {
  const font = await loadFont(sample.fontId);
  out[sample.key] = composeMonogram(sample.letters, font, {
    shape: sample.shape,
    arrangement: sample.arrangement,
    lettersColor: sample.lettersColor,
    frame: { id: sample.frameId, color: sample.frameColor },
  });
}

const outPath = path.join(__dirname, "../.tmp-about-monograms.json");
await fs.writeFile(outPath, JSON.stringify(out));
console.log(`Wrote ${Object.keys(out).length} monograms to ${outPath}`);
