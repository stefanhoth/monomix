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
