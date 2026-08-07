# Backlog (deferred, not in v1)

## Scaffolding placeholders to replace

- **App icons/favicon** — `public/favicon.svg`, `icon-192.png`, `icon-512.png` are a plain "MX" placeholder generated for the initial scaffold, not real branding.

## Rejected (do not re-propose)

- **Path morphing between designs** — deliberately rejected, not deferred: letter-to-letter path interpolation reads as distracting mush, not magic. Preview transitions are crossfade + subtle scale (~200 ms).

## Deferred

- **Gradient-accurate gallery tiles** — Design/Frame tiles paint letters/Frames with one representative solid instead of the real gradient (#122), because a duplicated content-hashed `<defs id>` inside a `display:none` panel breaks the _visible_ preview's paint (measured; see docs/DECISIONS.md 2026-08-07). Making tiles WYSIWYG needs per-render-unique ids, which would break the engine's pure-function/deterministic-output contract — or unmounting hidden panels, which would lose gallery scroll position. Revisit only if tiles get their own render isolation.
- **Bundle the per-target settings clumps** — `{kind, color, gradient}` for letters/Frame/background (#122) and `{zoom, offsetX, offsetY}` for the background image (#123) are both Data Clumps travelling through `ProjectSettings`, `normalizeProject`, `toProjectSettings`, `projectSettingsEqual`, the resolvers, and share-link. Both are flat on purpose (the `$state.snapshot()` rule, docs/DECISIONS.md 2026-07-17), so nesting them trades one hazard for another and changes the persisted shape — worth doing only with a real migration.
- **One `PaintSettings` bundle for the three fills** — `{kind, color, gradient}` now travels as three flat fields each for letters, Frame, and background (a Data Clump across `ProjectSettings`, `normalizeProject`, `toProjectSettings`, `projectSettingsEqual`, the resolvers, and share-link). Collapsing all three into a nested object would remove the repetition, but changes the persisted shape and would need a real migration — worth doing only alongside the next change that touches all three anyway.

- **DXF + EPS export** (v1.1) — needs real-world validation in CAD/laser software (bezier → spline/polyline conversion).
- **Advanced Frames** — motif frames (wreaths, anchors, flags, …); asset sourcing and licensing project.
- **Per-letter colors** — each letter individually colorable; technically cheap since every letter is its own path. _Cross-reference (#122):_ letters can now carry a **gradient** across the whole fill, which is a different axis — this entry remains open and unsubsumed (per-glyph _solid_ colors).
- **sveltebits UI kit** — evaluate https://sveltebits.xyz for UI components (see ADR 0002).
- **Per-design glyph sets** — designs whose fonts carry umlauts/digits could allow more than A–Z (rejected for v1 to keep the gallery consistent).
- **Custom domain** — attach monomix.stefanhoth.com to the production Worker (hosting is Cloudflare Workers from day 1, see ADR 0004).
- **Non-Latin scripts research** — monogram-style fonts likely exist for Devanagari, CJK, Arabic on non-Western platforms; investigate sources and licensing.
- **Cloudflare API token rotation** — the `CLOUDFLARE_API_TOKEN` repo secret expires 2027-01-01; rotate before then or CI deploys will start failing.
- **Interlocked/overlapping glyph composition** — letters that weave through each other (boolean overlap handling, per-glyph slicing) is a genuinely different mechanism than the Shape warp (ADR 0007) and stays deferred. (The circle/diamond half of the former "genuinely distinct composition styles" entry ships as Shaped Designs, ADR 0007.)
- **Shield shape** (as Frame _and_ as Design Shape) — mentioned as an example in issue #7's context, but a proper heraldic-shield silhouette needs actual visual/path design iteration rather than a quick parametric approximation; the first Shape catalog ships circle + diamond (ADR 0007), the Frame catalog circle/square/diamond/dotted-circle/dashed-circle.
- **More Shapes** (heart, oval, octagon, hexagon — see the reference galleries in ADR 0007) — each is "just" a new mapping function in the warp stage, but every one needs curation of which fonts survive it.
- **Shared Gallery/GalleryTile component** — `FrameGallery.svelte` and `DesignGallery.svelte` duplicate ~50 lines of tile markup/CSS; not worth extracting for two galleries that differ in content, but do it if a third gallery appears, to avoid Shotgun Surgery on shared tile styling. _Update (#48):_ `NewProjectSurface.svelte` is now a third tile grid, and the `composeMonogram` thumbnail-options block exists in four files — the extraction trigger is arguably met; next change touching shared tile styling should do it. _Update (#122):_ adding gradient fills meant editing the thumbnail options in all three grids again (Shotgun Surgery). Still deferred because that change was to _props_, not the shared tile styling this entry is about — but it is now the second consecutive feature to pay the tax.
- **Ship license texts with the app** — the second half of ADR 0003's promise ("License texts ship with the app; an about page credits every font"): the credits panel covers the crediting half, but the vendored `OFL.txt`/`LICENSE.txt` files are not part of the built bundle (the Vite glob only picks up `font.ttf`). Bundle them and link each from the credits panel.
- **Shared dialog wrapper** — with `FontCreditsPanel` there are now three near-identical dialogs (backdrop, Escape handling, header, ~50 lines of CSS copied from `WhatsNewPanel`); the extraction trigger is met. Combine with the focus-management fix below.
- **Dialog focus management** — `WhatsNewPanel`, `NewProjectSurface`, and `FontCreditsPanel` set `role="dialog" aria-modal="true"` but neither moves focus into the dialog nor traps it; keyboard users can tab into the obscured page behind. Fix all together (shared action or small dialog wrapper).
