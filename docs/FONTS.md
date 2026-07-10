# Font catalog

Backs the algorithmic Designs (ADR 0006). All 17 fonts are sourced from [google/fonts](https://github.com/google/fonts) — every family there ships its license file (`OFL.txt` or `LICENSE.txt`) alongside the font, satisfying ADR 0003 (SIL OFL / CC0 / Apache-2.0 only).

Each font is subset at acquisition time to exactly what MonoMix uses — uppercase `A-Z` plus space (Letters are restricted to A-Z; see CONTEXT.md) — via [`scripts/subset-font.mjs`](../scripts/subset-font.mjs) (`subset-font`, a WASM build of harfbuzz's `hb-subset`). This cut the catalog from ~2.9 MB to ~230 KB, which matters directly for Design Principle 2 (fast first result) and the PWA's full-offline precache.

Registered in [`src/engine/fonts.ts`](../src/engine/fonts.ts).

| id                    | Family             | Style          | License    |
| --------------------- | ------------------ | -------------- | ---------- |
| `cinzel`              | Cinzel             | serif          | OFL-1.1    |
| `cinzel-decorative`   | Cinzel Decorative  | serif          | OFL-1.1    |
| `playfair-display`    | Playfair Display   | serif          | OFL-1.1    |
| `cormorant-garamond`  | Cormorant Garamond | serif          | OFL-1.1    |
| `abril-fatface`       | Abril Fatface      | serif          | OFL-1.1    |
| `archivo-black`       | Archivo Black      | geometric-sans | OFL-1.1    |
| `league-spartan`      | League Spartan     | geometric-sans | OFL-1.1    |
| `poppins`             | Poppins            | geometric-sans | OFL-1.1    |
| `bebas-neue`          | Bebas Neue         | geometric-sans | OFL-1.1    |
| `alfa-slab-one`       | Alfa Slab One      | slab           | OFL-1.1    |
| `roboto-slab`         | Roboto Slab        | slab           | Apache-2.0 |
| `kelly-slab`          | Kelly Slab         | slab           | OFL-1.1    |
| `unifraktur-maguntia` | UnifrakturMaguntia | blackletter    | OFL-1.1    |
| `unifraktur-cook`     | UnifrakturCook     | blackletter    | OFL-1.1    |
| `pinyon-script`       | Pinyon Script      | script         | OFL-1.1    |
| `alex-brush`          | Alex Brush         | script         | OFL-1.1    |
| `tangerine`           | Tangerine          | script         | OFL-1.1    |

## Adding a font

1. Confirm the license in [google/fonts](https://github.com/google/fonts) (`ofl/<family>/OFL.txt` or `apache/<family>/LICENSE.txt`) qualifies per ADR 0003.
2. Download the source `.ttf` and its license file.
3. `node scripts/subset-font.mjs <source.ttf> src/assets/fonts/<id>/`
4. Copy the license file into `src/assets/fonts/<id>/`.
5. Add an entry to the `CATALOG` array in `src/engine/fonts.ts` and to the table above.

## Known simplification

Several families (`cinzel`, `playfair-display`, `cormorant-garamond`, `league-spartan`, `roboto-slab`) ship as variable fonts; we use whatever the default named instance resolves to rather than instancing a specific weight. Picking a deliberate weight per Design (e.g. baking a Bold static instance with `fonttools varLib.instancer`) is a possible future refinement, not a v1 blocker.
