// ============================================================================
// SEO / Google for Jobs Plugin
// Erzeugt aus dem XML-Feed ein vollstaendiges, valides JSON-LD JobPosting und
// injiziert es in <head>. Neutralisiert zusaetzlich das unvollstaendige
// SuccessFactors-Microdata (itemtype=JobPosting mit nur einem itemprop) –
// aber ERST nachdem valides JSON-LD erzeugt wurde, damit die Seite bei einem
// Feed-Ausfall nie schlechter dasteht als vorher.
//
// Eigenständige Datei (nicht Teil von plugin.js), da sie unabhängig von den
// UI-Plugins arbeitet. Feed-Werte sind Platzhalter-Tokens, die build.js je
// Umgebung (test/live) aus config/<env>.json einsetzt.
// ============================================================================
(function () {
  'use strict';
  if (window.__jobPostingSeoPluginInitialized) return;
  window.__jobPostingSeoPluginInitialized = true;

  var DEFAULT_FEED_ID = '__DEFAULT_FEED_ID__';
  var JSONLD_SCRIPT_ID = 'seo-jobposting-jsonld';
  var FEED_TIMEOUT_MS = 12000;

  // Orte, die im Feed als "Stadt" stehen, aber KEINE echte Stadt sind.
  // Diese Stellen werden als ortsungebunden (TELECOMMUTE) behandelt, damit
  // Google for Jobs keinen erfundenen Ort anzeigt.
  var PLACEHOLDER_LOCATIONS = [
    'aussendienst', 'homeoffice', 'home office', 'home-office', 'remote',
    'mobiles arbeiten', 'deutschlandweit', 'bundesweit', 'ortsunabhaengig'
  ];

  var COUNTRY_NAMES = { DE: 'Germany', AT: 'Austria', CH: 'Switzerland' };

  // Vollstaendige Anschriften der Standorte. Der Feed liefert weder
  // streetAddress noch postalCode, deshalb werden sie hier ueber die Stadt
  // (normalisiert, siehe normalizeLoose) nachgeschlagen.
  var SITE_ADDRESSES = {
    herford: {
      streetAddress: 'Ackerstraße 42',
      postalCode: '32051',
      addressLocality: 'Herford',
      addressRegion: 'Nordrhein-Westfalen'
    },
    nordhausen: {
      streetAddress: 'Herforder Str. 2',
      postalCode: '99734',
      addressLocality: 'Nordhausen',
      addressRegion: 'Thüringen'
    },
    hiddenhausen: {
      streetAddress: 'Industriestraße 53',
      postalCode: '32120',
      addressLocality: 'Hiddenhausen',
      addressRegion: 'Nordrhein-Westfalen'
    }
  };

  // ---- Firmen-/Markenlogik (analog zu den anderen Plugins) -----------------
  function resolveOrganization(businessUnit) {
    var bu = (businessUnit || '').toLowerCase();
    if (bu.indexOf('howryou') !== -1) {
      return {
        name: 'HowRyou',
        url: 'https://www.stiegelmeyer-group.com',
        logo: 'https://rmkcdn.successfactors.com/70ccb92e/61920400-cd1b-4fd3-9830-a.png'
      };
    }
    if (bu.indexOf('burmeier') !== -1) {
      return {
        name: 'Burmeier GmbH & Co. KG',
        url: 'https://www.burmeier.com',
        logo: 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/burmeier.svg'
      };
    }
    return {
      name: 'Stiegelmeyer GmbH & Co. KG',
      url: 'https://www.stiegelmeyer-group.com',
      logo: 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/stiegelmeyer-logo.svg'
    };
  }

  // ---- Job-Req-ID aus der URL lesen (robust, segmentbasiert) ---------------
  function getJobReqIdFromUrl() {
    try {
      var parsed = new URL(window.location.href);
      var segments = parsed.pathname.split('/').filter(Boolean);
      return segments.find(function (s) {
        return /^\d+(?:-[a-z]{2,3}(?:_[a-z]{2,4})+)?$/i.test(s);
      }) || null;
    } catch (e) {
      return null;
    }
  }

  // ---- Kanonische URL ------------------------------------------------------
  // Die aufgerufene URL enthaelt einen Orts-/Regions-Praefix im Slug
  // ("/job/Nordhausen-Mitarbeiter-.../617-de_DE"), die von SuccessFactors
  // gesetzte Canonical aber nicht ("/job/Mitarbeiter-.../617-de_DE/").
  // Fuer JSON-LD immer die Canonical verwenden, damit url und Canonical
  // uebereinstimmen.
  function getCanonicalUrl() {
    try {
      var link = document.querySelector('link[rel="canonical"]');
      var href = link && link.getAttribute('href');
      if (href) return new URL(href, window.location.href).href;
    } catch (e) { /* faellt unten auf die aktuelle URL zurueck */ }
    return window.location.href.split('#')[0];
  }

  function getNumericId(id) {
    if (!id) return null;
    var m = String(id).match(/^(\d+)/);
    return m ? m[1] : null;
  }

  function getFeedUrl() {
    var feedId = null;
    try {
      feedId = new URL(window.location.href).searchParams.get('feedId');
    } catch (e) {}
    if (!/^\d+$/.test(String(feedId || ''))) feedId = DEFAULT_FEED_ID;
    return '__FEED_BASE_URL__' + feedId;
  }

  // ---- Feld-Helfer ---------------------------------------------------------
  function text(node, sel) {
    var el = node.querySelector(sel);
    return el && el.textContent ? el.textContent.trim() : '';
  }

  // Normalisiert Umlaute/ß fuer robuste Platzhalter-Vergleiche
  function normalizeLoose(str) {
    return (str || '')
      .toLowerCase()
      .replace(/ß/g, 'ss')  // ß -> ss
      .replace(/ä/g, 'ae')  // ä
      .replace(/ö/g, 'oe')  // ö
      .replace(/ü/g, 'ue')  // ü
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isPlaceholderLocation(city) {
    var n = normalizeLoose(city);
    if (!n) return false;
    return PLACEHOLDER_LOCATIONS.indexOf(n) !== -1;
  }

  // <created> Format: "Wed, 11 02 2026 00:00:00 GMT" -> "2026-02-11"
  function parseDatePosted(created) {
    if (!created) return null;
    var m = created.match(/,\s*(\d{1,2})\s+(\d{1,2})\s+(\d{4})/);
    if (!m) return null;
    var month = parseInt(m[2], 10);
    var day = parseInt(m[1], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }

  // Eintrittsdatum (customfield5) -> schema.org.
  // Der Feed liefert entweder ein Datum ("01.09.2026") oder den Text "sofort".
  // jobStartDate erwartet ein echtes Datum, fuer "sofort" gibt es die eigene
  // Property jobImmediateStart (Boolean). Beides sauber getrennt ausgeben.
  function buildStartDateFields(cf5) {
    var raw = (cf5 || '').trim();
    if (!raw) return {};

    if (normalizeLoose(raw).indexOf('sofort') !== -1) {
      return { jobImmediateStart: true };
    }

    // TT.MM.JJJJ
    var m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      var day = parseInt(m[1], 10);
      var month = parseInt(m[2], 10);
      if (month < 1 || month > 12 || day < 1 || day > 31) return {};
      return {
        jobStartDate: m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2)
      };
    }

    // Bereits ISO (JJJJ-MM-TT)
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { jobStartDate: raw };

    // Alles andere (z.B. "nach Vereinbarung") ist kein Datum -> weglassen.
    return {};
  }

  // shifttype/department/title -> Google employmentType (Array)
  function mapEmploymentType(shifttype, department, title) {
    var types = [];
    var s = (shifttype || '').toLowerCase();
    if (s.indexOf('vollzeit') !== -1) types.push('FULL_TIME');
    if (s.indexOf('teilzeit') !== -1) types.push('PART_TIME');

    var ctx = ((department || '') + ' ' + (title || '')).toLowerCase();
    if (ctx.indexOf('ausbildung') !== -1 ||
        ctx.indexOf('praktik') !== -1 ||
        ctx.indexOf('duales studium') !== -1 ||
        ctx.indexOf('werkstudent') !== -1) {
      types.push('INTERN');
    }

    var dep = (department || '').toLowerCase();
    // "befristet" ja, "unbefristet" nein
    if (dep.indexOf('befristet') !== -1 && dep.indexOf('unbefristet') === -1) {
      types.push('TEMPORARY');
    }

    if (!types.length) types.push('FULL_TIME');
    // Duplikate entfernen
    return types.filter(function (t, i) { return types.indexOf(t) === i; });
  }

  // Bereinigt die Region aus customfield2, z.B. "Region Baden-Wuerttemberg"
  // -> "Baden-Wuerttemberg" (sauber geocodierbar).
  function cleanRegion(cf2) {
    var r = (cf2 || '').replace(/\s+/g, ' ').trim();
    r = r.replace(/^(region|gebiet|vertriebsgebiet|verkaufsgebiet|plz-gebiet)\s+/i, '');
    return r.trim();
  }

  // Mehrere Orte stehen getrennt (; | , Zeilenumbruch) in <multilocation>.
  // Reine Laendercodes ("DE" aus "Herford, DE") werden verworfen.
  function parseLocations(job) {
    var raw = text(job, 'multilocation') || text(job, 'location') || text(job, 'city');
    var seen = {};
    return raw.split(/[;|,\r\n]+/).map(function (s) { return s.trim(); }).filter(function (s) {
      if (!s || /^[A-Z]{2}$/.test(s)) return false;
      var key = normalizeLoose(s);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  // Baut die orts-bezogenen Felder. Drei Faelle:
  // 1) Aussendienst MIT Region (customfield2): physische jobLocation mit
  //    addressRegion (nur addressCountry ist bei Google Pflicht) -> zeigt die
  //    Region, garantiert valide, kein fragiles applicantLocationRequirements.
  // 2) Aussendienst OHNE Region (nur Platzhalter-Stadt wie "Homeoffice"):
  //    ortsungebunden -> jobLocationType TELECOMMUTE + Country (Googles Beispiel).
  // 3) Normale Stelle: echte jobLocation mit addressLocality; bei mehreren
  //    Orten ein Array mit je einer Place.
  function buildLocationFields(job) {
    var state = text(job, 'state');
    var postalcode = text(job, 'postalcode');
    var country = text(job, 'country') || 'DE';
    var countryName = COUNTRY_NAMES[country.toUpperCase()] || country;
    var region = cleanRegion(text(job, 'customfield2'));
    var cities = parseLocations(job).filter(function (c) { return !isPlaceholderLocation(c); });

    // Fall 1: Region vorhanden -> physische Region-Location
    if (region) {
      return {
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressRegion: region,
            addressCountry: country
          }
        }
      };
    }

    // Fall 2: nur Platzhalter bzw. kein Ort -> ortsungebunden (TELECOMMUTE)
    if (!cities.length) {
      return {
        jobLocationType: 'TELECOMMUTE',
        applicantLocationRequirements: { '@type': 'Country', name: countryName }
      };
    }

    // Fall 3: normale Stelle mit echten Orten.
    // Der Feed liefert nur die Stadt – Strasse/PLZ/Bundesland kommen aus der
    // Standort-Tabelle. Feed-Werte (state/postalcode) gelten nur bei genau
    // einem Ort und haben dann Vorrang.
    var single = cities.length === 1;
    var places = cities.map(function (city) {
      var site = SITE_ADDRESSES[normalizeLoose(city)] || null;
      var address = { '@type': 'PostalAddress', addressCountry: country };

      if (site && site.streetAddress) address.streetAddress = site.streetAddress;
      address.addressLocality = site ? site.addressLocality : city;
      address.addressRegion = (single && state) || (site ? site.addressRegion : '');
      address.postalCode = (single && postalcode) || (site ? site.postalCode : '');

      if (!address.addressRegion) delete address.addressRegion;
      if (!address.postalCode) delete address.postalCode;

      return { '@type': 'Place', address: address };
    });

    return { jobLocation: single ? places[0] : places };
  }

  // ---- JSON-LD bauen -------------------------------------------------------
  // Gibt null zurueck, wenn Pflichtfelder fehlen (dann wird nichts injiziert).
  function buildJsonLd(job) {
    var title = text(job, 'title');
    var description = text(job, 'description'); // enthaelt HTML (von Google erlaubt)
    if (!title || !description) return null;

    var businessUnit = text(job, 'businessunit');
    var datePosted = parseDatePosted(text(job, 'created'));
    var reqId = text(job, 'ID');
    var org = resolveOrganization(businessUnit);

    var data = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: title,
      description: description,
      employmentType: mapEmploymentType(text(job, 'shifttype'), text(job, 'department'), title),
      hiringOrganization: {
        '@type': 'Organization',
        name: org.name,
        sameAs: org.url,
        logo: org.logo
      }
    };

    var loc = buildLocationFields(job);
    for (var k in loc) { if (loc.hasOwnProperty(k)) data[k] = loc[k]; }

    var start = buildStartDateFields(text(job, 'customfield5'));
    for (var s in start) { if (start.hasOwnProperty(s)) data[s] = start[s]; }

    if (datePosted) data.datePosted = datePosted;
    if (reqId) {
      data.identifier = { '@type': 'PropertyValue', name: org.name, value: reqId };
    }
    data.url = getCanonicalUrl();

    return data;
  }

  // JSON serialisieren und HTML-kritische Zeichen escapen (kein Script-Tag-Ausbruch)
  function serializeJsonLd(data) {
    return JSON.stringify(data)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  // ---- Unvollstaendiges SuccessFactors-Microdata neutralisieren ------------
  function neutralizeBrokenMicrodata() {
    try {
      var shells = document.querySelectorAll('[itemtype*="schema.org/JobPosting"]');
      shells.forEach(function (shell) {
        shell.removeAttribute('itemscope');
        shell.removeAttribute('itemtype');
        shell.querySelectorAll('[itemprop]').forEach(function (p) {
          p.removeAttribute('itemprop');
        });
      });
    } catch (e) { /* nie die Seite blockieren */ }
  }

  function injectJsonLd(data) {
    var existing = document.getElementById(JSONLD_SCRIPT_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSONLD_SCRIPT_ID;
    script.textContent = serializeJsonLd(data);
    (document.head || document.documentElement).appendChild(script);
  }

  // ---- Feed laden (mit Timeout) --------------------------------------------
  // Teilt sich window.__sgFeedCache mit plugin.js (gleiche Seite, gleiche
  // Feed-URL) -> der Feed wird pro Seitenaufruf nur einmal geladen.
  function fetchFeed(url) {
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

  function findJobNode(xmlDoc, jobReqId) {
    var targetNumeric = getNumericId(jobReqId);
    if (!targetNumeric) return null;
    var jobs = xmlDoc.querySelectorAll('job');
    for (var i = 0; i < jobs.length; i++) {
      var idNode = jobs[i].querySelector('ID');
      if (idNode && getNumericId(idNode.textContent.trim()) === targetNumeric) {
        return jobs[i];
      }
    }
    return null;
  }

  // ---- Ablauf --------------------------------------------------------------
  async function init() {
    try {
      var jobReqId = getJobReqIdFromUrl();
      if (!jobReqId) return;

      var xmlDoc = await fetchFeed(getFeedUrl());
      var jobNode = findJobNode(xmlDoc, jobReqId);
      if (!jobNode) return;

      var data = buildJsonLd(jobNode);
      if (!data) return;

      // Reihenfolge wichtig: erst valides JSON-LD einspielen,
      // dann das kaputte Microdata entfernen.
      injectJsonLd(data);
      neutralizeBrokenMicrodata();
    } catch (e) {
      if (window.console && console.warn) console.warn('[SEO JobPosting] Fehler:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
