<!--
  ============================================================================
  Stiegelmeyer Group – Job-Info-Kacheln – Unternehmen, Standort, Auslastung, Einstieg
  ============================================================================
  Eigenständiges Custom Plugin für den SF Recruiting Career Site Builder.
  Diesen kompletten Inhalt inklusive der script-Tags in das CSB-Plugin-Feld
  kopieren.

  Vollständig gekapselt (IIFE): teilt sich mit den anderen Plugins KEINE
  Funktionen oder Variablen. Die Platzierung im CSB ist deshalb beliebig.

  Einziger bewusster Kontaktpunkt: window.__sgFeedCache – ein reihenfolge-
  unabhängiger Cache, damit der XML-Feed pro Seitenaufruf nur einmal statt
  einmal je Plugin geladen wird. Läuft auch allein, ohne die anderen Plugins.
  ============================================================================
-->

<script>
(function () {
  'use strict';
  if (window.__jobInfoPluginInitialized) return;
  window.__jobInfoPluginInitialized = true;

  var DEBUG_JOB = null; // z.B. "603-de_DE" zum Testen ohne passende URL
  var DEFAULT_FEED_ID = '435055';
  var FEED_TIMEOUT_MS = 12000;
  var JOBINFO_STYLE_ID = 'jobinfodesign-style';
  var SCRIPT_ANCHOR = document.currentScript; // Positionierungsanker
  var ASSETS = 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/';

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
    return 'https://job.stiegelmeyer-group.com/feed/' + feedId;
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
    .jobinfodesign-wrapper { width:100%; display:flex; justify-content:center; margin:40px 0 24px; }
    .jobinfodesign-inner { display:flex; gap:48px; padding:32px 48px; background:#ffffff; max-width:1200px; width:100%; box-sizing:border-box; font-family:inherit; justify-content:center; }
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

  async function fetchJobInfo(jobId) {
    var xmlDoc = await loadFeed(getFeedUrl());
    var job = findJobNode(xmlDoc, jobId);
    if (!job) return null;
    return {
      businessUnit: text(job, 'businessunit'),
      location: text(job, 'location'),
      shifttype: text(job, 'shifttype'),
      entryDate: text(job, 'customfield5')
    };
  }

  function createItem(iconUrl, label, value, extraClass) {
    var wrap = document.createElement('div');
    wrap.className = 'jobinfodesign-item ' + (extraClass || '');
    var icon = document.createElement('img');
    icon.src = iconUrl; icon.alt = ''; icon.className = 'jobinfodesign-icon';
    var l = document.createElement('div');
    l.className = 'jobinfodesign-label'; l.textContent = label;
    var v = document.createElement('div');
    v.className = 'jobinfodesign-value';
    v.textContent = value && value.trim() !== '' ? value : '-';
    wrap.appendChild(icon); wrap.appendChild(l); wrap.appendChild(v);
    return wrap;
  }

  function buildJobInfoDOM(info) {
    var outer = document.createElement('div'); outer.className = 'jobinfodesign-wrapper';
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
    if (bu.indexOf('burmeier') !== -1) {
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

    inner.appendChild(createItem(ASSETS + 'Icons/Jobs/Icon-Location.svg', 'Standort', info.location));
    inner.appendChild(createItem(ASSETS + 'Icons/Jobs/Icon-Workload.svg', 'Auslastung', info.shifttype));
    inner.appendChild(createItem(ASSETS + 'Icons/Jobs/Icon-EntryDate.svg', 'Einstiegsdatum', info.entryDate));

    outer.appendChild(inner);
    return outer;
  }

  function placeJobInfo(wrapperNode) {
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
      placeJobInfo(buildJobInfoDOM(info));
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
</script>
