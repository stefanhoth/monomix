---
status: accepted
---

# Letters support both cases via a per-monogram toggle, not per-Design curation

Issue #62: CONTEXT.md restricted Letters to "A–Z (input is uppercased)" — a v1 simplification, not a font limitation. The open questions were whether every catalog font actually has usable lowercase glyphs (they didn't: every shipped `font.ttf` was subset to `A-Z` + space only, per `docs/FONTS.md`), whether case is a per-monogram or per-letter setting, and how it interacts with the Shape warp and existing snapshot tests.

Decision: case is a **per-monogram toggle** — "ABC" (default, unchanged behavior: every letter uppercased) or "Abc" (preserve each letter's case exactly as typed) — applied uniformly across the whole catalog, not curated per font/Design.

This is the same call already made for the Shape catalog (docs/DECISIONS.md, 2026-07-14: "every font gets a Circle Design ... not a hand-curated subset") and for the "Per-design glyph sets" backlog entry's rejection reasoning cuts the other way here: that entry worried about fonts whose glyph coverage is _inconsistent_ with the rest of the catalog (some carry umlauts/digits, most don't) making the gallery feel arbitrary. Lowercase Latin letters are not that — every Latin font family ships a full lowercase alphabet as a basic, universal feature, so there is no coverage gap to curate around. The whole catalog was re-subset in one pass (`scripts/subset-font.mjs`'s `TEXT` constant extended to `A-Za-z `) rather than gating the toggle behind a per-font allowlist.

Re-sourcing: the original hand-fetched-from-google/fonts source TTFs were never kept in the repo (`docs/FONTS.md`'s "Adding a font" recipe treats them as a scratch input, not a build artifact), so regenerating 23 fonts needed a new source. `@fontsource/<slug>` npm packages ship the same upstream google/fonts OFL/Apache files, unsubset, as `files/<slug>-latin-400-normal.woff2` — `subset-font` (already a dependency) reads woff2 directly, and npm package names are a far more reliable, scriptable way to fetch 23 specific font files in one pass than guessing raw `google/fonts` repo paths (variable-font filenames in that repo are inconsistent: bracketed axis tags, per-family capitalization, etc.). One font (UnifrakturCook) only ships a 700-weight file on Fontsource even though Google Fonts calls it "Regular" — same "one weight, no bolding" situation the hand-picked source was already in, so the fallback in the regeneration script accepts any latin normal-style weight rather than requiring exactly 400.

`sanitizeLettersInput` (`src/lib/letters-input.ts`) gains a `caseMode: "upper" | "preserve"` parameter, defaulting to `"upper"` — every existing call site (`OnboardingPrompt.svelte`, and any test not passed a second argument) is unaffected. `ProjectSettings` gains a matching `letterCase` field, defaulting to `"upper"`, normalized defensively like every other field in `normalizeProject`. The toggle only changes how _future_ keystrokes are sanitized — flipping it does not retroactively recover case information a prior "ABC" keystroke already discarded.

The Shape warp and layout stage (`src/engine/shape.ts`, `layout.ts`) needed no changes: both operate on whatever glyph outlines `font.charToGlyph` returns for a given character, with no assumption about case built in — the "A-Z only" restriction only ever lived at the UI input boundary, not in the engine.

## Consequences

- Every one of the 23 catalog `font.ttf` files was regenerated (still `A-Z`/`a-z`/space only, not full Unicode) — larger by roughly the size of a lowercase alphabet each, still well within Design Principle 2's fast-load budget (the catalog stays well under 1 MB total).
- `docs/FONTS.md`'s "Adding a font" recipe now recommends `@fontsource` as the primary source for new catalog fonts, alongside the still-valid raw google/fonts TTF route.
- No font was excluded or flagged for follow-up curation: a visual spot-check across serif, script, slab, blackletter, and decorative styles (including through the circle/diamond Shape warp) showed every family's lowercase forms render as cleanly as its uppercase forms already did. If a specific font's lowercase later turns out to read poorly in some Design, that is font-specific curation to log in `docs/DECISIONS.md`, not a reason to revisit this ADR's "no per-Design gating" call.
- Deliberately not built: an outline/stroke or any other legibility aid tied to case — case has no bearing on fill/stroke, unlike issue #65's letter-opacity work.
