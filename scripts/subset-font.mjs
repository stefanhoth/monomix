#!/usr/bin/env node
/**
 * Subsets a font down to the glyphs MonoMix actually needs (A-Z + space —
 * see ADR: Letters are restricted to uppercase A-Z) and writes the result
 * next to the source as font.ttf.
 *
 * Usage: node scripts/subset-font.mjs <path-to-source-font> <output-dir>
 *
 * Source fonts are fetched from https://github.com/google/fonts (each
 * family's ofl/ or apache/ folder carries the canonical license file —
 * copy it into <output-dir> alongside font.ttf).
 */
import subsetFont from "subset-font";
import fs from "node:fs/promises";
import path from "node:path";

const TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ";

const [, , srcPath, outDir] = process.argv;
if (!srcPath || !outDir) {
  console.error(
    "Usage: node scripts/subset-font.mjs <source-font> <output-dir>",
  );
  process.exit(1);
}

const buf = await fs.readFile(srcPath);
const subset = await subsetFont(buf, TEXT, { targetFormat: "truetype" });

await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "font.ttf");
await fs.writeFile(outPath, subset);

console.log(
  `${path.basename(srcPath)}: ${(buf.length / 1024).toFixed(1)} KB -> ${outPath} (${(subset.length / 1024).toFixed(1)} KB)`,
);
