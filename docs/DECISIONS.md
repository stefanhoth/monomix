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
