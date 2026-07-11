# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project is versioned with [CalVer](https://calver.org/) (`YYYY.MM.DD[.N]`).

Only user-visible changes belong here — pure dependency/infra PRs are omitted. See [docs/adr/0005-calver-releases-three-changelogs.md](docs/adr/0005-calver-releases-three-changelogs.md) for how this fits with the CalVer releases and the in-app "What's new?" panel.

## [Unreleased]

### Added

- You can now export your monogram as SVG, PNG, JPG, or PDF.
- The letters field now catches non-A-Z characters (like umlauts) and shows a helpful hint instead of silently changing what you typed. The layout also adapts to narrow/mobile screens.
- A design gallery now shows every available style with your own letters live, filtered to the ones that fit your current initials. Pick one and the main preview updates with a smooth transition. Frame and color controls are still to come.
- A Frame gallery lets you add a decorative border (circle, square, diamond, dotted, or dashed) around your monogram, with "No Frame" as the default, plus a gap control for how much breathing room it leaves. Separate color pickers for the letters, the Frame, and the background — background is transparent by default, shown as a checkerboard so you can tell it apart from white.
- First time you open MonoMix, you're asked for your initials and the design gallery reveals itself with your own letters, staggered in one tile at a time. Just browsing? Skip it and you'll get a placeholder "ABC" monogram to explore instead — either way, you won't be asked again.
