// ============================================================================
// Stiegelmeyer Group – Job-Info-Kacheln (Unternehmen, Standort, Auslastung, Einstieg)
// ============================================================================
// Modul innerhalb des gebündelten plugin.js (siehe scripts/build.js).
//
// Einziger bewusster Kontaktpunkt zu den anderen Modulen: window.__sgFeedCache
// – ein reihenfolge-unabhängiger Cache, damit der XML-Feed pro Seitenaufruf
// nur einmal statt einmal je Modul geladen wird.
// ============================================================================
(function () {
  'use strict';
  if (window.__jobInfoPluginInitialized) return;
  window.__jobInfoPluginInitialized = true;

  var DEBUG_JOB = null; // z.B. "603-de_DE" zum Testen ohne passende URL
  var DEFAULT_FEED_ID = '__DEFAULT_FEED_ID__';
  var FEED_TIMEOUT_MS = 12000;
  var JOBINFO_STYLE_ID = 'jobinfodesign-style';
  var SCRIPT_ANCHOR = document.currentScript; // Positionierungsanker
  var ASSETS = 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/';
  // Kein eigenes Icon im Asset-Set für die Vertragsart -> Inline-SVG (Dokument),
  // gleiche Bildsprache (weißes Glyphen auf dem blauen Kreis) wie die anderen Icons.
  var CONTRACT_ICON = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff">' +
    '<path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V8h4.5L13 3.5zM8 13h8v1.5H8V13zm0 3.5h8V18H8v-1.5zm0-7h4V11H8V9.5z"/>' +
    '</svg>'
  );

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

  function findJobNode(xmlDoc, jobReqId) {
    var target = getNumericId(jobReqId);
    if (!target) return null;
    var jobs = xmlDoc.querySelectorAll('job');
    for (var i = 0; i < jobs.length; i++) {
      var idNode = jobs[i].querySelector('ID');
      if (idNode && getNumericId(idNode.textContent.trim()) === target) return jobs[i];
    }
    return null;
  }

  function text(node, sel) {
    var el = node.querySelector(sel);
    return el && el.textContent ? el.textContent.trim() : '';
  }

  function injectJobInfoStyles() {
    if (document.getElementById(JOBINFO_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = JOBINFO_STYLE_ID;
    style.textContent = `
    /* Gleiche Schrift wie header.js (CONFIG.font) – !important, da das SF-Theme sonst gewinnt. */
    body #sg-jobinfo-root, body #sg-jobinfo-root * { font-family:Arial, Helvetica, sans-serif !important; }
    .jobinfodesign-wrapper { width:100%; display:flex; justify-content:center; margin:40px 0 24px; }
    .jobinfodesign-inner { display:flex; gap:48px; padding:32px 48px; background:#ffffff; max-width:1200px; width:100%; box-sizing:border-box; justify-content:center; }
    .jobinfodesign-item { display:flex; flex-direction:column; min-width:150px; position:relative; align-items:center; text-align:center; }
    .jobinfodesign-item.company { min-width:150px; }
    .jobinfodesign-item:not(:last-child):after { content:''; position:absolute; top:8px; right:-20px; width:1px; height:calc(100% - 16px); background:#dbe3ea; }
    .jobinfodesign-icon { width:44px; height:44px; margin-bottom:10px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15)); background:#395366; border-radius:50%; padding:8px; box-sizing:border-box; }
    .jobinfodesign-label { font-size:13px; letter-spacing:.4px; text-transform:uppercase; font-weight:600; color:#395366; margin-bottom:4px; }
    .jobinfodesign-value { font-size:16px; font-weight:500; line-height:1.35; color:#22323f; word-break:break-word; }
    .jobinfodesign-companylogo { width:90px; max-width:130px; height:auto; object-fit:contain; margin-top:6px; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.12)); }
    @media (max-width: 1100px) { .jobinfodesign-inner { gap:40px; padding:30px 40px; } }
    @media (max-width: 980px) { .jobinfodesign-inner { gap:32px; padding:28px 36px; } .jobinfodesign-item { min-width:130px; } .jobinfodesign-item:not(:last-child):after { right:-16px; } }
    @media (max-width: 760px) {
      .jobinfodesign-inner { flex-wrap:wrap; gap:36px 56px; padding:26px 30px; border-radius:22px; }
      .jobinfodesign-item { flex:1 1 200px; min-width:0; }
      /* Vertikale Trenner entfernen, stattdessen horizontale Linien */
      .jobinfodesign-item:not(:last-child):after { display:none; }
      .jobinfodesign-item { border-bottom:1px solid #dbe3ea; padding-bottom:18px; }
      .jobinfodesign-item:last-child { border-bottom:none; }
    }
    @media (max-width: 520px) {
      .jobinfodesign-inner { gap:32px 32px; padding:22px 22px; }
      .jobinfodesign-icon { width:40px; height:40px; padding:6px; }
      .jobinfodesign-value { font-size:15px; }
      .jobinfodesign-item { border-bottom:1px solid #dbe3ea; padding-bottom:16px; }
      .jobinfodesign-item:last-child { border-bottom:none; }
    }
    `;
    document.head.appendChild(style);
  }

  // Feed <department> trägt die Vertragsart, z.B. "Unbefristeter Arbeitsvertrag",
  // "Befristeter Arbeitsvertrag" oder "Fixed Term Contract" (analog header.js
  // resolveContractWord). "unbefristet" zuerst prüfen, da "befristet" darin enthalten ist.
  function resolveContractType(department) {
    var d = (department || '').toLowerCase();
    if (d.indexOf('unbefristet') !== -1) return 'Unbefristet';
    if (d.indexOf('befristet') !== -1 || d.indexOf('fixed term') !== -1) return 'Befristet';
    return '';
  }

  async function fetchJobInfo(jobId) {
    var xmlDoc = await loadFeed(getFeedUrl());
    var job = findJobNode(xmlDoc, jobId);
    if (!job) return null;
    return {
      businessUnit: text(job, 'businessunit'),
      location: text(job, 'location'),
      shifttype: text(job, 'shifttype'),
      entryDate: text(job, 'customfield5'),
      contractType: resolveContractType(text(job, 'department'))
    };
  }

  // Gibt null zurück, wenn kein Wert vorhanden ist -> Kachel wird beim Aufbau
  // komplett übersprungen, statt einen Platzhalter ("-") anzuzeigen.
  function createItem(iconUrl, label, value, extraClass) {
    if (!value || !value.trim()) return null;
    var wrap = document.createElement('div');
    wrap.className = 'jobinfodesign-item ' + (extraClass || '');
    var icon = document.createElement('img');
    icon.src = iconUrl; icon.alt = ''; icon.className = 'jobinfodesign-icon';
    var l = document.createElement('div');
    l.className = 'jobinfodesign-label'; l.textContent = label;
    var v = document.createElement('div');
    v.className = 'jobinfodesign-value';
    v.textContent = value.trim();
    wrap.appendChild(icon); wrap.appendChild(l); wrap.appendChild(v);
    return wrap;
  }

  function buildJobInfoDOM(info) {
    var outer = document.createElement('div'); outer.className = 'jobinfodesign-wrapper'; outer.id = 'sg-jobinfo-root';
    var inner = document.createElement('div'); inner.className = 'jobinfodesign-inner';

    // Unternehmen: Icon + Label + markenabhängiges Logo
    var companyItem = document.createElement('div');
    companyItem.className = 'jobinfodesign-item company';
    var companyIcon = document.createElement('img');
    companyIcon.src = ASSETS + 'Icons/Jobs/Icon-Company.svg';
    companyIcon.alt = '';
    companyIcon.className = 'jobinfodesign-icon';
    var companyLabel = document.createElement('div');
    companyLabel.className = 'jobinfodesign-label';
    companyLabel.textContent = 'Unternehmen';

    var companyLogo = document.createElement('img');
    var bu = (info.businessUnit || '').toLowerCase();
    if (bu.indexOf('howryou') !== -1) {
      companyLogo.src = 'https://rmkcdn.successfactors.com/70ccb92e/61920400-cd1b-4fd3-9830-a.png';
      companyLogo.alt = 'HowRyou';
    } else if (bu.indexOf('burmeier') !== -1) {
      companyLogo.src = ASSETS + 'Images/burmeier.svg';
      companyLogo.alt = 'Burmeier';
    } else {
      companyLogo.src = ASSETS + 'Images/stiegelmeyer-logo.svg';
      companyLogo.alt = 'Stiegelmeyer';
    }
    companyLogo.className = 'jobinfodesign-companylogo';

    companyItem.appendChild(companyIcon);
    companyItem.appendChild(companyLabel);
    companyItem.appendChild(companyLogo);
    inner.appendChild(companyItem);

    [
      createItem(ASSETS + 'Icons/Jobs/Icon-Location.svg', 'Standort', info.location),
      createItem(ASSETS + 'Icons/Jobs/Icon-Workload.svg', 'Auslastung', info.shifttype),
      createItem(CONTRACT_ICON, 'Vertragsart', info.contractType),
      createItem(ASSETS + 'Icons/Jobs/Icon-EntryDate.svg', 'Einstiegsdatum', info.entryDate)
    ].forEach(function (item) { if (item) inner.appendChild(item); });

    outer.appendChild(inner);
    return outer;
  }

  // header.js baut #sg-header-root asynchron aus seinem eigenen Feed-Request.
  // Beide Module würden ohne diese Wartelogik gegen denselben Anker
  // (SCRIPT_ANCHOR / SCRIPT_EL, da im selben plugin.js-Bundle) um die
  // Einfügeposition konkurrieren – je nachdem, welcher fetch()/Parse-Vorgang
  // zuerst fertig ist, landen die Kacheln mal vor, mal nach den anderen
  // Blöcken. Fix: gezielt auf #sg-header-root warten und immer direkt danach
  // einfügen, statt auf das racende Script-Tag zu zielen.
  function waitForHeaderRoot(timeoutMs) {
    return new Promise(function (resolve) {
      var existing = document.getElementById('sg-header-root');
      if (existing) { resolve(existing); return; }
      var elapsed = 0;
      var interval = window.setInterval(function () {
        var el = document.getElementById('sg-header-root');
        elapsed += 50;
        if (el || elapsed >= timeoutMs) {
          window.clearInterval(interval);
          resolve(el);
        }
      }, 50);
    });
  }

  function placeJobInfo(wrapperNode, headerRoot) {
    if (headerRoot && headerRoot.parentNode) {
      headerRoot.parentNode.insertBefore(wrapperNode, headerRoot.nextSibling);
      return;
    }
    if (SCRIPT_ANCHOR && SCRIPT_ANCHOR.parentNode) {
      SCRIPT_ANCHOR.parentNode.insertBefore(wrapperNode, SCRIPT_ANCHOR);
      return;
    }
    document.body.appendChild(wrapperNode);
  }

  async function initJobInfoDesign() {
    injectJobInfoStyles();
    var jobId = DEBUG_JOB || getJobReqIdFromUrl();
    if (DEBUG_JOB) console.log('[JOBINFO] debug_job aktiv:', DEBUG_JOB);
    if (!jobId) return;
    try {
      var info = await fetchJobInfo(jobId);
      if (!info) return; // Job nicht im Feed -> nichts anzeigen
      var headerRoot = await waitForHeaderRoot(4000);
      placeJobInfo(buildJobInfoDOM(info), headerRoot);
    } catch (e) {
      if (window.console && console.warn) console.warn('[JOBINFO] Fehler beim Laden:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initJobInfoDesign);
  } else {
    initJobInfoDesign();
  }
})();
