---
name: cloudflare-deploy
description: Deploys the plugin JS files to the Cloudflare Pages project "stgm-plugin" and verifies the live result. Use whenever the user asks to upload, deploy, push, or publish files to Cloudflare — e.g. "upload zu cloudflare", "auf cloudflare deployen", "nach cloudflare hochladen", "deploy to cloudflare", "push to production", "live stellen". Also use proactively after finishing an edit to a plugin file if the user then asks to publish/see it live.
---

# Cloudflare Deploy

Deploys static plugin `.js` files (and `_headers`) from this repo to the Cloudflare
Pages project **stgm-plugin** (`stgm-plugin.pages.dev`, account `b501a9b0e68baf3dc17d40bc92ce17c2`),
and verifies the upload actually landed correctly. Always run both the upload and the
verification — an upload without verification is not considered done.

## Prerequisites

- `wrangler` is a devDependency in this repo (`npx wrangler ...`). If `node_modules` is
  missing, run `npm install` first.
- Auth is via `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`), expected to already be
  set in the environment (persisted in `~/.zshenv`). Check with `npx wrangler whoami`; if
  that fails, stop and tell the user the Cloudflare connection needs to be re-established
  before deploying.

## Which files to deploy

Only deploy files that are actually meant to go live — never the whole repo (it also
contains `feed_local.xml`, `*.pdf`, `_preview_local.html`, `z_old/`, debug scripts etc.,
none of which belong on Cloudflare).

Default target: whichever plugin file(s) the user is referring to (usually the one just
edited). If unclear, ask. Historically the single bundle actually served in production is
`stiegelmeyer_plugin.js`, always deployed together with `_headers` (Cloudflare Pages reads
`_headers` from the deploy root to set `Content-Type`/`Cache-Control`). If a different or
additional plugin file (e.g. `header_plugin.js`, `jobInfo_plugin.js`, `benefits_plugin.js`,
`seo_jobposting_plugin.js`) is being deployed for the first time, check whether `_headers`
needs a matching entry and flag it to the user if it doesn't.

## Steps

**1. Pre-flight syntax check**

For every `.js` file about to be deployed:
```bash
node --check <file>
```
If any file fails this, stop and report the syntax error — do not deploy broken JS.

**2. Stage a clean deploy directory**

Never deploy straight from the repo root (it would upload unrelated files). Build an
isolated staging dir with only the target files:
```bash
STAGE=$(mktemp -d)
cp <file1> <file2> ... _headers "$STAGE"/
```

**3. Deploy**
```bash
npx wrangler pages deploy "$STAGE" --project-name=stgm-plugin --branch=main --commit-dirty=true
```

**4. Verify (Prüfung) — required, not optional**

For each deployed file, confirm it is actually live and byte-identical to what was staged:
```bash
for f in <file1> <file2> ...; do
  echo "== $f =="
  curl -sI "https://stgm-plugin.pages.dev/$f" | head -5
  diff <(curl -s "https://stgm-plugin.pages.dev/$f") "$STAGE/$f" \
    && echo "OK: live matches staged file" \
    || echo "MISMATCH: live content differs from what was just deployed"
done
```
Check that:
- HTTP status is `200`
- `Content-Type` matches what `_headers` specifies (e.g. `application/javascript; charset=utf-8`)
- The `diff` reports no difference (Cloudflare Pages deploys can take a few seconds to
  propagate — if the diff fails immediately after deploy, wait ~5s and retry once before
  treating it as a real mismatch)

**5. Report**

Tell the user, per file: deployed ✅/❌, live URL, verification result. If anything failed
(syntax error, deploy error, mismatch after retry), stop and surface it clearly instead of
declaring success.

## Notes

- This pushes to the live production career site — always show the user which file(s) are
  about to be deployed before running step 3, unless they've already named the exact
  file(s) in their request (naming the file *is* the confirmation).
- Clean up the staging dir after verification: `rm -rf "$STAGE"`.
