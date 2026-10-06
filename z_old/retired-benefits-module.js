// ============================================================================
// Stiegelmeyer Group – Benefits-Grid (liest die Benefit-IDs aus customfield4)
// ============================================================================
// Modul innerhalb des gebündelten plugin.js (siehe scripts/build.js).
//
// Einziger bewusster Kontaktpunkt zu den anderen Modulen: window.__sgFeedCache
// – ein reihenfolge-unabhängiger Cache, damit der XML-Feed pro Seitenaufruf
// nur einmal statt einmal je Modul geladen wird.
// ============================================================================
(function () {
  'use strict';
  if (window.__jobBenefitsPluginInitialized) return;
  window.__jobBenefitsPluginInitialized = true;

  var SCRIPT_EL = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var BENEFITS_ROOT = null;
  var DEFAULT_FEED_ID = '__DEFAULT_FEED_ID__';
  var FEED_TIMEOUT_MS = 12000;
  var IMG = 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/';

  function injectStyles() {
    var css = `
    .benefitsdesign-wrapper { width:100%; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-start; margin:40px 0 24px; }
    .benefitsdesign-inner { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:40px 56px; padding:32px 48px; background:#ffffff; border-radius:24px; max-width:1200px; width:100%; margin:0 auto; box-sizing:border-box; font-family:inherit; justify-items:center; justify-content:center; }
    .benefitsdesign-item { display:flex; flex-direction:column; position:relative; align-items:center; text-align:center; box-sizing:border-box; }
    .benefitsdesign-icon { width:44px; height:44px; margin-bottom:10px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15)); box-sizing:border-box; }
    .benefitsdesign-label { font-size:13px; letter-spacing:.4px; text-transform:uppercase; font-weight:600; color:#395366; margin-bottom:4px; white-space:normal; overflow-wrap:break-word; word-break:break-word; hyphens:auto; text-wrap:balance; }
    .benefitsdesign-value { font-size:16px; font-weight:500; line-height:1.35; color:#22323f; white-space:normal; overflow-wrap:break-word; word-break:break-word; hyphens:auto; }
    /* Fallback für Browser ohne text-wrap */
    @supports not (text-wrap:balance) {
        .benefitsdesign-label { line-height:1.25; }
    }
    @media (max-width: 1100px) { .benefitsdesign-inner { gap:40px 48px; padding:30px 40px; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); } }
    @media (max-width: 980px) { .benefitsdesign-inner { gap:36px 42px; padding:28px 36px; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); } }
    @media (max-width: 760px) { .benefitsdesign-inner { gap:28px 30px; padding:22px 24px; border-radius:20px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); } }
    @media (max-width: 600px) { .benefitsdesign-inner { gap:24px 26px; padding:20px 20px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); } }
    @media (max-width: 520px) { .benefitsdesign-inner { gap:22px 22px; padding:18px 18px; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); } .benefitsdesign-icon { width:40px; height:40px; } }
    @media (max-width: 440px) { .benefitsdesign-inner { gap:20px 20px; padding:16px 14px; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); } }
    @media (max-width: 380px) { .benefitsdesign-inner { gap:18px 18px; padding:14px 12px; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); } }
    @media (max-width: 330px) { .benefitsdesign-inner { gap:16px 16px; padding:12px 10px; grid-template-columns:repeat(1,1fr); } .benefitsdesign-item { width:100%; } }
    `;
    var styleEl = document.querySelector('style[data-benefits-style]');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.setAttribute('data-benefits-style', '');
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  // Benefit-ID (customfield4) -> Label + Icon.
  // Quelle der Wahrheit ist die SF-Auswahlliste "Benefits" (23 Werte).
  // Die ID ist deren Optionskennung ohne die führende 10: 1.024 -> 24.
  // Beim Ergänzen neuer Benefits immer dort nachsehen – eine hier falsch
  // belegte ID zeigt Bewerbern stillschweigend den falschen Benefit an.
  var benefitsConfig = {
    8:  { text: 'Modern ausgestattete Arbeitsplätze', img: IMG + 'ModArbeitsplaetze.png' },
    9:  { text: 'Familien­freundlichkeit',        img: IMG + 'Familienfreundlich.png' },
    10: { text: 'Modernes IT-Equipment',              img: IMG + 'ITequipment.png' },
    11: { text: 'Firmenwagen',                        img: IMG + 'Firmenwagen.png' },
    12: { text: 'Betriebliche Altersvorsorge',        img: IMG + 'BetrAltersvorsorge.png' },
    13: { text: 'Gesundheits­vorsorge',          img: IMG + 'Gesundheitsvorsorge.png' },
    14: { text: 'Mitarbeiter-­Events',           img: IMG + 'Mitarbeiterevents.png' },
    15: { text: 'Mitarbeiter­rabatte',           img: IMG + 'Mitarbeiterrabatte.png' },
    16: { text: 'Attraktive Vergütung',               img: IMG + 'verguetung.png' },
    17: { text: 'Mitgestaltungsmöglichkeiten',        img: null },
    18: { text: 'Individuelle Weiterbildung',         img: IMG + 'Weiterbildungsangebote.png' },
    19: { text: 'Firmen­eigene Kantine',         img: IMG + 'Kantine.png' },
    20: { text: '30 Tage Urlaub',                     img: IMG + 'Urlaub.png' },
    21: { text: 'Gute Verkehrsanbindung',             img: IMG + 'GuteVerkehrsanbindung.png' },
    22: { text: 'Fitnessraum für Mitarbeiter/­innen', img: IMG + 'Fitnessraum.png' },
    23: { text: 'Barriere­freiheit',             img: IMG + 'Barrierefrei.png' },
    24: { text: 'Jobrad',                             img: IMG + 'Jobrad-Leasing.png' },
    25: { text: '29 Tage Urlaub',                     img: IMG + 'Urlaub.png' },
    26: { text: 'Remote Work möglich',                img: IMG + 'Homeoffice.png' },
    27: { text: 'Coaching /Mentoring',                img: IMG + 'Coaching.png' },
    28: { text: 'Spannende Aufgaben, zukunftssicherer Arbeitsplatz', img: IMG + 'Studium-angepasst-Arbeitszeiten.png' },
    29: { text: 'Flexible Arbeitszeit',               img: IMG + 'FlexArbeitszeit.png' },
    30: { text: 'kostenloser Parkplatz',             img: IMG + 'Parkplatz.png' }
  };

  function loadFeed(url) {
    var cache = (window.__sgFeedCache = window.__sgFeedCache || {});
    if (!cache[url]) {
      cache[url] = (async function () {
        var controller = new AbortController();
        var timeoutId = window.setTimeout(function () { controller.abort(); }, FEED_TIMEOUT_MS);
        try {
          var res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          var doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
          if (doc.querySelector('parsererror')) throw new Error('Feed-Antwort ist kein gültiges XML.');
          return doc;
        } finally {
          window.clearTimeout(timeoutId);
        }
      })();
      cache[url]['catch'](function () { delete cache[url]; });
    }
    return cache[url];
  }

  function getFeedUrl() {
    var feedId = null;
    try { feedId = new URL(window.location.href).searchParams.get('feedId'); } catch (e) {}
    if (!feedId && SCRIPT_EL && SCRIPT_EL.dataset) feedId = SCRIPT_EL.dataset.feedId || null;
    if (!/^\d+$/.test(String(feedId || ''))) feedId = DEFAULT_FEED_ID;
    return '__FEED_BASE_URL__' + feedId;
  }

  function getJobReqIdFromUrl() {
    try {
      var segments = new URL(window.location.href).pathname.split('/').filter(Boolean);
      for (var i = segments.length - 1; i >= 0; i--) {
        if (/^\d+(?:-[a-z]{2,3}(?:_[a-z]{2,4})+)?$/i.test(segments[i])) return segments[i];
      }
    } catch (e) {}
    return null;
  }

  function getNumericId(id) {
    if (!id) return null;
    var m = String(id).match(/^(\d+)/);
    return m ? m[1] : null;
  }

  function findJobNodeById(xmlDoc, jobReqId) {
    var target = getNumericId(jobReqId);
    if (!target) return null;
    var jobs = xmlDoc.querySelectorAll('job');
    for (var i = 0; i < jobs.length; i++) {
      var idNode = jobs[i].querySelector('ID');
      if (idNode && getNumericId(idNode.textContent.trim()) === target) return jobs[i];
    }
    return null;
  }

  function ensureStructure() {
    if (!BENEFITS_ROOT) {
      if (!SCRIPT_EL || !SCRIPT_EL.parentNode) {
        BENEFITS_ROOT = document.body.appendChild(document.createElement('div'));
      } else {
        var maybeRoot = SCRIPT_EL.nextElementSibling;
        if (maybeRoot && maybeRoot.classList && maybeRoot.classList.contains('benefitsdesign-wrapper')) {
          BENEFITS_ROOT = maybeRoot;
        } else {
          BENEFITS_ROOT = document.createElement('div');
          SCRIPT_EL.parentNode.insertBefore(BENEFITS_ROOT, SCRIPT_EL.nextSibling);
        }
      }
    }
    BENEFITS_ROOT.textContent = '';
    BENEFITS_ROOT.className = 'benefitsdesign-wrapper';

    var title = document.createElement('h2');
    title.textContent = 'Unsere Benefits';
    BENEFITS_ROOT.appendChild(title);

    var inner = document.createElement('div');
    inner.className = 'benefitsdesign-inner';
    BENEFITS_ROOT.appendChild(inner);

    var errorDiv = document.createElement('div');
    errorDiv.className = 'benefitsdesign-error';
    errorDiv.style.width = '100%';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.marginTop = '12px';
    BENEFITS_ROOT.appendChild(errorDiv);
  }

  // Platzhalter-Icon für Benefits ohne eigenes Bild (z.B. ID 17)
  function createPlaceholderIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '44');
    svg.setAttribute('height', '44');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('benefitsdesign-icon');
    var circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12');
    circle.setAttribute('r', '11'); circle.setAttribute('fill', '#eef3f7');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm14.85-9.6c.3-.3.3-.75 0-1.05l-2.45-2.45c-.3-.3-.75-.3-1.05 0l-1.6 1.6 3.75 3.75 1.35-1.85z');
    path.setAttribute('fill', '#395366');
    svg.appendChild(circle); svg.appendChild(path);
    return svg;
  }

  function renderBenefitsList(benefitTokens) {
    var inner = BENEFITS_ROOT.querySelector('.benefitsdesign-inner');
    if (!inner) return 0;
    inner.textContent = '';

    var seen = {};
    var rendered = 0;

    benefitTokens.forEach(function (token) {
      var id = getNumericId(token);
      var cfg = id ? benefitsConfig[Number(id)] : null;
      if (!cfg) {
        // Kommt vor, wenn in SF eine Benefit-ID gepflegt ist, die es in der
        // Auswahlliste nicht (mehr) gibt -> bewusst überspringen.
        if (window.console && console.warn) console.warn('[BENEFITS] Unbekannte Benefit-ID im Feed:', token);
        return;
      }
      if (seen[id]) return;
      seen[id] = true;

      var item = document.createElement('div');
      item.className = 'benefitsdesign-item';

      var icon;
      if (cfg.img) {
        icon = document.createElement('img');
        icon.className = 'benefitsdesign-icon';
        icon.src = cfg.img;
        icon.alt = '';
        icon.loading = 'lazy';
      } else {
        icon = createPlaceholderIcon();
      }

      var label = document.createElement('div');
      label.className = 'benefitsdesign-label';
      label.textContent = cfg.text;

      item.appendChild(icon);
      item.appendChild(label);
      inner.appendChild(item);
      rendered++;
    });

    return rendered;
  }

  async function main() {
    ensureStructure();
    injectStyles();
    if (!BENEFITS_ROOT) return;

    var errorDiv = BENEFITS_ROOT.querySelector('.benefitsdesign-error');
    var fail = function (msg) { if (errorDiv) errorDiv.textContent = msg; };

    var jobReqId = getJobReqIdFromUrl();
    if (!jobReqId) { fail('Job-Req-ID konnte nicht aus der URL gelesen werden.'); return; }

    try {
      var xmlDoc = await loadFeed(getFeedUrl());
      var jobNode = findJobNodeById(xmlDoc, jobReqId);
      if (!jobNode) { fail('Benefits werden ergänzt'); return; }

      var cf4 = jobNode.querySelector('customfield4, customField4, customfield_4');
      if (!cf4 || !cf4.textContent.trim()) { fail('Keine Benefits für diesen Job hinterlegt.'); return; }

      var tokens = cf4.textContent.split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (renderBenefitsList(tokens) === 0) fail('Keine Benefits für diesen Job hinterlegt.');
    } catch (e) {
      // Bewusst kein e.message: der Feed-Cache kann von einem anderen Plugin
      // angelegt worden sein, dessen Fehlertexte technisch sind ("HTTP 500").
      // Details gehören in die Konsole, nicht auf die Seite.
      fail('Benefits konnten nicht geladen werden.');
      if (window.console && console.error) console.error('[BENEFITS] Fehler in main():', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }
})();
