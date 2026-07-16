# Font catalog

Backs the algorithmic Designs (ADR 0006). All 23 fonts are sourced from [google/fonts](https://github.com/google/fonts) — every family there ships its license file (`OFL.txt` or `LICENSE.txt`) alongside the font, satisfying ADR 0003 (SIL OFL / CC0 / Apache-2.0 only).

Each font is subset at acquisition time to exactly what MonoMix uses — `A-Z`, `a-z`, and space (Letters support both cases as of issue #62 / ADR 0008; see CONTEXT.md) — via [`scripts/subset-font.mjs`](../scripts/subset-font.mjs) (`subset-font`, a WASM build of harfbuzz's `hb-subset`). This keeps the catalog a small fraction of the ~2.9 MB the 23 full families would cost, which matters directly for Design Principle 2 (fast first result) and the PWA's full-offline precache.

Registered in [`src/engine/fonts.ts`](../src/engine/fonts.ts).

| id                     | Family               | Style          | License    |
| ---------------------- | -------------------- | -------------- | ---------- |
| `cinzel`               | Cinzel               | serif          | OFL-1.1    |
| `cinzel-decorative`    | Cinzel Decorative    | serif          | OFL-1.1    |
| `playfair-display`     | Playfair Display     | serif          | OFL-1.1    |
| `cormorant-garamond`   | Cormorant Garamond   | serif          | OFL-1.1    |
| `abril-fatface`        | Abril Fatface        | serif          | OFL-1.1    |
| `archivo-black`        | Archivo Black        | geometric-sans | OFL-1.1    |
| `league-spartan`       | League Spartan       | geometric-sans | OFL-1.1    |
| `poppins`              | Poppins              | geometric-sans | OFL-1.1    |
| `bebas-neue`           | Bebas Neue           | geometric-sans | OFL-1.1    |
| `alfa-slab-one`        | Alfa Slab One        | slab           | OFL-1.1    |
| `roboto-slab`          | Roboto Slab          | slab           | Apache-2.0 |
| `kelly-slab`           | Kelly Slab           | slab           | OFL-1.1    |
| `unifraktur-maguntia`  | UnifrakturMaguntia   | blackletter    | OFL-1.1    |
| `unifraktur-cook`      | UnifrakturCook       | blackletter    | OFL-1.1    |
| `pinyon-script`        | Pinyon Script        | script         | OFL-1.1    |
| `alex-brush`           | Alex Brush           | script         | OFL-1.1    |
| `tangerine`            | Tangerine            | script         | OFL-1.1    |
| `rye`                  | Rye                  | decorative     | OFL-1.1    |
| `elsie-swash-caps`     | Elsie Swash Caps     | decorative     | OFL-1.1    |
| `berkshire-swash`      | Berkshire Swash      | decorative     | OFL-1.1    |
| `monsieur-la-doulaise` | Monsieur La Doulaise | script         | OFL-1.1    |
| `fascinate-inline`     | Fascinate Inline     | decorative     | OFL-1.1    |
| `pirata-one`           | Pirata One           | blackletter    | OFL-1.1    |

## Adding a font

1. Confirm the license in [google/fonts](https://github.com/google/fonts) (`ofl/<family>/OFL.txt` or `apache/<family>/LICENSE.txt`) qualifies per ADR 0003.
2. Get a source file with the full character set (both cases): either the matching `@fontsource/<slug>` npm package's `files/<slug>-latin-400-normal.woff2` (`npm install @fontsource/<slug> --no-save` somewhere scratch, `subset-font` reads woff2 directly — this is what issue #62's catalog-wide regeneration used), or a raw `.ttf` from google/fonts directly.
3. `node scripts/subset-font.mjs <source> src/assets/fonts/<id>/`
4. Copy the license file into `src/assets/fonts/<id>/` (the `@fontsource` package's own `LICENSE` file is the same upstream text).
5. Add an entry to the `CATALOG` array in `src/engine/fonts.ts` and to the table above.

## Known simplification

Several families (`cinzel`, `playfair-display`, `cormorant-garamond`, `league-spartan`, `roboto-slab`) are variable fonts upstream; the catalog uses `@fontsource`'s static weight-400 instance rather than instancing a specific weight from the variable font directly (issue #62 regenerated the whole catalog this way, switching from the original hand-fetched variable-font sources to `@fontsource`'s pre-built static files — a more reliable, scriptable source for 23 fonts at once than guessing raw google/fonts paths). Picking a deliberate weight per Design (e.g. baking a Bold static instance with `fonttools varLib.instancer`) is a possible future refinement, not a v1 blocker.
