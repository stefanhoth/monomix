#!/usr/bin/env -S npx tsx
/**
 * Renders the /about page's example monograms with the real engine
 * (`composeMonogram`) and writes them into about.html, between its
 * `<!-- monogram:KEY -->` … `<!-- /monogram:KEY -->` marker pairs. Real
 * product output rather than mock-ups, so every example is something the
 * editor can actually produce — and exports.
 *
 *   npx tsx scripts/generate-about-monograms.ts && npx prettier --write about.html
 *
 * Idempotent: re-running replaces whatever sits between the markers. Run it
 * only when the samples below change — about.html ships with the SVG already
 * inlined and has no build-time dependency on this script.
 *
 * Imports render.ts's own dependency tree only (layout/shape/fit/frames/
 * paint/background/color/svg-path) — NOT designs.ts or fonts.ts, whose
 * `import.meta.glob` only resolves under Vite.
 *
 * The "picture" is a landscape painted here from layered ridgelines and
 * rasterised with sharp, so the page carries no third-party photo and no
 * licence to track. It stands in for whatever image a visitor uploads.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";
import { composeMonogram, type ComposeOptions } from "../src/engine/render.ts";
import type { Gradient } from "../src/engine/paint.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FONTS_DIR = path.join(ROOT, "src/assets/fonts");
const HTML_PATH = path.join(ROOT, "about.html");

function linear(angle: number, ...stops: [string, number][]): Gradient {
  return {
    style: "linear",
    angle,
    stops: stops.map(([color, offset]) => ({ color, offset })),
  };
}
function radial(...stops: [string, number][]): Gradient {
  return {
    style: "radial",
    angle: 0,
    stops: stops.map(([color, offset]) => ({ color, offset })),
  };
}

/** A dusk landscape: sky wash, sun glow, five hazy ridgelines, film grain. */
async function paintLandscape(): Promise<string> {
  const SIZE = 720;
  const ridge = (
    base: number,
    amp: number,
    seed: number,
    fill: string,
  ): string => {
    const pts: string[] = [];
    for (let x = 0; x <= SIZE; x += 6) {
      const y =
        base +
        amp *
          (Math.sin(x / 90 + seed) * 0.55 +
            Math.sin(x / 41 + seed * 2.3) * 0.3 +
            Math.sin(x / 17 + seed * 5.1) * 0.15);
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return `<polygon points="0,${SIZE} ${pts.join(" ")} ${SIZE},${SIZE}" fill="${fill}"/>`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1b1646"/>
      <stop offset="0.42" stop-color="#6a2c7a"/>
      <stop offset="0.68" stop-color="#e2587a"/>
      <stop offset="0.86" stop-color="#ffa86b"/>
      <stop offset="1" stop-color="#ffd9a0"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.62" cy="0.64" r="0.34">
      <stop offset="0" stop-color="#fff4cf" stop-opacity="0.95"/>
      <stop offset="0.35" stop-color="#ffc58a" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ff8e6e" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb98a" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffb98a" stop-opacity="0"/>
    </linearGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
      <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.16 0"/>
    </filter>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#sky)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#sun)"/>
  ${ridge(470, 46, 1.2, "#a8506f")}
  <rect y="430" width="${SIZE}" height="160" fill="url(#haze)"/>
  ${ridge(520, 52, 3.4, "#7a3a68")}
  ${ridge(575, 44, 5.8, "#512a5c")}
  ${ridge(630, 36, 8.1, "#311f49")}
  ${ridge(685, 28, 2.2, "#1a1233")}
  <rect width="${SIZE}" height="${SIZE}" filter="url(#grain)"/>
</svg>`;
  const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 74 }).toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

interface Sample {
  key: string;
  letters: string;
  fontId: string;
  options: ComposeOptions;
}

const GOLD = linear(135, ["#f9e9a0", 0], ["#c9971c", 100]);
const photo = await paintLandscape();

// Real curated Designs (src/engine/designs.ts), each set up to show off one
// thing the editor can do. Colors are tuned per tile so the grid reads as a
// palette, not a row of black-on-beige.
const SAMPLES: Sample[] = [
  {
    // Gradients on letters, Frame and background at once.
    key: "A",
    letters: "MX",
    fontId: "playfair-display",
    options: {
      shape: "circle",
      lettersColor: linear(180, ["#fff6d6", 0], ["#e9c15b", 100]),
      frame: { id: "diamond", color: GOLD, strokeWidth: 14, gap: 4 },
      background: {
        kind: "gradient",
        gradient: radial(["#2f4a94", 0], ["#0b1030", 100]),
      },
    },
  },
  {
    // Stencil: a filled Frame with fully see-through letters — the
    // background wash shows through the letterforms themselves.
    key: "B",
    letters: "SK",
    fontId: "archivo-black",
    options: {
      shape: "circle",
      lettersOpacity: 0,
      frame: { id: "circle", color: "#1a1840", fill: "#1a1840" },
      background: {
        kind: "gradient",
        gradient: linear(
          135,
          ["#ffb347", 0],
          ["#ff3d6e", 55],
          ["#7b2ff7", 100],
        ),
      },
    },
  },
  {
    // Case preserved: "Jo", not "JO".
    key: "C",
    letters: "Jo",
    fontId: "alex-brush",
    options: {
      shape: "circle",
      lettersColor: "#7a1f2b",
      frame: { id: "dotted-circle", color: "#b5533c" },
      background: "#fbeee9",
    },
  },
  {
    key: "D",
    letters: "KP",
    fontId: "kelly-slab",
    options: {
      shape: "diamond",
      lettersColor: "#12332a",
      frame: {
        id: "diamond",
        color: linear(135, ["#2fa37f", 0], ["#14604a", 100]),
        strokeWidth: 14,
        gap: 6,
      },
      background: "#f4eddc",
    },
  },
  {
    key: "E",
    letters: "TW",
    fontId: "pirata-one",
    options: {
      shape: "circle",
      lettersColor: "#eaf4fb",
      frame: { id: "dashed-circle", color: "#9fd0ee" },
      background: {
        kind: "gradient",
        gradient: radial(["#2a7fb0", 0], ["#093252", 100]),
      },
    },
  },
  {
    // A picture behind everything, zoomed and nudged; letters go slightly
    // see-through so the landscape glows through them.
    key: "F",
    letters: "EH",
    fontId: "cinzel-decorative",
    options: {
      shape: "circle",
      lettersColor: "#fffaf0",
      lettersOpacity: 0.88,
      frame: { id: "circle", color: "#fffaf0", strokeWidth: 10 },
      background: {
        kind: "image",
        dataUrl: photo,
        transform: { zoom: 1.25, offsetX: 0.35, offsetY: 0.2 },
      },
    },
  },
];

async function loadFont(fontId: string) {
  const buf = await fs.readFile(path.join(FONTS_DIR, fontId, "font.ttf"));
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

let html = await fs.readFile(HTML_PATH, "utf8");
for (const sample of SAMPLES) {
  const svg = composeMonogram(
    sample.letters,
    await loadFont(sample.fontId),
    sample.options,
  ).replace("<svg ", `<svg id="mono-${sample.key}" `);
  const marker = new RegExp(
    `(<!-- monogram:${sample.key} -->)[\\s\\S]*?(<!-- /monogram:${sample.key} -->)`,
  );
  if (!marker.test(html)) {
    throw new Error(`No monogram:${sample.key} marker pair in about.html`);
  }
  html = html.replace(marker, (_, open, close) => `${open}${svg}${close}`);
}
await fs.writeFile(HTML_PATH, html);
console.log(`Wrote ${SAMPLES.length} monograms into about.html`);
