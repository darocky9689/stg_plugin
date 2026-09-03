# Changelog

Nachvollziehbare Historie, wann welcher `src/`-Stand von Test nach Live gehoben wurde.
Wird ausschließlich vom `promote-test-to-live`-Skill ergänzt, nicht von Hand.

<!-- Neue Einträge werden hier oben eingefügt -->

## live-2026-09-03-1812
- Erste Promotion nach der Test/Live-Restrukturierung: aktueller `src/`-Stand mit
  `config/live.json` gebaut und auf https://stgm-plugin.pages.dev (Cloudflare-Branch `main`)
  deployt (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Test war zum Zeitpunkt der Promotion auf demselben `src/`-Stand.
- Achtung: die alte Datei `stiegelmeyer_plugin.js` unter derselben Domain existiert im neuen
  Deployment nicht mehr (ersetzt durch `plugin.js` + `seo.js`). Der Cloudflare-Edge-Cache
  liefert sie für angemeldete Clients ggf. noch bis zu 7 Tage aus dem Cache aus, bevor sie
  wirklich verschwindet (siehe Bericht im Chat) — falls ein SF-System sie noch referenziert,
  dessen Script-Tag auf `plugin.js`/`seo.js` umstellen.
