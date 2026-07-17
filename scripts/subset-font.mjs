#!/usr/bin/env node
/**
 * Subsets a font down to the glyphs MonoMix actually needs (A-Z, a-z, and
 * space — see ADR 0008: letters support both cases) and writes the result
 * next to the source as font.ttf.
 *
 * Usage: node scripts/subset-font.mjs <path-to-source-font> <output-dir>
 *
 * Source fonts: the easiest reliable source is the matching `@fontsource/*`
 * npm package's `files/*-latin-400-normal.woff2` (a full, unsubset static
 * instance of the same google/fonts OFL/Apache family) — `subset-font`
 * accepts woff2 input directly. `docs/FONTS.md` has the full recipe. The
 * upstream google/fonts `ofl/`/`apache/` folder is an equally valid raw-TTF
 * source if you have it already; either way, copy the license file into
 * <output-dir> alongside font.ttf.
 */
import subsetFont from "subset-font";
import fs from "node:fs/promises";
import path from "node:path";

const TEXT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ";

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
