# MonoMix

MonoMix (always spelled with two capital Ms) is a browser-local, PWA-ready monogram maker: the user types 1–3 letters, picks a design and colors, and exports the result as vector or raster files. No server; everything runs in the client.

## Language

**Monogram**:
The complete composed artwork: letters rendered in a Design, optionally surrounded by a Frame, with chosen colors.
_Avoid_: Logo, emblem

**Design**:
The letterform style that shapes the letters themselves (e.g. circle, vine, diamond). Backed by a monogram font. A Design declares which Letter Counts it supports; it is not bound to exactly one.
_Avoid_: Style, template, model

**Letter Count**:
How many letters the Monogram consists of: 1, 2, or 3. The design gallery is filtered by the current Letter Count.

**Letters**:
The 1–3 characters of the Monogram. Restricted to A–Z (input is uppercased); umlauts and other characters are rejected with a transliteration hint rather than silently replaced.

**Frame**:
A decorative border placed around the lettering, independent of the Design. Has its own color and a configurable gap to the letters.
_Avoid_: Border, ring

**Frame Gap**:
The spacing between the lettering and the surrounding Frame.

**Project**:
One persisted Monogram configuration (letters, Design, Frame, colors, gap). The app lists recent Projects, and a new Project starts from the most recently used settings.
_Avoid_: Draft, document, file
