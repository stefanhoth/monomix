# Decisions

A lightweight log of smaller-but-made decisions — the calls that shape the code
or product but don't warrant a full [ADR](adr/).

- **When to use an ADR instead:** genuine architecture decisions (stack, hosting,
  the composition model, release strategy) go in [docs/adr/](adr/) with a
  `status:` frontmatter.
- **When to use [BACKLOG.md](BACKLOG.md) instead:** things we decided _not_ to
  build or explicitly rejected. This file logs _how_ we decided to do something.
- **Format:** newest first. One short entry per decision — the call, and a
  one-line why. Add the entry in the same PR that makes the decision.

## 2026-07-14

- **The re-curated catalog (issue #39) is a hand-picked list of 16 Designs, not
  a filtered cross-product of the font catalog.** `src/engine/designs.ts`
  previously built `DESIGNS` as every font × {classic, stacked, circle,
  diamond} (68 entries) — the approach #37's DECISIONS.md entry defended at
  the time ("every font gets a Circle Design ... not a hand-curated subset").
  Reviewing every font × {circle, diamond} × Letter Count combination on a new
  dev-only contact sheet (`contact-sheet.html`, reachable only via `npm run
dev`, never bundled by `vite build` since nothing references it) showed
  several fonts read as weak or muddy once pressed into a Shape — thin
  serif/script strokes (Cormorant Garamond, League Spartan, Tangerine, Pinyon
  Script) lose definition at circle/diamond scale, and near-duplicate style
  pairs (UnifrakturMaguntia next to UnifrakturCook, Roboto Slab next to Alfa
  Slab One) added redundancy without adding a distinct voice. The curated
  catalog keeps one font per distinct style voice — refined serif (Playfair
  Display), ornate serif (Cinzel Decorative), bold geometric sans (Archivo
  Black), bold slab (Alfa Slab One), rounded bold slab (Kelly Slab), script
  (Alex Brush), blackletter (UnifrakturCook) — each contributing both a circle
  and a diamond Design (14 total), plus 2 plain (unshaped) Designs from fonts
  not already used above (Poppins Classic, Cormorant Garamond Stacked) so a
  "letters as-is" look survives the cull without repeating a font under two
  entries — Cormorant Garamond's thin strokes are exactly what reads as
  elegant unshaped (a classic wedding-monogram look) and what goes muddy once
  pressed into a Shape, so it's excluded from `SHAPED` but kept in
  `UNSHAPED`, not a contradiction of the same weak-serif reasoning above.
  Kelly Slab moved from `UNSHAPED` into `SHAPED` after PR review (stefanhoth,
  PR #44): its rounded bold strokes read well pressed into the more aggressive
  Shapes too, distinct enough from Alfa Slab One's squared-off slab to earn
  its own pair rather than being redundant with it — the "Kelly Slab Classic"
  unshaped entry was dropped in the same change to keep one font from
  appearing under two different-looking entries. `DESIGNS` orders the shaped
  block first — the gallery leads with it, and `DESIGNS[0]` (Playfair Display
  Circle) is what `DEFAULT_PROJECT_SETTINGS.designId` resolves to, making a
  circle template the first-run default for free rather than needing a
  separate default rule. We are pre-launch, so no migration was written for
  stored Projects referencing a now-culled Design id — `resolveSelectedDesignId`
  (`src/lib/gallery.ts`) already falls back to the first available Design
  whenever the current selection isn't in the (now smaller) catalog, which is
  what makes the fallback graceful rather than a special case added for this
  issue; a new e2e test (`tests/e2e/persistence.spec.ts`) locks in that an
  unknown `designId` read back from IndexedDB doesn't crash the app. (Issue
  #39)
- **The circle Shape warp uses the Fernandez-Guasti "elliptical grid" square-to-disc
  mapping, not an arc-text (rotate-along-a-circle) effect.** Given a letter block's
  bounding box, `u²(1-v²/2) + v²(1-u²/2)` reduces to exactly 1 whenever `|u|=1` or
  `|v|=1` — i.e. the _entire_ boundary of the box (not just its corners) lands
  exactly on the target circle, which is what makes "the outer edges of the outer
  letters follow the circle" (issue #37 AC) a property of the formula rather than
  something tuned by hand. Letters stay upright and bow at their edges instead of
  rotating individually, which reads as a legitimate circle-monogram press across
  every font style tried (serif, bold sans, script, blackletter) rather than an
  arc-text effect. `src/engine/shape.ts`'s `warpPathCommands` applies it per-point
  after adaptively subdividing every path segment (including straight `L`s, which
  become curved once warped) — output is always flattened to `M`/`L`/`Z`, since a
  formerly-straight segment re-expressed as a bezier after a non-linear warp isn't
  meaningful. (Issue #37, ADR 0007)
- **The Shape warp's "fit to the canvas or Frame" step gets its own
  `fitCircleScale` (`src/engine/fit.ts`), not a reuse of `fitScale`.** An
  initial pass reused `fitScale(2r, 2r, extent, shape)` directly, on the
  reasoning that a warped block's bounding box is a square of half-extent
  `r` — but `fitScale` assumes a rectangular block whose _corners_ are its
  farthest points from center, and a warped-into-a-circle block's actual
  content is a disc, not a rectangle, so its corners are empty space, not
  ink. That mismatch silently under-fit the circle Shape inside a circle
  Frame to ~70.7% of the available space and inside a diamond Frame to 50%
  (caught in review, `docs/adr/0007`'s "combine with any Frame and it still
  fits perfectly" wasn't actually true). `fitCircleScale(radius, extent,
shape)` instead uses each norm's worst-case value over the Euclidean unit
  circle (1 for square/circle, `√2` for diamond) — the two functions do
  share `fit.ts`'s Frame-extent resolution (`frameFitExtent`, extracted from
  `fitLayoutToFrame` in the same pass so both callers derive the extent/norm
  from one place), just not the scale formula itself, since a disc and a
  rectangle are fit against a norm boundary differently. (Issue #37)
- **Every font in the catalog gets a "Circle" Design (horizontal arrangement
  only), not a hand-curated subset.** ADR 0007 anticipated curating which fonts
  "survive" a Shape; visually spot-checking one font per style category (serif,
  bold geometric sans, script, blackletter) in the running app showed the generic
  envelope map reads as a clean circle press in every case, with no self-
  intersections or broken counters — so shipping it broadly rather than picking a
  handful upfront avoided an arbitrary, unverifiable cut. "Stacked" arrangement
  doesn't get a Shape variant: a vertically stacked column pressed into a circle
  has no reference circle-monogram equivalent. (Issue #37)

## 2026-07-13

- **Frame fitting picks the geometric norm (Chebyshev/Euclidean/Manhattan)
  matching each Frame's Shape, rather than one fitting formula for all
  Frames.** A square's inner boundary is an L∞ ball, a circle's an L2 ball,
  a diamond's an L1 ball — fitting the letter block's bounding box against
  the wrong norm would either overflow the actual silhouette or waste
  usable space. `src/engine/fit.ts`'s `fitScale(blockWidth, blockHeight,
extent, shape)` picks the norm from `FrameShapeKind` and returns the exact
  scale that makes the block's corners just reach `extent`; `frameInnerExtent`
  (`src/engine/frames.ts`) derives that extent from the Frame's now-fixed
  outer position minus its stroke width. This makes "0 = lettering fills the
  Frame's inner boundary" a property of the formula, not a value tuned by
  trial and error, and is deliberately the same "scale a layout as a unit"
  shape the future Shape warp stage (ADR 0007) will build on. `fitLayoutToFrame`
  (which resolves a Frame id + Frame Gap into a fitted `Layout`) lives in
  `fit.ts` itself rather than `render.ts` — an initial pass had it in
  `render.ts`, reaching into both `frames.ts` and `fit.ts` to do work that's
  conceptually "given a frame and a gap, what's the scale," none of which is
  `render.ts`'s own data (caught in review); `render.ts` now only orchestrates
  the final SVG string. (Issue #36)
- **Frame Gap split into two distinct constants that happen to share a
  default value.** `FRAME_MARGIN` (`src/engine/frames.ts`) is the Frame's
  fixed, non-user-controlled distance from the canvas edge; `DEFAULT_GAP`
  is the Frame Gap slider's starting value. Pre-#36 these were the same
  concept (gap moved the Frame); keeping them as separate named constants,
  even though both are currently `40`, avoids silently coupling the Frame's
  position to a UI default again. The slider's `MAX_GAP`
  (`src/lib/frame-gap.ts`) is derived from `frameInnerExtent()` rather than
  picked independently, so it can't drift out of sync with the engine's own
  fitting geometry if `FRAME_MARGIN` or the stroke width ever changes.
  (Issue #36)
- **The DE/EN dictionary covers UI chrome plus Frame names, but not
  Design names.** `src/lib/i18n/dictionary.ts` has ~30 keys, within the
  issue's "~40-60 strings" mini-dictionary budget. Design names are
  generated from font family + variant label (e.g. "Cinzel Decorative
  Stacked") — font family names are proper nouns that don't get
  translated in any product, and partially translating just the variant
  half would read as broken, not bilingual. Frame names (Circle, Square,
  Diamond, …), by contrast, are plain common nouns that read to a user
  exactly like ordinary UI copy, with obvious unambiguous DE equivalents
  — an initial pass had lumped them in with Design names as "engine
  catalog data" and skipped translating them too, which undershot AC #1
  ("no hardcoded UI text"; caught in review). `FrameGallery.svelte` now
  maps `frame.id` to a dictionary key (`FRAME_NAME_KEYS`) rather than
  reading `frame.name` directly, so the pure `src/engine/frames.ts` stays
  untouched and English-only (it's not UI-facing on its own) while the
  UI layer renders the translated name. (Issue #15)
- **`sanitizeLettersInput`'s rejection hint is structured data
  (`LettersHint`), not a finished English string.** The old
  `hint: string | null` baked English text straight into a function meant
  to stay pure and translatable; it now returns
  `{ kind: "generic" }` or `{ kind: "suggestion", invalid, suggestion }`,
  and a separate pure `formatLettersHint(hint, locale)`
  (`src/lib/i18n/format-letters-hint.ts`) renders it for display. Keeps
  `letters-input.ts` decoupled from the dictionary while still making the
  hint fully translatable. (Issue #15)
- **Locale is a plain module-level `$state` singleton
  (`src/lib/i18n/store.svelte.ts`), not a Svelte context or prop drilled
  through the tree.** MonoMix is explicitly a single client-only screen
  (CLAUDE.md) with no routing/context tree to thread a store through, so
  every component just imports `getLocale`/`setLocale`/`t` directly — the
  same "no framework, keep it lightweight" call the issue itself asked
  for. Manual override persists via `localStorage` (`src/lib/i18n/storage.ts`),
  mirroring `onboarding.ts`'s guarded try/catch read/write pattern; default
  is the browser's `navigator.language`, resolved by the pure
  `resolveBrowserLocale` (`src/lib/i18n/locale.ts`). (Issue #15)

## 2026-07-11

- **Projects go behind a storage-adapter interface (`ProjectStore`), with a
  fake in-memory implementation used by unit tests.** `src/lib/project-store.ts`
  defines `list`/`get`/`put`/`delete`/`getLastEdited`; `project-store-memory.ts`
  is the fake, `project-store-indexeddb.ts` is production. Unit tests
  (autosave debounce, "new Project inherits settings") depend only on the
  interface, so they run in Vitest/jsdom without touching real IndexedDB.
  (Issue #14)
- **The IndexedDB adapter uses the `idb` package (MIT, Jake Archibald)
  instead of hand-rolled raw IndexedDB.** It's ~1.2 kB gzipped and wraps the
  callback-based IndexedDB API in Promises, removing a whole class of
  transaction/callback bugs for a negligible bundle cost — worth it for
  something as easy to get subtly wrong as raw IndexedDB. (Issue #14)
- **"New Project inherits last settings" reads from whichever settings are
  live in memory, not a fresh IndexedDB round-trip.** `handleNewProject` in
  App.svelte flushes any pending autosave first, then calls
  `createNewProject(store)` (which queries `getLastEdited()`) — so it's
  always the truly-latest edit, not a stale pre-debounce snapshot. The pure
  `createProject(settings)` half (used elsewhere too) is unit-tested
  separately from the storage-backed `createNewProject` half. (Issue #14)
- **A Project's name defaults to its letters (e.g. "MX"), not "Untitled."**
  The recent-projects list is otherwise a wall of identical "Untitled"
  tiles until a user manually renames every one — defaulting to the letters
  gives each tile a legible, distinct label for free. Renaming is still
  explicit and doesn't auto-follow later letter edits (CONTEXT.md's Project
  is one persisted _configuration_; only its content changes when letters
  do, not its label). (Issue #14)
- **Recent-project thumbnails reuse `composeMonogram` directly — no new
  rendering path.** `ProjectsPanel.svelte` looks up each Project's Design
  and calls the same pure engine function DesignGallery/FrameGallery already
  call, keeping the engine as the single source of truth for what a
  monogram looks like. (Issue #14)
- **Switching the active Project (`switchToProject`) is deliberately
  synchronous, with no `await` before its state reassignments.** An earlier
  version awaited fetching the target Project before switching, which
  opened a race: an edit made during that fetch would autosave against the
  _outgoing_ Project's id instead of the new one (caught by the
  recent-projects E2E test, not by inspection). `switchToProject` now fires
  `autosave.flush()` without awaiting it (its pending-write capture is
  synchronous even though the write itself isn't) and reassigns
  `activeProjectMeta` and all editor fields in the same synchronous tick;
  `handleSelectProject` reads the target Project from the already-loaded
  `projects` list instead of re-fetching it, so there's no async gap to
  race at all. (Issue #14)
- **Deleting a Project from the recent-projects list has no confirmation
  step.** Consistent with the rest of the editor's implicit-autosave,
  no-dead-ends UX (Design Principle 3) — the app already never asks "are
  you sure?" for any other change. Revisit if user feedback says accidental
  deletes are a real problem. (Issue #14)
- **`handleDeleteProject` now awaits any in-flight autosave write before
  calling `store.delete(id)`, not just `cancelPending()`'s unfired-timer
  case.** `cancelPending()` can only stop a debounced write that hasn't
  fired yet; once the timer fires, `flush()` captures and clears the
  pending Project synchronously but the `store.put()` itself is still
  async, so a delete racing that window could land before the put and get
  resurrected by it — the same class of race `switchToProject` was fixed
  for above, just on the delete path instead. `AutosaveController` gained
  `settleInFlight()` to close it deterministically: `handleDeleteProject`
  calls `cancelPending()` then `await settleInFlight()` before
  `store.delete(id)`, guaranteeing the delete is the last write for that
  id. (Issue #14, PR #31 review)
- **Onboarding's "first run?" gate now keys off real Project existence, not
  just the localStorage flag (backfilling #13).** #13 shipped a bare
  `localStorage` "onboarded" flag as a placeholder, with an explicit
  `TODO(#14)` to widen it once Projects persist. #14 makes that real:
  App.svelte now feeds `isFirstRun` with
  `onboardingComplete || hasAnyProject`, where `hasAnyProject` reflects
  whether any Project exists in IndexedDB — so onboarding never shows again
  once a Project exists, even if the localStorage flag is later cleared.
  `isFirstRun`'s own signature is unchanged, as originally designed. (Issue #14)
- **Frame Gap uses a range slider, not a number input.** Issue #12's title said
  "gap slider," and a continuous slider gives live feedback while dragging
  (Design Principle 3) for a spatial parameter. A numeric `<output>` readout sits
  next to it so the exact value stays visible. (PR #26)
- **"Transparent background" is a dedicated checkbox, a fourth control beyond the
  three color pickers.** The letters/frame/background AC lists three color
  pickers, but an `<input type="color">` can't represent "no color," and the AC
  itself requires the background to default to transparent — so the toggle is
  necessary, not scope creep. Transparent never serializes a white `<rect>`; the
  preview shows a checkerboard behind it. (PR #26)
- **The default Frame Gap has a single source of truth in the engine.**
  `DEFAULT_GAP` lives in `src/engine/frames.ts` and is imported by
  `src/lib/frame-gap.ts` and `src/App.svelte` (via `MIN_GAP`/`MAX_GAP`) rather
  than being re-hardcoded, so the UI can't silently drift from the engine's
  default. (PR #26)
- **Extracting a shared Gallery component is deferred, not done now.**
  `FrameGallery.svelte` duplicates ~50 lines of tile markup/CSS from
  `DesignGallery.svelte`. With only two galleries that differ in content,
  extracting a shared component now risks premature abstraction; revisit if a
  third gallery appears. Tracked in [BACKLOG.md](BACKLOG.md). (PR #26)
- **PR preview deployments get a dedicated teardown mechanism, filed separately.**
  Cleaning up the Cloudflare Workers preview + GitHub `preview` deployment on PR
  close is an infra concern orthogonal to the v1 feature work, so it's its own
  issue (#25) rather than folded into a feature PR or the v1 milestone.
