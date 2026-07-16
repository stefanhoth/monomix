#!/usr/bin/env node
/**
 * Replaces the 5 existing <svg>...</svg> monogram tiles in about.html, in
 * document order, with freshly generated ones from
 * generate-about-monograms.ts's JSON output. Use this (instead of
 * inject-about-monograms.mjs, which targets empty placeholders) when
 * regenerating samples for a page that already has SVGs inlined.
 *
 * Usage:
 *   npx tsx scripts/generate-about-monograms.ts
 *   node scripts/reinject-about-monograms.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, "../.tmp-about-monograms.json");
const htmlPath = path.join(__dirname, "../about.html");

const monograms = JSON.parse(await fs.readFile(jsonPath, "utf8"));
const replacements = Object.values(monograms);
let html = await fs.readFile(htmlPath, "utf8");

const svgPattern =
  /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1000 1000">[\s\S]*?<\/svg>/g;
const matches = html.match(svgPattern) ?? [];
if (matches.length !== replacements.length) {
  console.error(
    `Found ${matches.length} <svg> tiles in about.html but have ${replacements.length} generated monograms — refusing to guess the mapping.`,
  );
  process.exit(1);
}

let i = 0;
html = html.replace(svgPattern, () => replacements[i++]);

await fs.writeFile(htmlPath, html);
await fs.unlink(jsonPath);
console.log(`Replaced ${replacements.length} monograms in about.html`);
