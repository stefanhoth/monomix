# Plan: `monomix.stefanhoth.com` as the production release target

Status: **planned, not yet executed** — tracked in [BACKLOG.md](BACKLOG.md), promised in [ADR 0004](adr/0004-cloudflare-workers-ci.md) ("custom domain to follow"). This doc is the concrete runbook for whoever (human or a future session with Cloudflare dashboard/DNS access) picks it up; none of it has been applied yet.

## Goal

Today the only public URL is the Worker's default `*.workers.dev` subdomain (previews use `pr-N-monomix.stefanhoth-de.workers.dev`, production presumably `monomix.stefanhoth-de.workers.dev`). Bind `monomix.stefanhoth.com` to the same Worker so it becomes the canonical production URL, mirroring the stefanhoth.com setup ADR 0004 already follows for CI.

## Prerequisites

- `stefanhoth.com` is already an active zone on the same Cloudflare account the repo's `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_API_TOKEN` secrets point at (true per ADR 0004 — "mirroring the proven setup from stefanhoth.com").
- The repo's `CLOUDFLARE_API_TOKEN` (used by `release.yml`) needs **Zone:DNS:Edit** and **Workers Routes:Edit** permission scoped to the `stefanhoth.com` zone, in addition to the account-level Workers Scripts edit it already has. Custom Domains provision a proxied DNS record automatically, but the token needs the zone permission to do it — check current token scopes before relying on automatic provisioning; widen the token if it's account-only.

## Steps

1. **Add the route declaratively in `wrangler.jsonc`**, rather than only clicking it into place in the dashboard, so the binding is reproducible and reviewable:

   ```jsonc
   {
     "$schema": "node_modules/wrangler/config-schema.json",
     "name": "monomix",
     "compatibility_date": "2026-07-01",
     "assets": {
       "directory": "./dist",
       "not_found_handling": "single-page-application",
     },
     "routes": [{ "pattern": "monomix.stefanhoth.com", "custom_domain": true }],
   }
   ```

   `custom_domain: true` tells Cloudflare to manage the DNS record + TLS cert for this hostname (equivalent to "Custom Domains" in the dashboard, not a plain wildcard route).

2. **First deploy is a one-time manual step**, not a PR: run `npx wrangler deploy` locally (or trigger the `release.yml` workflow) with credentials that have the zone permission from the prerequisite above. Wrangler will create the DNS record and request the TLS certificate on first apply — this can take a few minutes to become reachable.

3. **Verify** `https://monomix.stefanhoth.com` serves the same content as the `workers.dev` production URL (`curl -I` for a 200, then a manual load in a browser to confirm the PWA installs correctly from the new origin — service worker scope is origin-bound, so this is worth checking, not assuming).

4. **Leave previews untouched.** `preview-deploy.yml`'s `pr-N-monomix.stefanhoth-de.workers.dev` aliases are unaffected — Custom Domains only attach to the routes we declare, and preview versions are uploaded via `wrangler versions upload`, not `wrangler deploy`, so they never claim the custom domain route.

5. **Once live, close the loop in the docs:**
   - Remove the "Custom domain" line from `docs/BACKLOG.md`'s Deferred section.
   - Add a dated entry to `docs/DECISIONS.md` noting the cutover date and the token scope that ended up being needed (useful if it needed widening — save the next person the rediscovery).
   - `docs/adr/0004-cloudflare-workers-ci.md`'s "to follow" line can be dropped; the ADR's decision doesn't change, this just closes out a stated intent.

## Rollback

Deleting the `routes` entry from `wrangler.jsonc` and redeploying detaches the Worker from the hostname; the DNS record Cloudflare created can be removed separately in the dashboard if the domain is being fully decommissioned rather than just repointed.

## Explicitly out of scope here

- Redirecting or retiring the `workers.dev` production URL — leave it live as a fallback; this plan only adds the custom domain, it doesn't remove the existing one.
- Any change to preview infrastructure.
