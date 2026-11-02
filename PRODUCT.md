# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Individuals creating a personal 1–3 letter monogram, for two overlapping uses:

- **Digital use** — avatars, social profiles, personal branding.
- **Physical goods** — stationery, gifts, and crafting/laser-cutting/embroidery materials, where the monogram gets reproduced onto a real object.

No account, no signup, no server round-trip: the user opens the app, types their initials, and works entirely in the browser.

## Product Purpose

MonoMix turns 1–3 typed letters into a finished, exportable monogram: pick a Design (font + Arrangement + Shape), optionally add a Frame, choose colors, and export as SVG, PNG, JPG, or PDF. Success is a newcomer reaching a personal, good-looking result within seconds, then refining it as far as they want — case, gradients, background image, opacity, Frame fill — without ever leaving the single-screen editor.

## Positioning

- **Local-first and private by construction, not by policy** — no server, no account, everything runs client-side (ADR 0002, ADR 0004). A "Copy link" share mode is the only thing that leaves the browser, and it's opt-in and explicit about what it can and can't carry (e.g. a background image can't travel in a URL).
- **Algorithmic composition, not a font pretending to be a monogram font** — there is no compatible-license monogram font to fall back on, so every Design programmatically composes ordinary OFL letterforms into Arrangement + Shape (ADR 0006, ADR 0007). This is a structural constraint turned into the product's actual mechanism.
- **Free and redistributable by construction** — every font is SIL OFL / CC0 / Apache-2.0 (ADR 0003); never a "free for personal use" font. Credited on an in-app fonts & licenses page.

## Operating Context

- Single-screen, fullscreen workspace: live monogram preview always in view, controls (Designs, Frames, Colors, Export) in a tabbed sidebar (a fixed vertical split on phones).
- First run: the user is asked for their initials, then the design gallery reveals itself already rendered with those letters (or a placeholder "ABC" if skipped) — asked once, never again.
- Work autosaves continuously; no save button. A Projects panel lists recent monograms with live thumbnails; only the active Project is editable, everything else is a frozen snapshot that can be renamed, deleted, or used as a Remix source.
- Installable PWA (`vite-plugin-pwa`); English and German UI, defaulting to browser language with a manual switcher, remembered per visitor.
- Light and dark themes; `prefers-reduced-motion` is respected for preview transitions.

## Capabilities and Constraints

- Letters: 1–3 characters, A–Z/a–z only; non-Latin input is rejected with a transliteration hint rather than silently altered. Per-monogram case toggle ("ABC" vs "Abc", ADR 0008) — every Design supports both.
- A Design is a fixed (font, Arrangement, Shape) triple; the gallery filters by current Letter Count. A Frame is independent of Design and combines with any of them.
- Export formats today: SVG, PNG, JPG, PDF. DXF + EPS for CAD/laser workflows is deferred to v1.1, pending real-world validation of the bezier → spline/polyline conversion (docs/BACKLOG.md).
- Colors: solid or gradient (linear/radial, up to 3 stops) independently for letters, Frame, and background; background can also be an uploaded image (zoomable/repositionable) or transparent. Letter opacity and Frame fill support "cut-out"/stencil effects.
- **First-run onboarding (addressed 2026-08-07):** the first-time monogram-creation experience used to drop a newcomer straight from the initials prompt into ~30+ raw Design tiles across 4 tabs, undercutting the "fast result" principle. Fixed with a curated jump-off gallery (a handful of fully styled example monograms shown right after initials, each demonstrating a real capability — gradients, a filled+cut-out Frame, etc. — with an always-available "See all designs instead" escape hatch) plus a one-time dismissible coach note over the tab bar. If this still doesn't land well in practice, revisit rather than assuming it's solved.

## Brand Commitments

- Name: **MonoMix**, always spelled with two capital Ms (CONTEXT.md). This is the one fixed brand fact.
- Nothing else is binding yet: the README tagline ("Mix your monogram and take it with you") and the about-page line ("Your initials, pressed into shape.") are both explicitly **not** binding — free to revise or replace. No confirmed voice/personality beyond what docs/DESIGN-PRINCIPLES.md already states as UX principles ("Modern, typographic, calm").

## Evidence on Hand

No real testimonials, case studies, customer logos, or usage data exist. Do not fabricate any. The only real assets are the OFL/CC0/Apache-2.0 font catalog already vendored in the repo and the app's own generated output.

## Product Principles

1. **Private by construction.** No server, no account, no tracking — not a policy choice but the architecture (ADR 0002/0004).
2. **A structural constraint became the mechanism.** No compatible monogram font exists, so algorithmic composition of ordinary letterforms is the product, not a workaround (ADR 0006/0007).
3. **Free and redistributable, always.** OFL/CC0/Apache-2.0 fonts only, credited in-app (ADR 0003) — never a license trap.
4. **Fast first result, deep second act.** A newcomer should reach a good monogram in seconds; power (gradients, opacity, Frame-fill stencils, image backgrounds, remix) is discoverable, not front-loaded. The first-run onboarding gap this principle used to call out was addressed 2026-08-07 (see Capabilities and Constraints) — keep holding new flows to this bar rather than assuming it's permanently solved.
5. **Output for both screen and object.** Every color/composition feature has to survive export to SVG/PNG/JPG/PDF (and eventually DXF/EPS) — the monogram is as often headed for fabric, wood, or paper as it is for an avatar.

## Accessibility & Inclusion

Target standard: **WCAG 2.1 AA** (confirmed 2026-08-07; not yet audited against it). Existing groundwork: `prefers-reduced-motion` respected for preview transitions, light and dark themes, English/German localization.
