# Changelog

Nachvollziehbare Historie, wann welcher `src/`-Stand von Test nach Live gehoben wurde.
Wird ausschließlich vom `promote-test-to-live`-Skill ergänzt, nicht von Hand.

<!-- Neue Einträge werden hier oben eingefügt -->

## live-2026-11-05-0927
- Promoted current src/ state to Live (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Test was on the same src/ state at time of promotion.
- Job title font size reduced at client request: desktop 3.2em -> 2.4em, mobile 1.9em -> 1.6em.

## live-2026-10-12-1103
- Promoted current src/ state to Live (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Test was on the same src/ state at time of promotion.
- Praktikum layout: 'Wir wünschen uns' recognised as profile, lead full-width in fallback layout, CTA question split from its call to action, no 'für den Bereich Sonstige', fixed 'Mitarbeiter--Events'.

## live-2026-10-09-0920
- Promoted current src/ state to Live (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Test was on the same src/ state at time of promotion.
- seo.js runs alongside the legacy inline copy on the Live SF page and replaces its JSON-LD (job 722 now reports Nordhausen + Herford to Google).

## live-2026-10-09-0726
- Current src/ state deployed to Live (feed: https://job.stiegelmeyer-group.com/feed/435055) via cloudflare-deploy.
- Initiativbewerbung: Header-Text „Zur Verstärkung unseres Teams freuen wir uns über Ihre“, Zeile „für den Bereich Sonstige“ entfällt.
- Test wurde nicht separat deployt (Test-Build liegt auf demselben src/-Stand im Repo).

## live-2026-10-09-0722
- Promoted current src/ state to Live (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Test was on the same src/ state at time of promotion.
- Du-Form für Ausbildung/Praktikum (Abschnitte, Spaltentitel, CTA, Header), "sofort" → "nächstmöglichen Termin", Initiativbewerbung-Kasten, Button-Hover-Farben.

## live-2026-10-08-1632
- Promoted current src/ state to Live (feed: https://job.stiegelmeyer-group.com/feed/435055).
- Enthält: HowRyou-Logo (Live mit eigener SF-CDN-URL), mehrere Städte aus `<multilocation>`
  in Kachel und JSON-LD, einheitliche Schriften/Überschriften, geteilter Feed-Cache,
  CTA-Button einzeilig, Ablösung von benefits.js.
- Test war zum Zeitpunkt der Promotion auf demselben src/-Stand.

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
