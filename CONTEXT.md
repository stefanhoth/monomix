# MonoMix

MonoMix (always spelled with two capital Ms) is a browser-local, PWA-ready monogram maker: the user types 1–3 letters, picks a design and colors, and exports the result as vector or raster files. No server; everything runs in the client.

## Language

**Monogram**:
The complete composed artwork: letters rendered in a Design, optionally surrounded by a Frame, with chosen colors.
_Avoid_: Logo, emblem

**Design**:
A curated, fixed combination of font, Arrangement, and Shape, algorithmically composing the letters (ADR 0006, ADR 0007) — there is no dedicated monogram font, so this triple is what gives each Design its character. A Design declares which Letter Counts it supports; it is not bound to exactly one.
_Avoid_: Style, template, model

**Arrangement**:
How a Design positions its letters relative to each other (e.g. horizontal, stacked). Distinct from Shape, which deforms the arranged result, and from Frame, which draws a decorative ring around it from the outside rather than arranging the letters themselves.

**Shape**:
The outer silhouette the arranged letters are pressed into (e.g. circle, diamond; "none" leaves them undeformed). Part of a Design, never chosen by the user on its own. Unlike a Frame, a Shape is not drawn — it exists only as the deformation of the letterforms themselves.
_Avoid_: Silhouette, envelope, morph, form

**Letter Count**:
How many letters the Monogram consists of: 1, 2, or 3. The design gallery is filtered by the current Letter Count.

**Letters**:
The 1–3 characters of the Monogram. Restricted to A–Z (input is uppercased); umlauts and other characters are rejected with a transliteration hint rather than silently replaced.

**Frame**:
A decorative border placed around the lettering, independent of the Design — any Frame combines with any Design. A Frame sits at a fixed position on the canvas and has its own color; the lettering is scaled to fit inside it (see Frame Gap).
_Avoid_: Border, ring

**Frame Gap**:
The breathing room between the lettering and the Frame. The Frame's position is fixed; a larger gap scales the lettering down inside it (0 = the lettering fills the Frame). UI label: "Frame Gap" (EN) / "Abstand" (DE).

**Project**:
One persisted Monogram configuration (letters, Design, Frame, colors, gap). The app lists recent Projects, and a new Project starts from the most recently used settings.
_Avoid_: Draft, document, file
