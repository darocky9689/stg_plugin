---
name: cloudflare-deploy
description: Deploys the built plugin files (plugin.js + seo.js) for a given environment (test or live) to the Cloudflare Pages project "stgm-plugin" and verifies the live result. Use whenever the user asks to upload, deploy, push, or publish files to Cloudflare — e.g. "upload zu cloudflare", "auf cloudflare deployen", "nach cloudflare hochladen", "deploy to cloudflare", "push to production", "live stellen", "ins Test-System deployen". Also use proactively after finishing an edit to a plugin file if the user then asks to publish/see it live.
---

# Cloudflare Deploy

Deploys the built environment output (`environments/<env>/plugin.js`, `environments/<env>/seo.js`,
`environments/<env>/_headers`) to the Cloudflare Pages project **stgm-plugin**
(account `b501a9b0e68baf3dc17d40bc92ce17c2`), and verifies the upload actually landed correctly.
Always run both the upload and the verification — an upload without verification is not
considered done.

There are exactly two environments, each mapped to its own Cloudflare Pages branch/URL:

| Environment | Pages branch  | Live URL                              |
|-------------|---------------|----------------------------------------|
| `test`      | `--branch=test` | `https://test.stgm-plugin.pages.dev`  |
| `live`      | `--branch=main` | `https://stgm-plugin.pages.dev`       |

## Prerequisites

- `wrangler` is a devDependency in this repo (`npx wrangler ...`). If `node_modules` is
  missing, run `npm install` first.
- Auth is via `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`), expected to already be
  set in the environment (persisted in `~/.zshenv`). Check with `npx wrangler whoami`; if
  that fails, stop and tell the user the Cloudflare connection needs to be re-established
  before deploying.

## Which environment to deploy

Ask (or infer from the request) whether this is a `test` or `live` deploy — if unclear,
ask. `test` is safe to deploy freely (development system). `live` is the real production
career site — always show the user which environment is about to be deployed before running
step 3, unless they've already named it explicitly (naming it *is* the confirmation).

The source files are always **generated**, never hand-edited: run the build first so the
deploy reflects the current `src/` state.

```bash
node scripts/build.js <test|live>
```

## Steps

**1. Pre-flight syntax check**

```bash
node --check environments/<env>/plugin.js
node --check environments/<env>/seo.js
```
If either fails, stop and report the syntax error — do not deploy broken JS.

**2. Deploy**

`environments/<env>/` already contains exactly the deploy root (`plugin.js`, `seo.js`,
`_headers` — nothing else), so it can be deployed directly, no staging copy needed:

```bash
npx wrangler pages deploy "environments/<env>" --project-name=stgm-plugin --branch=<main|live-branch> --commit-dirty=true
```
Use `--branch=main` for `live`, `--branch=test` for `test`.

**3. Verify (Prüfung) — required, not optional**

```bash
BASE_URL="https://stgm-plugin.pages.dev"        # live
# BASE_URL="https://test.stgm-plugin.pages.dev" # test

for f in plugin.js seo.js; do
  echo "== $f =="
  curl -sI "$BASE_URL/$f" | head -5
  diff <(curl -s "$BASE_URL/$f") "environments/<env>/$f" \
    && echo "OK: live matches staged file" \
    || echo "MISMATCH: live content differs from what was just deployed"
done
```
Check that:
- HTTP status is `200`
- `Content-Type` matches what `_headers` specifies (`application/javascript; charset=utf-8`)
- The `diff` reports no difference (Cloudflare Pages deploys can take a few seconds to
  propagate — if the diff fails immediately after deploy, wait ~5s and retry once before
  treating it as a real mismatch)

**4. Report**

Tell the user, per file: deployed ✅/❌, live URL, verification result. If anything failed
(syntax error, deploy error, mismatch after retry), stop and surface it clearly instead of
declaring success.

## Notes

- `test` and `live` are built from the **same `src/`** — the only difference between them is
  the feed configuration in `config/test.json` / `config/live.json`. Never hand-edit
  `environments/*/plugin.js` or `environments/*/seo.js` directly; edit `src/` and rebuild.
- Deploying to `live` pushes to the real production career site — treat it with the same
  care the old workflow implied, even though it's now scripted.
- To promote the currently-proven `test` state to `live` in one guided step (rebuild, deploy,
  verify, leave a record), use the `promote-test-to-live` skill instead of running this skill
  twice by hand.
