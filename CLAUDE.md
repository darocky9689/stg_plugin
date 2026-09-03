# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repo contains vanilla JavaScript UI plugins injected into SAP SuccessFactors job postings for the Stiegelmeyer Group career site. There is no build system, no package manager, and no test runner — the files are deployed directly as scripts.

## Plugins

| File | Purpose |
|---|---|
| [header_plugin.js](header_plugin.js) | Renders a hero header with job title overlay and floating company logo on job detail pages |
| [jobInfo_plugin.js](jobInfo_plugin.js) | Renders a tile row showing company, location, workload, and entry date below the job header |
| [benefits_plugin.js](benefits_plugin.js) | Renders a responsive benefits grid by reading benefit IDs from the XML feed's `customfield4` field |

## Data source

All three plugins fetch job data from the same XML feed:
```
https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205
```

Jobs are matched by URL — the job req ID is extracted from the trailing path segment (`/123456-de_DE`). The feed contains `<job>` nodes with fields: `ID`, `title`, `businessunit`, `location`, `shifttype`, `customfield4` (benefit IDs), `customfield5` (entry date).

## Company / brand logic

All three plugins determine which logo to show based on `businessunit` text:
- contains `howryou` → HowRyou logo
- contains `burmeier` → Burmeier logo
- default → Stiegelmeyer logo

## Plugin architecture pattern

Each plugin is self-contained and guard against double-initialization:
- `header_plugin.js` uses an IIFE with `window.__jobHeaderPluginInitialized`
- `jobInfo_plugin.js` checks for an existing DOM element by `JOBINFO_WRAPPER_ID`
- `benefits_plugin.js` uses `document.currentScript` to anchor its insertion point relative to the `<script>` tag

All plugins inject their own `<style>` tag into `<head>` (idempotent, guarded by a unique id or attribute).

## Debugging

`jobInfo_plugin.js` has a `debugJob` config field (set to a job req ID string like `"123456-de_DE"`) to test without a matching URL.

`benefits_plugin.js` has verbose `console.log` / `console.warn` output prefixed with `[BENEFITS DEBUG]` and `[DEBUG]` throughout.

## Key config values (header_plugin.js)

- `desktopImageWidthPercent`: 70 — image takes 70% of row width
- `desktopOverlayWidthPercent`: 40 — dark blue overlay width
- `fixedImageHeight`: 482px desktop / 300px mobile
- `overlayHeightRatio`: 0.90 — overlay height as fraction of image height
- `mobileBreakpoint`: 768px

## Deployment (Cloudflare)

Plugin files are served in production from the Cloudflare Pages project **stgm-plugin**
(`stgm-plugin.pages.dev`, account `b501a9b0e68baf3dc17d40bc92ce17c2`). `wrangler` is a
devDependency (`npx wrangler ...`); auth is via `CLOUDFLARE_API_TOKEN` in the environment.

Whenever the user asks to upload, deploy, push, or publish a plugin file to Cloudflare,
use the [`cloudflare-deploy`](.claude/skills/cloudflare-deploy/SKILL.md) skill — it syntax-checks
the file(s), deploys, and then verifies the live result actually matches what was deployed.
Don't deploy by hand outside that skill; the verification step is required, not optional.
