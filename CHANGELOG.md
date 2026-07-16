# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project is versioned with [CalVer](https://calver.org/) (`YYYY.MM.DD[.N]`).

Only user-visible changes belong here — pure dependency/infra PRs are omitted. See [docs/adr/0005-calver-releases-three-changelogs.md](docs/adr/0005-calver-releases-three-changelogs.md) for how this fits with the CalVer releases and the in-app "What's new?" panel.

## [Unreleased]

### Added

- Narrow and wide diamond Shape and Frame variants: two new aspect ratios alongside the existing (symmetric) Diamond, each with matching Designs (Playfair Display, Archivo Black) and a matching Frame silhouette.
- A quiet "Fonts & licenses" link below the sidebar panels opens a credits page: every font in the catalog with a live specimen, its libre license, and a link to its Google Fonts page.
- Six decorative fonts join the catalog: Rye (Tuscan/Western), Elsie Swash Caps and Berkshire Swash (swash serifs), Pirata One (blackletter) — each with circle and diamond Designs — plus Monsieur La Doulaise (flourished calligraphy, 1–2 letters) and Fascinate Inline (art déco) as classic Designs.

- A "New Project" surface behind the topbar button: start blank or **remix** any recent Project into a fresh one — the original stays untouched, as a frozen snapshot. Renaming and deleting recent Projects lives there now too, instead of in a permanent panel below the editor.

- You can now export your monogram as SVG, PNG, JPG, or PDF.
- The letters field now catches non-A-Z characters (like umlauts) and shows a helpful hint instead of silently changing what you typed. The layout also adapts to narrow/mobile screens.
- A design gallery now shows every available style with your own letters live, filtered to the ones that fit your current initials. Pick one and the main preview updates with a smooth transition. Frame and color controls are still to come.
- A Frame gallery lets you add a decorative border (circle, square, diamond, dotted, or dashed) around your monogram, with "No Frame" as the default, plus a gap control for how much breathing room it leaves. Separate color pickers for the letters, the Frame, and the background — background is transparent by default, shown as a checkerboard so you can tell it apart from white.
- First time you open MonoMix, you're asked for your initials and the design gallery reveals itself with your own letters, staggered in one tile at a time. Just browsing? Skip it and you'll get a placeholder "ABC" monogram to explore instead — either way, you won't be asked again.
- Your work now saves itself automatically as you go — no save button, and reloading the page picks up right where you left off. A "Projects" panel lists your recent monograms with live thumbnails, ordered by when you last edited them, and lets you rename or delete any of them. Starting a "New Project" carries over your most recently used design, Frame, and colors instead of resetting to defaults.
- MonoMix now speaks German as well as English. It defaults to your browser's language, with a switcher in the top corner if you'd rather pick manually — your choice is remembered on your next visit.
- A "What's new" link in the top corner opens a panel with a curated, plain-language look at recent changes, grouped by month — a small dot shows up whenever there's something you haven't seen yet.
- Every font now also comes in a "Circle" design that presses your letters into a classic circle monogram — the outer letters bow to follow the ring. Combine it with any Frame and it still fits perfectly.
- Every font now also comes in a "Diamond" design that presses your letters into a classic diamond monogram silhouette.

### Changed

- Starting a new Project blank now uses the app defaults instead of silently inheriting your last-used settings — carrying settings forward is exactly what Remix is for.
- The in-app "What's new" panel now tells MonoMix's launch-day story as it ships today, instead of an incremental pre-launch history no user ever saw.

- The editor is now a fullscreen workspace: your monogram and the letters field always stay in view, while Designs, Frames, colors, and export moved into a tabbed sidebar (on phones: a fixed vertical split with the preview on top). No more scrolling the preview away to reach a control.
- Design and Frame gallery tiles now render with your actual letter color on the same adaptive checkerboard the main preview uses — dark letters no longer vanish on dark-mode tiles.
- Frames now stay put: instead of a Frame shrinking to make room, your lettering scales to fit inside it. The Frame Gap slider controls that breathing room directly — all the way down means your letters fill the Frame, and no font/letters combination can overflow it anymore.
- The design gallery has been re-curated: shaped (circle and diamond) monograms now lead the gallery, and the underwhelming plain font-only designs have mostly been retired in their favor. The very first design you see is now a classic circle monogram.

### Fixed

- The transparency checkerboard behind the preview now adapts to your letters color instead of the light/dark theme — dark letters were nearly invisible against the dark-mode checkerboard, and white letters (say, for dark fabric) now get a dark board to stand out against. Exported files are unaffected.
