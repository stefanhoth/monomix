# MonoMix

Browser-local, PWA-ready monogram maker. No server — everything runs client-side.

Read [CONTEXT.md](CONTEXT.md) for the domain glossary, [docs/adr/](docs/adr/) for architecture decisions (check `status:` frontmatter — superseded ADRs are kept for history, not followed), [docs/DESIGN-PRINCIPLES.md](docs/DESIGN-PRINCIPLES.md) for the UX bar, and [docs/BACKLOG.md](docs/BACKLOG.md) before proposing something — it might already be deferred or explicitly rejected. Smaller-but-made calls that don't warrant an ADR are logged in [docs/DECISIONS.md](docs/DECISIONS.md).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run test` — unit tests (Vitest)
- `npm run test:e2e` — E2E (Playwright; set `E2E_BASE_URL` to run against a deployed preview instead of a local build)
- `npm run lint` — oxlint + prettier --check + svelte-check
- `npm run format` — prettier --write

## Stack

Svelte + Vite + TypeScript (no SvelteKit — single client-only screen, no routing/SSR). Hosted on Cloudflare Workers (static assets), PR previews via `wrangler versions upload --preview-alias`. See [ADR 0002](docs/adr/0002-svelte-vite-typescript.md) and [ADR 0004](docs/adr/0004-cloudflare-workers-ci.md).

## Workflow

`/implement` doesn't stop at a local commit: build → run `/code-review` locally against the diff → triage findings by gravity (fix what matters now, log or defer low-gravity ones — e.g. to `docs/BACKLOG.md`, a spawned background task, or a follow-up issue) → commit → `gh pr create` → `gh pr merge --auto --squash` right away. The review gate is local, before the PR, not a manual-merge gate on the PR itself — don't wait for a manual merge once checks are green.

## Conventions

- **Engine is a pure function.** `src/engine/` takes a monogram configuration (letters, Design, Frame, colors) and returns an SVG string. No DOM access, no `window`/`document`, no side effects — this is what makes Designs unit-testable and snapshot-testable without a browser.
- **Designs are algorithmic, not font-native monogram glyphs.** See [ADR 0006](docs/adr/0006-algorithmic-composition-primary.md) — there is no compatible-license monogram font to fall back on; every Design composes ordinary OFL letterforms.
- **Fonts must be SIL OFL / CC0 / Apache-2.0 only.** See [ADR 0003](docs/adr/0003-ofl-only-fonts.md). Never add a "free for personal use" font.
- **Commits/PR titles**: Conventional Commits with a scope, e.g. `feat(export): add PDF export`, `fix(gallery): debounce live preview`. PRs are squash-merged, so the PR title becomes the commit message on `main`.
- **User-visible changes** get an entry in `CHANGELOG.md` under `[Unreleased]` (Keep a Changelog format). Pure dependency/infra PRs don't need one.
- **For user-facing features**, also consider whether it warrants a curated entry in `src/lib/changelog.ts` (the in-app "What's new?" panel, [ADR 0005](docs/adr/0005-calver-releases-three-changelogs.md)). Unlike `CHANGELOG.md`, this one is deliberately moderated — not every entry qualifies, so this is a judgment call, not automatic.
- Design principles in [docs/DESIGN-PRINCIPLES.md](docs/DESIGN-PRINCIPLES.md) are a review checklist, not just inspiration — e.g. path-morphing between designs is explicitly rejected (see BACKLOG.md), don't reintroduce it.
