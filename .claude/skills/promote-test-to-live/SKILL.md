---
name: promote-test-to-live
description: Lifts the currently-proven src/ state from the Test environment to Live — rebuilds live from src/ + config/live.json, deploys via the cloudflare-deploy mechanism, verifies, and leaves a traceable record (git tag + CHANGELOG.md entry). Use when the user asks to "promote", "auf Live heben", "von Test nach Live", "live nehmen", "release to production", or otherwise wants the currently-tested plugin code to become the live version.
---

# Promote Test → Live

Both environments are built from the **same `src/`** — the only intentional difference is
the feed configuration (`config/test.json` vs `config/live.json`). "Promoting" therefore
never means copying `environments/test/*.js` to `environments/live/*.js` — it means: take the
current `src/` (already validated on Test), rebuild it with the Live config, and deploy that.

This is a production-affecting action. Always confirm with the user before step 3 unless
they've already explicitly asked to promote (that request *is* the confirmation) — but still
show them what's about to go live.

## Steps

**1. Sanity check: is what's on Test actually current?**

```bash
git status --short src/ config/
```
If there are uncommitted changes in `src/` or `config/`, flag this to the user — promoting
uncommitted code means the git history won't reflect what's actually live. Ask whether to
commit first (recommended) or proceed anyway.

**2. Rebuild both environments from the current `src/`**

```bash
node scripts/build.js all
```
Rebuilding `test` too (not just `live`) keeps both in sync and catches any build-script
regressions before they hit production.

**3. Deploy to Live**

Follow the `cloudflare-deploy` skill's steps 1–3 with `environment=live`:
- `node --check environments/live/plugin.js && node --check environments/live/seo.js`
- `npx wrangler pages deploy "environments/live" --project-name=stgm-plugin --branch=main --commit-dirty=true`
- Verify against `https://stgm-plugin.pages.dev` (HTTP 200, correct `Content-Type`, byte-diff clean)

Do not skip verification — a promotion without verification is not considered done.

**4. Leave a record**

Only after verification succeeds:

```bash
TAG="live-$(date +%Y-%m-%d-%H%M)"
git tag "$TAG"
```

Prepend an entry to `CHANGELOG.md` (right after the `<!-- Neue Einträge werden hier oben eingefügt -->` marker):

```markdown
## $TAG
- Promoted current src/ state to Live (feed: <live feedUrl from config/live.json>).
- Test was on the same src/ state at time of promotion.
```

Commit this as its own commit:
```bash
git add CHANGELOG.md
git commit -m "Promote to Live: $TAG"
```

**5. Report**

Tell the user: what was promoted (the git tag, a one-line summary of what changed in `src/`
since the last `live-*` tag if any — `git log <previous-tag>..HEAD --oneline -- src/`),
deployed ✅/❌ per file, live URLs, verification result.

## One-time setup note

If the Live SF system is not yet pointed at Cloudflare (still using the old manual CSB-paste
workflow), tell the user this promotion only takes effect once the Live system's Career Site
Builder plugin field is updated to load `<script src="https://stgm-plugin.pages.dev/plugin.js">`
and `<script src="https://stgm-plugin.pages.dev/seo.js">` — this is a manual step in SF's admin
UI, outside this repo, and only needs to happen once. After that, every future promotion is
fully automated.
