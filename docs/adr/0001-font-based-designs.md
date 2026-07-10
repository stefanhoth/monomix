---
status: superseded by ADR-0006
---

# Designs are backed by monogram fonts, converted to paths client-side

Designs (the letterform styles) are implemented with freely licensed monogram fonts (SIL OFL or similar), not hand-built SVG templates or plain text rendering. Glyphs are converted to SVG paths client-side via opentype.js, so exports (SVG/PNG/PDF/…) are self-contained and never depend on fonts installed on the viewer's machine.

## Considered Options

- **Monogram fonts + path conversion (chosen)** — professional letterforms, 10+ designs achievable, low per-design effort; constrained by the supply of freely licensed monogram fonts.
- **Hand-built SVG templates per design** — rejected: per-letter parametrisation across 26³ combinations effectively re-invents a font at much higher cost.
- **Plain text rendering with transforms** — rejected as the primary approach: results look like "letters next to each other", not a monogram. May still be used to algorithmically derive circle/diamond variants from regular OFL fonts where no free monogram font exists.
