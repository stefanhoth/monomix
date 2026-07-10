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
