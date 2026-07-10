# CalVer auto-releases with three changelog layers

Every merge to `main` is a release. SemVer was rejected (no consumable API — version numbers without an audience); instead:

1. **CalVer tag, fully automatic.** The deploy workflow computes `YYYY.MM.DD` (UTC, `.N` counter for same-day releases), injects it as `APP_VERSION` into the build (shown in the app's about area), tags, and creates a GitHub Release whose notes are the commit list since the last tag. Script pattern provided by Stefan from a prior project.
2. **`CHANGELOG.md` in Keep a Changelog format.** User-visible PRs add an entry under `[Unreleased]` (enforced as a convention in CLAUDE.md); the release workflow promotes `[Unreleased]` into the new CalVer section. Pure dependency/infra PRs skip it.
3. **In-app "What's new?" — curated, not generated.** Following the proven starlog pattern (stefanhoth/starlog: `src/lib/changelog.ts`, `WhatsNewPanel.svelte`): a hand-written TS constant with benefit-language entries grouped by month, rendered in a slide-in panel with per-user "seen" tracking (badge until opened). Deliberately moderated — technical release noise never reaches users.
