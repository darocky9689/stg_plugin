# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repo contains vanilla JavaScript UI plugins injected into SAP SuccessFactors job postings for the Stiegelmeyer Group career site. There is no bundler and no test runner; the only build step is a small Node script (`scripts/build.js`) that turns the canonical source into environment-specific, deploy-ready files.

The client runs **two SAP SuccessFactors systems**: **Test** (development) and **Live** (real production career site). Both are meant to load the plugin files from Cloudflare Pages — see "Environments" below.

## Source layout

| Path | Purpose |
|---|---|
| `src/plugin/header.js` | Hero header with job title overlay + speech bubble, job body (Aufgaben/Profil), CTA/contact box, and the benefits grid (reading benefit IDs from the XML feed's `customfield4` field) |
| `src/plugin/jobinfo.js` | Tile row: company, location, workload, entry date |
| `src/seo.js` | Generates a JSON-LD `JobPosting` for Google for Jobs and neutralizes SF's incomplete microdata |

`src/plugin/*.js` are bundled together (in that order) into a single `plugin.js` per environment; `src/seo.js` becomes a standalone `seo.js`. Each module is its own IIFE with an init guard (`window.__sgHeaderPluginInitialized`, `window.__jobInfoPluginInitialized`, `window.__jobPostingSeoPluginInitialized`) — no shared globals except the deliberate `window.__sgFeedCache`, a URL-keyed cache so the XML feed is fetched once per page load instead of once per module (`seo.js` uses it too). All modules match jobs on the numeric part of the req ID (`603-de_DE` ↔ `603`).

`z_old/retired-benefits-module.js` was a separate, older benefits renderer (once `src/plugin/benefits.js`) with its own, outdated benefit-ID mapping. It duplicated `header.js`'s benefits section but — unlike it — showed a visible "Keine Benefits für diesen Job hinterlegt." fallback whenever its stale ID table didn't match the feed. It's no longer part of the build; kept only for reference.

Feed URLs are **not** hardcoded in `src/` — they're placeholder tokens (`__FEED_BASE_URL__`, `__DEFAULT_FEED_ID__`) filled in at build time from `config/<env>.json`. At runtime every module builds the feed URL the same way: `__FEED_BASE_URL__` + the page's `?feedId=` query param (if numeric), else `__DEFAULT_FEED_ID__`. The HowRyou logo URL is likewise a token (`__HOWRYOU_LOGO_URL__`, from `howryouLogoUrl`), because Test and Live host it on different SF CDN paths.

## Environments

```
node scripts/build.js test   # -> environments/test/{plugin.js,seo.js,_headers}
node scripts/build.js live   # -> environments/live/{plugin.js,seo.js,_headers}
node scripts/build.js all    # both
```
(equivalently: `npm run build:test`, `npm run build:live`, `npm run build`)

`environments/test/` and `environments/live/` are generated — never hand-edit the files in
there; edit `src/` and rebuild. The only difference between the two outputs is the feed
configuration in `config/test.json` (staging feed) vs. `config/live.json` (production feed).

Both environments deploy to the same Cloudflare Pages project **stgm-plugin**, on different
branches:
- `test` → `--branch=test` → `https://test.stgm-plugin.pages.dev`
- `live` → `--branch=main` → `https://stgm-plugin.pages.dev`

## Data source

Jobs are matched by URL — the job req ID is extracted from the trailing path segment (`/123456-de_DE`). The feed contains `<job>` nodes with fields: `ID`, `title`, `businessunit`, `location`, `shifttype`, `customfield4` (benefit IDs — **Live uses the old option IDs 8–30, Test uses 36–90**; `header.js` maps both onto the same benefits), `customfield5` (entry date), among others used by `src/seo.js`.

## Company / brand logic

All plugins determine which logo/organization to show based on `businessunit` text:
- contains `howryou` → HowRyou
- contains `burmeier` → Burmeier
- default → Stiegelmeyer

## Debugging

`src/plugin/jobinfo.js` has a `DEBUG_JOB` variable (set to a job req ID string like `"603-de_DE"`) to test without a matching URL — remember to rebuild after changing it.

## Deployment (Cloudflare)

Whenever the user asks to upload, deploy, push, or publish a plugin file to Cloudflare,
use the [`cloudflare-deploy`](.claude/skills/cloudflare-deploy/SKILL.md) skill — it rebuilds
the target environment, syntax-checks the output, deploys, and then verifies the live result
actually matches what was deployed. Don't deploy by hand outside that skill; the verification
step is required, not optional.

To lift the currently-proven Test state to Live (rebuild from `src/` with the Live config,
deploy, verify, and leave a git tag + `CHANGELOG.md` entry), use the
[`promote-test-to-live`](.claude/skills/promote-test-to-live/SKILL.md) skill instead of
running `cloudflare-deploy` by hand twice.

## Archive

`z_old/` holds superseded code generations (including `z_old/legacy-2026-09-03/`, the
pre-restructure root plugin files and `Prod_Plugins/`) — kept for reference, not deployed
and not part of the build.
