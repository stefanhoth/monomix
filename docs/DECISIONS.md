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

## 2026-07-13

- **The DE/EN dictionary covers UI chrome (labels, buttons, headings,
  hints) only — Design and Frame catalog names stay untranslated.**
  `src/lib/i18n/dictionary.ts` has ~25 keys, matching the issue's "~40-60
  strings" mini-dictionary budget. Design names are generated from font
  family + variant label (e.g. "Cinzel Decorative Stacked") — font family
  names are proper nouns that don't get translated in any product, and
  partially translating just the variant half would read as broken, not
  bilingual. Frame names (Circle, Square, Diamond, …) are catalog/content
  data from the pure engine (CLAUDE.md: "Engine is a pure function"), not
  app chrome — same category as Design names. Revisit only if user
  feedback specifically asks for catalog-name translation. (Issue #15)
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
