---
status: accepted
supersedes: ADR-0001
---

# Designs are algorithmically composed from regular OFL fonts, not dedicated monogram fonts

Font research (July 2026) found that true monogram fonts with dedicated left/middle/right interlocking glyphs essentially do not exist under a license compatible with our constraints (ADR 0003: SIL OFL / CC0 / Apache, because we redistribute the font and users may export commercially). The entire "circle monogram" font market (Etsy, Creative Fabrica, dafont) is commercial or personal-use-only; the one candidate tagged OFL by font aggregators (ABC-Circle-Monogram) is unverified and sold commercially by its designer elsewhere — rejected as a source.

Decision: every Design is produced by **algorithmic composition** — our own layout/clipping logic (scaling, positioning, and shaping letters into circle/diamond/shield/etc. frames) applied to ordinary OFL display fonts (serif, slab, geometric sans, blackletter, script). This is not a fallback for gaps as ADR 0001 framed it — it is the only mechanism, and it is now the core of the rendering engine rather than a secondary path.

Starting font catalog (all Google Fonts, OFL 1.1), spanning styles to seed 10+ Designs: Cinzel, Cinzel Decorative, Playfair Display, Cormorant Garamond, Abril Fatface, Archivo Black, League Spartan, Poppins, Bebas Neue, Alfa Slab One, Roboto Slab, Kelly Slab, UnifrakturMaguntia, UnifrakturCook, Pinyon Script, Alex Brush, Tangerine.

Consequence: opentype.js glyph→path conversion (from ADR 0001) still stands — only the "which fonts back a Design" premise changes.
