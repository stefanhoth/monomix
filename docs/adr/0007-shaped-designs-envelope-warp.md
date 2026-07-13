---
status: accepted
---

# Designs gain a Shape: letters are envelope-warped into an outer silhouette

The v1 catalog (font × horizontal/stacked) reads as "letters next to each other," not as monograms — exactly the failure mode ADR 0001 predicted for plain text rendering. Reference monogram makers get their character from templates whose letters are _pressed into_ an outer silhouette (circle, diamond, shield, …); almost none of their designs are plain horizontal rows.

Decision: a Design becomes a curated template fixing **font × Arrangement × Shape**. The engine gains a new pure stage between layout and rendering: glyph path commands are adaptively subdivided and each point mapped through the Shape's envelope function (letter-block bounding box → target silhouette), so exports stay clean vector SVG. First Shape catalog: **circle + diamond**; every further Shape is one new mapping function plus font curation.

Alongside this, Frames decouple from letter sizing the way the reference products work: a Frame sits at a **fixed canvas position**, and the lettering is **scaled to fit inside it** — Frame Gap becomes the inner breathing room (0 = lettering fills the Frame) instead of the canvas-edge margin it was in v1. This kills the "letters overflow the frame" bug class at the root, for shaped and unshaped Designs alike.

## Consequences

- The warp stage is real path geometry (curve subdivision, per-shape envelope mapping) — a step up in engine complexity that everything downstream (gallery tiles, exports, future Shapes) will build on; hard to back out once the catalog depends on it.
- The pre-launch catalog is re-curated around shaped templates; underwhelming font × horizontal/stacked entries are culled. We are pre-launch, so stored Projects referencing culled Design ids are not migrated (the app must fall back gracefully, not crash).
- Frame Gap changes meaning (inner spacing, letters scale) and its DE label becomes "Abstand"; the old canvas-edge margin is a fixed constant, not user-controllable.
- Not touched: "path morphing between designs" (animated interpolation in the preview) stays rejected per docs/BACKLOG.md — the Shape warp is a static deformation, unrelated to transitions.
- Deliberately excluded from this decision: interlocked/overlapping glyphs, shield and further Shapes, filled/motif Frames (see BACKLOG.md).
