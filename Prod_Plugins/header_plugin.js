<!--
  ============================================================================
  Stiegelmeyer Group – Job-Header – Hero-Bild, Titel-Overlay, Logo-Kreis
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
