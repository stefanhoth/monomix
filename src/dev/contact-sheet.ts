import { composeMonogram, FONTS } from "../engine";
import { loadFont } from "../lib/font-loader";
import type { Shape } from "../engine/shape";
import type { LetterCount } from "../engine";

/**
 * Dev-only curation tool for issue #39: renders every font × {circle,
 * diamond} × Letter Count candidate so the catalog can be re-curated around
 * shaped templates. Reachable only via `npm run dev` -> /contact-sheet.html;
 * this entry point is never linked from index.html and isn't part of any
 * `rollupOptions.input`, so `vite build` never bundles it into dist/ — it
 * ships to nobody.
 */

const SHAPES: Shape[] = ["circle", "diamond"];
const LETTER_COUNTS: LetterCount[] = [1, 2, 3];
const SAMPLE_LETTERS: Record<LetterCount, string> = {
  1: "M",
  2: "MX",
  3: "ABC",
};

const app = document.getElementById("app");
if (!app) throw new Error("Missing #app root element");

app.innerHTML = `
  <h1>MonoMix design contact sheet (dev only)</h1>
  <p>Every font × {circle, diamond} × Letter Count candidate, for curation review (issue #39). Not shipped to users.</p>
`;

for (const font of FONTS) {
  const section = document.createElement("section");
  section.innerHTML = `<h2>${font.family} <span class="meta">(${font.style}, ${font.id})</span></h2>`;
  const row = document.createElement("div");
  row.className = "row";
  section.appendChild(row);
  app.appendChild(section);

  loadFont(font.url).then((loaded) => {
    for (const shape of SHAPES) {
      for (const count of LETTER_COUNTS) {
        const letters = SAMPLE_LETTERS[count];
        const svg = composeMonogram(letters, loaded, {
          arrangement: "horizontal",
          shape,
        });
        const tile = document.createElement("div");
        tile.className = "tile";
        tile.innerHTML = `${svg}<span class="label">${shape} · ${count}</span>`;
        row.appendChild(tile);
      }
    }
  });
}

const style = document.createElement("style");
style.textContent = `
  body { font-family: system-ui, sans-serif; margin: 1.5rem; }
  .meta { font-weight: normal; color: #666; font-size: 0.8em; }
  .row { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 1.5rem; }
  .tile { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; width: 7rem; }
  .tile svg { width: 100%; aspect-ratio: 1; border: 1px solid #ddd; }
  .label { font-size: 0.7rem; color: #555; }
`;
document.head.appendChild(style);
