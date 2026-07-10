# Hosting on Cloudflare Workers from day 1, CI-gated auto-merge to main

Supersedes the earlier lean toward GitHub Pages. The repo ruleset requires per-PR preview deployments plus an "E2E against preview" check — GitHub Pages cannot serve per-PR previews, and the mid-term plan was Cloudflare anyway. We host on **Cloudflare Workers (static assets)** from the start, mirroring the proven setup from stefanhoth.com:

- CI (GitHub Actions): `Lint`, `Build`, `Test` on every PR; actions pinned by SHA.
- Preview deploy: build job (runs untrusted npm lifecycle scripts, no secrets) uploads `dist/` as artifact; deploy job (holds Cloudflare secrets, runs no npm install) publishes via `wrangler versions upload --preview-alias pr-N` and registers a GitHub `preview` deployment.
- E2E: Playwright in container, executed against the live preview URL.
- `main` is protected (ruleset: PR required, 0 approvals, required checks Lint/Build/Test/E2E, required `preview` deployment, linear history, squash-only merge) with **auto-merge enabled** — green checks land the PR without manual action.
- Production deploy runs from `main`; custom domain `monomix.stefanhoth.com` to follow.

Cloudflare Pages was rejected in favor of Workers static assets: Workers is Cloudflare's actively developed path, and the existing workflow templates already target it.
