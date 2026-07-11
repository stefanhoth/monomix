# Backlog (deferred, not in v1)

## Scaffolding placeholders to replace

- **App icons/favicon** — `public/favicon.svg`, `icon-192.png`, `icon-512.png` are a plain "MX" placeholder generated for the initial scaffold, not real branding.

## Rejected (do not re-propose)

- **Path morphing between designs** — deliberately rejected, not deferred: letter-to-letter path interpolation reads as distracting mush, not magic. Preview transitions are crossfade + subtle scale (~200 ms).

## Deferred

- **DXF + EPS export** (v1.1) — needs real-world validation in CAD/laser software (bezier → spline/polyline conversion).
- **Advanced Frames** — motif frames (wreaths, anchors, flags, …); asset sourcing and licensing project.
- **Per-letter colors** — each letter individually colorable; technically cheap since every letter is its own path.
- **sveltebits UI kit** — evaluate https://sveltebits.xyz for UI components (see ADR 0002).
- **Per-design glyph sets** — designs whose fonts carry umlauts/digits could allow more than A–Z (rejected for v1 to keep the gallery consistent).
- **Custom domain** — attach monomix.stefanhoth.com to the production Worker (hosting is Cloudflare Workers from day 1, see ADR 0004).
- **Non-Latin scripts research** — monogram-style fonts likely exist for Devanagari, CJK, Arabic on non-Western platforms; investigate sources and licensing.
- **Cloudflare API token rotation** — the `CLOUDFLARE_API_TOKEN` repo secret expires 2027-01-01; rotate before then or CI deploys will start failing.
- **Genuinely distinct composition styles** (circle-arranged letters, diamond, interlocked/overlapping glyphs) — v1's Design catalog (#6) only varies font × Arrangement (horizontal/stacked); true circular or interlocking letter composition needs real path geometry (arranging glyphs along an arc, boolean overlap handling) beyond simple positioning and is a bigger effort than the letter-count-agnostic engine currently does.
- **Shield Frame shape** — mentioned as an example in issue #7's context, but a proper heraldic-shield silhouette needs actual visual/path design iteration rather than a quick parametric approximation; v1's Frame catalog ships circle/square/diamond/dotted-circle/dashed-circle instead.
- **Frame-aware letter sizing** — v1 Frames (#7) are positioned independently of the letters' actual rendered bounding box (a deliberate scope decision), so letters aren't shrunk to leave room for an active Frame and may visually overlap it at default settings. Revisit if that turns out to look wrong in practice once the editor UI (#12) renders Design + Frame together.
