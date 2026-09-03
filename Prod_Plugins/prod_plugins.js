<!--
  ============================================================================
  Stiegelmeyer Group – Custom Plugins für SF Recruiting Career Site Builder
  ============================================================================
  Drei eigenständige Plugins. Jeder der drei Script-Blöcke unten wird einzeln
  in ein CSB-Plugin-Feld kopiert (inklusive seiner script-Tags).

  Jeder Block ist vollständig gekapselt (IIFE) und teilt sich mit den anderen
  KEINE Funktionen oder Variablen. Die Platzierung der Plugins auf der Seite
  ist damit beliebig – vorher gewann bei gleichnamigen globalen Funktionen
  immer der zuletzt geladene Block.

  Einziger bewusster gemeinsamer Kontaktpunkt: window.__sgFeedCache. Der Cache
  ist reihenfolge-unabhängig (wer zuerst kommt, legt an) und spart pro
  Seitenaufruf zwei von drei Feed-Downloads. Jedes Plugin funktioniert auch
  allein, falls die anderen nicht geladen sind.
  ============================================================================
-->

<!-- ===== PLUGIN 1: Job-Header (Bild + Titel-Overlay + Logo-Kreis) ===== -->
<script>
(function () {
  'use strict';
  if (window.__jobHeaderPluginInitialized) return;
  window.__jobHeaderPluginInitialized = true;

  var DEFAULT_FEED_ID = '435055';
  var FEED_TIMEOUT_MS = 12000;

  // ---- Feed laden (geteilter, reihenfolge-unabhängiger Cache) --------------
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
      // Fehlschlag nicht dauerhaft cachen, damit ein späterer Aufruf neu lädt
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

  // ---- Job-Req-ID aus der URL (letztes passendes Pfadsegment) --------------
  // Live-URL: /job/<Slug>/603-de_DE/?feedId=435055
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

  // Feed-<ID> ist "603-de_DE"; numerisch vergleichen, damit ein abweichender
  // Locale-Suffix in der URL nicht zum Fehlschlag führt.
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

  async function fetchJobTitleAndBusinessUnit(jobId) {
    var xmlDoc = await loadFeed(getFeedUrl());
    var job = findJobNode(xmlDoc, jobId);
    if (!job) return null;
    return { jobTitle: text(job, 'title'), businessUnit: text(job, 'businessunit') };
  }

  function isBurmeier(businessUnit) {
    return !!businessUnit && businessUnit.toLowerCase().indexOf('burmeier') !== -1;
  }

  // rotate=true -> Ruhezustand des Kreises ist leicht gedreht/verkleinert.
  // Dieser Startwert muss mit dem mouseleave-Zielwert übereinstimmen, sonst
  // springt der Kreis nach dem ersten Hover in einen anderen Zustand.
  var CIRCLE_REST_TRANSFORM = 'rotate(15deg) scale(0.9)';

  function createLogoCircle(businessUnit, size, position, rotate) {
    var circle = document.createElement('div');
    circle.className = 'jobtitle-logo-circle';
    Object.assign(circle.style, {
      position: 'absolute',
      width: size + 'px',
      height: size + 'px',
      background: '#fff',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
      zIndex: '10',
      transform: rotate ? CIRCLE_REST_TRANSFORM : 'none'
    }, position);

    var burmeier = isBurmeier(businessUnit);
    var logo = document.createElement('img');
    logo.src = burmeier
      ? 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/burmeier.svg'
      : 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/stiegelmeyer-logo.svg';
    logo.alt = burmeier ? 'Burmeier Logo' : 'Stiegelmeyer Logo';
    Object.assign(logo.style, {
      width: '80%',
      height: '80%',
      objectFit: 'contain',
      transform: 'scale(0.9)'
    });
    circle.appendChild(logo);
    return circle;
  }

  function injectStyles() {
    var GLOBAL_H3_STYLE_ID = 'global-h3-style';
    if (!document.getElementById(GLOBAL_H3_STYLE_ID)) {
      var globalStyle = document.createElement('style');
      globalStyle.id = GLOBAL_H3_STYLE_ID;
      globalStyle.textContent = 'h3 { font-family: Arial, sans-serif !important; font-weight:300; font-size:1.5em; color:#ECECEC; }';
      document.head.appendChild(globalStyle);
    }

    var GLOBAL_P_STYLE_ID = 'global-p-style';
    if (!document.getElementById(GLOBAL_P_STYLE_ID)) {
      var pStyle = document.createElement('style');
      pStyle.id = GLOBAL_P_STYLE_ID;
      pStyle.textContent = `
        /* Einheitliche Typografie sitewide */
        p, p span, p a, p em, p strong, p b, p i, p u, p sup, p sub,
        li, li span, li a, li em, li strong, li b, li i, li u, li sup, li sub {
          font-family: Arial, sans-serif !important;
          font-weight: 200 !important;
          font-size: 16px !important;
        }
      `;
      document.head.appendChild(pStyle);
    }

    var LAYOUT_STYLE_ID = 'jobtitle-overlay-styles';
    if (!document.getElementById(LAYOUT_STYLE_ID)) {
      var styleEl = document.createElement('style');
      styleEl.id = LAYOUT_STYLE_ID;
      styleEl.textContent = `
        .jobtitle-layout-wrapper{display:flex;position:relative;width:100%;flex-wrap:nowrap;align-items:flex-start;overflow:visible;}
        .jobtitle-image{width:70%;flex:0 0 70%;position:relative;z-index:1;}
        .jobtitle-image img{display:block;width:100%;height:auto;}
        .jobtitle-overlay{
          position:absolute;
          right:0;
          top:50%;
          width:40%;
          background:#395366;
          z-index:2;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          justify-content:center;
          padding:24px;
          box-sizing:border-box;
          color:#fff;
          transform:translateY(-50%);
        }
        .jobtitle-title-row{display:flex;align-items:flex-start;gap:8px;width:100%;justify-content:flex-start;}
        .jobtitle-overlay h1{margin:0;font-family:Arial, sans-serif;font-weight:300;font-size:2em;line-height:1.15;text-transform:uppercase;color:#fff !important;text-align:left;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;text-wrap:balance;}
        @media (max-width:767px){
          .jobtitle-layout-wrapper{flex-direction:column;}
          .jobtitle-image,.jobtitle-overlay{position:static;transform:none;width:100%;flex:0 0 auto;margin-left:0;}
          .jobtitle-overlay{padding:20px;justify-content:flex-start;}
          .jobtitle-overlay h1{font-size:1.5em;line-height:1.2;}
        }
      `;
      document.head.appendChild(styleEl);
    }
  }

  function sameTitle(a, b) {
    var n = function (s) { return (s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    return !!n(a) && n(a) === n(b);
  }

  async function buildNewLayout() {
    injectStyles();

    var largeImage = document.querySelector('.large-image-component');
    if (!largeImage) return;

    // Mögliche Titelquellen, in dieser Reihenfolge:
    //   1. Feed (maßgeblich)
    //   2. ein serverseitig gerendertes h1, falls das CSB-Layout eines liefert
    //   3. <meta name="description"> – SF schreibt dort den reinen Jobtitel
    //      ("Ausbildung als Fachlagerist (m/w/d)"), ohne den Ballast aus <title>
    var existingH1 = document.querySelector('h1');
    var existingH1Text = existingH1 && existingH1.textContent ? existingH1.textContent.trim() : '';
    var metaEl = document.querySelector('meta[name="description"]');
    var metaTitle = metaEl && metaEl.content ? metaEl.content.trim() : '';

    var feedTitle = '';
    var businessUnit = '';
    var jobId = getJobReqIdFromUrl();

    if (jobId) {
      try {
        var result = await fetchJobTitleAndBusinessUnit(jobId);
        if (result) {
          feedTitle = result.jobTitle;
          businessUnit = result.businessUnit;
        }
      } catch (e) {
        if (window.console && console.warn) console.warn('[JOB HEADER] Feed nicht erreichbar:', e);
      }
    }

    var jobTitle = feedTitle || existingH1Text || metaTitle;
    // Ohne Titel gäbe es nur ein leeres Overlay – dann die Seite unverändert
    // lassen, statt ein halb aufgebautes Layout zu hinterlassen.
    if (!jobTitle) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'jobtitle-layout-wrapper';

    var overlay = document.createElement('div');
    overlay.className = 'jobtitle-overlay';

    var arrowImg = document.createElement('img');
    arrowImg.src = 'https://rmkcdn.successfactors.com/70ccb92e/3fbced59-6c09-4532-99f4-3.png';
    arrowImg.alt = '';
    arrowImg.style.width = '24px';
    arrowImg.style.height = 'auto';
    arrowImg.style.marginRight = '8px';
    arrowImg.style.display = 'inline-block';
    arrowImg.style.flexShrink = '0';
    arrowImg.style.alignSelf = 'flex-start';

    // Liefert das CSB-Layout den Jobtitel serverseitig als h1, dieses Element
    // übernehmen statt ein zweites zu erzeugen: appendChild verschiebt es ins
    // Overlay. Dann steht genau ein h1 im HTML – Crawler ohne JS finden es dort,
    // wo SF es gerendert hat, und der Nutzer sieht es trotzdem im Overlay.
    // Nur übernehmen, wenn es wirklich der Jobtitel ist: eine allgemeine
    // Seitenüberschrift ("Stellenangebote in der …") gehört nicht ins Overlay.
    var titleH1;
    if (existingH1 && (!feedTitle || sameTitle(existingH1Text, feedTitle))) {
      titleH1 = existingH1;
      // Text bewusst NICHT überschreiben: was der Server ausliefert, muss mit
      // dem übereinstimmen, was der Nutzer sieht.
    } else {
      titleH1 = document.createElement('h1');
      titleH1.textContent = jobTitle;
      if (existingH1 && existingH1.className) titleH1.className = existingH1.className;
    }

    var titleWrapper = document.createElement('div');
    titleWrapper.className = 'jobtitle-title-row';
    titleWrapper.appendChild(arrowImg);
    titleWrapper.appendChild(titleH1);
    overlay.appendChild(titleWrapper);

    var circleEl = null;
    function placeCircle() {
      if (circleEl && circleEl.parentNode) circleEl.parentNode.removeChild(circleEl);
      var isMobile = window.innerWidth < 768;

      if (isMobile) {
        var imageWidth = largeImage.offsetWidth || largeImage.clientWidth || 0;
        var circleSize = Math.min(100, Math.round(imageWidth * 0.15)) || 60;
        circleEl = createLogoCircle(businessUnit, circleSize, { top: '2%', right: '2%' }, false);
        largeImage.style.position = 'relative';
        largeImage.appendChild(circleEl);
        return;
      }

      var size = 140;
      var circleLeft = (largeImage.offsetWidth || 0) - Math.round(size / 2);
      circleEl = createLogoCircle(businessUnit, size, { top: '-42px', left: circleLeft + 'px', marginLeft: '-10%' }, true);
      wrapper.appendChild(circleEl);

      circleEl.style.transition = 'transform 0.3s, width 0.3s, height 0.3s';
      if (circleEl.firstChild) circleEl.firstChild.style.transition = 'transform 0.3s, width 0.3s, height 0.3s';

      circleEl.addEventListener('mouseenter', function () {
        circleEl.style.transform = 'rotate(0deg) scale(0.95)';
        circleEl.style.width = (size * 1.2) + 'px';
        circleEl.style.height = (size * 1.2) + 'px';
        if (circleEl.firstChild) circleEl.firstChild.style.transform = 'scale(1.05)';
      });
      circleEl.addEventListener('mouseleave', function () {
        circleEl.style.transform = CIRCLE_REST_TRANSFORM;
        circleEl.style.width = size + 'px';
        circleEl.style.height = size + 'px';
        if (circleEl.firstChild) circleEl.firstChild.style.transform = 'scale(1)';
      });
    }

    // Overlay-Höhe auf 80% der Bildhöhe begrenzen (Desktop); mobil frei wachsen
    function setOverlayHeight() {
      var isMobile = window.innerWidth < 768;
      if (isMobile) {
        overlay.style.height = '';
        overlay.style.maxHeight = '';
        overlay.style.minHeight = '';
        return;
      }
      var imgHeight = largeImage.offsetHeight;
      if (imgHeight > 0) {
        var overlayHeight = Math.round(imgHeight * 0.80);
        overlay.style.height = overlayHeight + 'px';
        overlay.style.maxHeight = overlayHeight + 'px';
        overlay.style.minHeight = overlayHeight + 'px';
      }
    }

    // Verkleinert die Schrift, bis der Titel ins Overlay passt.
    function fitOverlayTitle() {
      var csOverlay = getComputedStyle(overlay);
      var padTop = parseFloat(csOverlay.paddingTop) || 0;
      var padBottom = parseFloat(csOverlay.paddingBottom) || 0;
      var avail = overlay.clientHeight - padTop - padBottom;
      if (avail <= 0) return;

      // Inline-Größe zuerst löschen, sonst misst getComputedStyle die bereits
      // verkleinerte Größe und der Titel kann nie wieder größer werden.
      titleH1.style.fontSize = '';
      titleH1.style.whiteSpace = 'normal';
      titleH1.style.wordBreak = 'break-word';

      var fontPx = parseFloat(getComputedStyle(titleH1).fontSize) || 32;
      var minPx = window.innerWidth < 768 ? 16 : 18;
      var guard = 0;
      while (titleH1.scrollHeight > avail && fontPx > minPx && guard < 40) {
        fontPx -= 1;
        titleH1.style.fontSize = fontPx + 'px';
        guard++;
      }
    }

    largeImage.classList.add('jobtitle-image');
    largeImage.parentNode.insertBefore(wrapper, largeImage);
    wrapper.appendChild(largeImage);
    wrapper.appendChild(overlay);

    function recalc() {
      placeCircle();
      setOverlayHeight();
      fitOverlayTitle();
    }
    recalc();

    // Beim ersten Lauf ist das Bild oft noch nicht geladen -> offsetHeight 0
    // -> Overlay-Höhe bliebe ungesetzt. Nach dem Laden neu rechnen.
    var imgEl = largeImage.querySelector('img');
    if (imgEl && !imgEl.complete) imgEl.addEventListener('load', recalc, { once: true });

    window.addEventListener('resize', recalc);
  }

  function boot() {
    buildNewLayout()['catch'](function (e) {
      if (window.console && console.warn) console.warn('[JOB HEADER] Fehler:', e);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
</script>


<!-- ===== PLUGIN 2: Job-Info-Kacheln (Unternehmen / Standort / Auslastung / Einstieg) ===== -->
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


<!-- ===== PLUGIN 3: Benefits-Grid (liest Benefit-IDs aus customfield4) ===== -->
<script>
(function () {
  'use strict';
  if (window.__jobBenefitsPluginInitialized) return;
  window.__jobBenefitsPluginInitialized = true;

  var SCRIPT_EL = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();

  var BENEFITS_ROOT = null;
  var DEFAULT_FEED_ID = '435055';
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
    BENEFITS_ROOT.innerHTML = '';
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
    inner.innerHTML = '';

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
</script>
