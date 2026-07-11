# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project is versioned with [CalVer](https://calver.org/) (`YYYY.MM.DD[.N]`).

Only user-visible changes belong here — pure dependency/infra PRs are omitted. See [docs/adr/0005-calver-releases-three-changelogs.md](docs/adr/0005-calver-releases-three-changelogs.md) for how this fits with the CalVer releases and the in-app "What's new?" panel.

## [Unreleased]

### Added

- You can now export your monogram as SVG, PNG, JPG, or PDF.
- The letters field now catches non-A-Z characters (like umlauts) and shows a helpful hint instead of silently changing what you typed. The layout also adapts to narrow/mobile screens.
- A design gallery now shows every available style with your own letters live, filtered to the ones that fit your current initials. Pick one and the main preview updates with a smooth transition. Frame and color controls are still to come.
