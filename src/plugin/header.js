// ============================================================================
// Stiegelmeyer Group – Header-Plugin (Hero mit Job-Titel-Overlay + Sprechblase)
// ============================================================================
// Modul innerhalb des gebündelten plugin.js (siehe scripts/build.js). Feed-
// Werte sind Platzhalter-Tokens, die build.js je Umgebung (test/live) aus
// config/<env>.json einsetzt.
// ============================================================================
(() => {
  if (window.__sgHeaderPluginInitialized) return;
  window.__sgHeaderPluginInitialized = true;

  const SCRIPT_EL = document.currentScript;

  const DEFAULT_FEED_ID = '__DEFAULT_FEED_ID__';
  const FEED_TIMEOUT_MS = 12000;

  const CONFIG = {
    heroImageUrl: 'https://rmkcdn.successfactors.com/70ccb92e/8151d114-670e-4cd9-9de1-a.png',
    sfHeroSelector: '.large-image-component', // SF component to hide after we build our own header
    mobileBreakpoint: 768,
    blue: '#395366',
    yellow: '#F5C200',
    // The one typeface for everything the plugin renders (jobinfo.js uses the same stack).
    font: 'Arial, Helvetica, sans-serif',
    assets: 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/',
  };

  // Markenlogik analog zu jobinfo.js / seo.js — HowRyou hat keine eigene
  // Grafik und fällt wie überall sonst auf das Stiegelmeyer-Logo zurück.
  function resolveCompanyLogo(businessUnit) {
    const bu = (businessUnit || '').toLowerCase();
    return bu.includes('burmeier')
      ? { src: CONFIG.assets + 'Images/burmeier.svg', alt: 'Burmeier' }
      : { src: CONFIG.assets + 'Images/stiegelmeyer-logo.svg', alt: 'Stiegelmeyer' };
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  // Shared base for every block this module renders (all carry .sg-root):
  // one typeface, one body text size, and ONE section-heading style
  // (.sg-heading) — no matter whether the text is our own or cloned from the
  // feed / SF layout tokens. !important because SF's theme CSS would
  // otherwise win over these on the career site. Anchored on the root IDs
  // (`body #id`) so that even theme rules like `.jobdisplay h2 {…!important}`
  // are outranked by specificity, not just by load order.
  const ROOTS = 'body :is(#sg-header-root, #sg-body-root, #sg-benefits-root, #sg-cta-root)';
  function injectBaseStyle() {
    injectStyle('sg-base-style', `
      ${ROOTS}, ${ROOTS} * { font-family: ${CONFIG.font} !important; }
      .sg-root { font-size: 16px; line-height: 1.6; color: #22323f; }
      ${ROOTS} .sg-heading {
        display: block; font-size: 1.15em !important; font-weight: 700 !important; font-style: normal !important;
        line-height: 1.3 !important; letter-spacing: normal !important; text-transform: uppercase !important;
        text-align: left !important; color: ${CONFIG.blue} !important; -webkit-text-fill-color: ${CONFIG.blue} !important;
        background: none !important; margin: 0 0 14px !important; padding: 0 0 8px !important;
        border: 0 !important; border-bottom: 3px solid ${CONFIG.yellow} !important;
      }
      /* A heading that follows content needs air above it (first ones sit flush). */
      ${ROOTS} .sg-heading:not(:first-child) { margin-top: 28px !important; }
    `);
  }

  // Feed + SF rich text carries the editor's inline typography (Aptos,
  // Calibri, 11pt, <font face> …). Strip it from every cloned node so the
  // cloned text renders exactly like our own. Nested headings get the shared
  // heading style (pass headings=false where they'd sit on a dark/hero area).
  const FOREIGN_TYPE_PROPS = ['font', 'font-family', 'font-size', 'line-height', 'letter-spacing'];
  function cleanClone(el, headings = true) {
    const clone = el.cloneNode(true);
    const all = [clone, ...clone.querySelectorAll('*')];
    all.forEach(n => {
      if (n.style && n.style.length) {
        FOREIGN_TYPE_PROPS.forEach(prop => n.style.removeProperty(prop));
        if (!n.style.length) n.removeAttribute('style');
      }
      if (n.tagName === 'FONT') { n.removeAttribute('face'); n.removeAttribute('size'); }
      if (headings && /^H[1-6]$/.test(n.tagName)) n.classList.add('sg-heading');
    });
    return clone;
  }

  // Our own section heading (always <h2> for a consistent outline).
  const sgHeading = (text, extraClass = '') =>
    mk('h2', { className: ('sg-heading ' + extraClass).trim(), textContent: text });

  function getJobId() {
    try {
      const segments = new URL(window.location.href).pathname.split('/').filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d+(?:-[a-z]{2,3}(?:_[a-z]{2,4})+)?$/i.test(segments[i])) return segments[i];
      }
    } catch {}
    return null;
  }

  const numericId = id => (String(id || '').match(/^(\d+)/) || [])[1] || null;

  function nodeText(parent, sel) {
    const n = parent ? parent.querySelector(sel) : null;
    return n ? n.textContent.trim() : '';
  }

  function mk(tag, props = {}, children = []) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    children.forEach(c => el.appendChild(c));
    return el;
  }

  function insertBeforeScript(el) {
    if (SCRIPT_EL && SCRIPT_EL.parentNode) {
      SCRIPT_EL.parentNode.insertBefore(el, SCRIPT_EL);
    } else {
      document.body.appendChild(el);
    }
  }

  // Clone helpers shared by the body + CTA builders. Skip empty filler nodes
  // (e.g. "<p>&nbsp;</p>") that would otherwise render as orphaned gaps.
  const isBlank = el => !el.textContent.trim() && !el.querySelector('img');
  const appendClones = (parent, nodes) =>
    nodes.forEach(el => { if (!isBlank(el)) parent.appendChild(cleanClone(el)); });

  // Tag the equal-opportunity / diversity statement so CSS can highlight it.
  const markDiversity = container =>
    container.querySelectorAll('p').forEach(p => {
      if (/vielfalt|chancengleichheit|unabhängig von geschlecht/i.test(p.textContent)) p.classList.add('sg-note');
    });

  // ── Description block helpers (shared by feed + DOM-token parsing) ──────────

  const emptySections = () =>
    ({ intro: [], lead: [], aufgaben: [], profil: [], rest: [], cta: [], contact: [], body: [] });

  // Recursively flatten wrapper <div>/<section> layout containers so every
  // heading + its content become sibling blocks, regardless of nesting. Leaf
  // divs (inline content only) are kept as-is.
  const BLOCK_RE = /^(DIV|SECTION|ARTICLE|P|UL|OL|H[1-6]|TABLE)$/;
  function flattenBlocks(container) {
    const acc = [];
    for (const node of container.children) {
      if (/^(DIV|SECTION|ARTICLE)$/.test(node.tagName) &&
          Array.from(node.children).some(c => BLOCK_RE.test(c.tagName))) {
        acc.push(...flattenBlocks(node));
      } else {
        acc.push(node);
      }
    }
    return acc;
  }

  // A block is a section heading if it is a real <h1-6>, or a short <p> used in
  // place of a heading whose text matches a known section label (DE + EN).
  const SECTION_RE = /aufgab|herausforderung|t[äa]tigkeit|challeng|responsibilit|your role|profil|qualifik|qualific|anforderung|requirement|das bringen sie mit|what you bring|wir bieten|was wir bieten|benefits|what we offer|we offer|unsere leistungen/i;
  function headingOf(el) {
    if (/^H[1-6]$/.test(el.tagName)) return el.textContent.trim();
    if (el.tagName === 'P') {
      const t = el.textContent.trim();
      if (t && t.length <= 90 && SECTION_RE.test(t)) return t;
    }
    return null;
  }

  function classifyHeading(t) {
    if (/aufgab|herausforderung|t[äa]tigkeit|challeng|responsibilit|your role/i.test(t)) return 'aufgaben';
    if (/profil|qualifik|qualific|anforderung|requirement|das bringen sie mit|what you bring/i.test(t)) return 'profil';
    return 'rest'; // "Wir bieten", "Benefits", "What we offer", …
  }

  // ── SAP SuccessFactors layout tokens (preferred over feed parsing) ──────────
  // The job page exposes the description as three `.joblayouttoken` components
  // labelled "Kopfzeile / Stellenbeschreibung / Fußzeile der Stellenbeschreibung"
  // → header (company boilerplate), body (Aufgaben/Profil/…) and footer (CTA +
  // contact). Reading these is far more reliable than parsing the feed.

  function readLayoutTokens() {
    const tokens = Array.from(document.querySelectorAll('.joblayouttoken'));
    if (!tokens.length) return null;
    const labelOf = t => (t.querySelector('.joblayouttoken-label')?.textContent || '').trim();
    const contentOf = t => t.querySelector('[itemprop="description"]') || t.querySelector('.rtltextaligneligible') || t;

    let header = tokens.find(t => /kopfzeile/i.test(labelOf(t)));
    let footer = tokens.find(t => /fu[sß]zeile/i.test(labelOf(t)));
    let body = tokens.find(t => /stellenbeschreibung/i.test(labelOf(t)) && t !== header && t !== footer);
    // Fall back to document order if the labels don't match the expected text.
    if (!header && !body && !footer) [header, body, footer] = tokens;
    if (!header && !body && !footer) return null;

    return {
      header: header && contentOf(header),
      body: body && contentOf(body),
      footer: footer && contentOf(footer),
      elements: tokens,
    };
  }

  function sectionsFromTokens(tk) {
    const out = emptySections();

    // Header token → company boilerplate shown in the hero.
    if (tk.header) out.intro.push(...flattenBlocks(tk.header));

    // Body token → split into Aufgaben / Profil / rest by its headings.
    if (tk.body) {
      let state = 'lead';
      for (const node of flattenBlocks(tk.body)) {
        // A baked-in apply CTA belongs to the footer token, not the body.
        if (/Haben wir Ihr Interesse geweckt/i.test(node.textContent)) break;
        const h = headingOf(node);
        const dest = h ? (state = classifyHeading(h)) : state;
        out[dest].push(node);
        out.body.push(node);
      }
    }

    // Footer token → application CTA + contact (yellow box).
    if (tk.footer) {
      let state = 'cta';
      for (const node of flattenBlocks(tk.footer)) {
        if (state === 'cta' && /Ansprechpartner/i.test(node.textContent)) state = 'contact';
        out[state].push(node);
      }
    }
    return out;
  }

  // ── Header text helpers ──────────────────────────────────────────────────────

  const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

  // Feed <department> carries the contract type, e.g. "Unbefristeter Arbeitsvertrag",
  // "Befristeter Arbeitsvertrag" or "Fixed Term Contract". Returns the matching
  // adjective, or null when it can't be determined (e.g. "Berufsausbildung" / empty).
  function resolveContractWord(department) {
    const d = (department || '').toLowerCase();
    if (d.includes('unbefristet')) return 'unbefristeten';
    if (d.includes('befristet') || d.includes('fixed term')) return 'befristeten';
    return null;
  }

  // Feed <customfield5> is either "Ab sofort" (→ "nächstmöglichen Termin") or a
  // DD.MM.YYYY date (→ "01. September 2025").
  function formatEntryDate(raw) {
    const v = (raw || '').trim();
    if (!v || /ab sofort/i.test(v)) return 'nächstmöglichen Termin';
    const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (m) {
      const month = MONTHS_DE[Number(m[2]) - 1];
      if (month) return `${m[1].padStart(2, '0')}. ${month} ${m[3]}`;
    }
    return v; // unknown format → show as-is
  }

  // Composes the eyebrow line above the job title.
  function buildHeaderLead(department, entryDate) {
    const termin = formatEntryDate(entryDate);
    const word = resolveContractWord(department);
    return word
      ? `Zur ${word} Unterstützung unseres Teams suchen wir zum ${termin} einen`
      : `Zur Verstärkung unseres Teams suchen wir zum ${termin} einen`;
  }

  // ── Feed ───────────────────────────────────────────────────────────────────

  // Same feed source as jobinfo.js / seo.js: ?feedId=… overrides the default.
  function getFeedUrl() {
    let feedId = null;
    try { feedId = new URL(window.location.href).searchParams.get('feedId'); } catch {}
    if (!/^\d+$/.test(String(feedId || ''))) feedId = DEFAULT_FEED_ID;
    return '__FEED_BASE_URL__' + feedId;
  }

  // URL-keyed cache shared with the other modules → the feed is fetched once
  // per page load. A failed request is evicted so a later caller can retry.
  function loadFeed(url) {
    const cache = (window.__sgFeedCache = window.__sgFeedCache || {});
    if (!cache[url]) {
      cache[url] = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
        try {
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
          if (doc.querySelector('parsererror')) throw new Error('Feed-Antwort ist kein gültiges XML.');
          return doc;
        } finally {
          clearTimeout(timeoutId);
        }
      })();
      cache[url].catch(() => { delete cache[url]; });
    }
    return cache[url];
  }

  // Match on the numeric part only ("603-de_DE" ↔ "603"), like the other modules.
  function findJobNode(xmlDoc, jobId) {
    const target = numericId(jobId);
    if (!xmlDoc || !target) return null;
    for (const job of xmlDoc.querySelectorAll('job')) {
      const id = job.querySelector('ID');
      if (id && numericId(id.textContent.trim()) === target) return job;
    }
    return null;
  }

  // ── Description parser ─────────────────────────────────────────────────────
  // Splits the feed's description HTML into named sections.
  // Handles both <div><h3>Heading</h3>…</div> and bare <h2>Heading</h2>… patterns.

  function parseDescription(jobNode) {
    const descEl = jobNode.querySelector('description')
      || jobNode.querySelector('jobdescription')
      || jobNode.querySelector('body');
    if (!descEl) return null;

    // Parse into an inert document: unlike innerHTML on a live-document <div>,
    // this never loads images or fires inline handlers (e.g. <img onerror>).
    const temp = new DOMParser().parseFromString(descEl.textContent, 'text/html').body;
    const blocks = flattenBlocks(temp);

    const out = emptySections();
    let state = 'intro';

    blocks.forEach(node => {
      const text = node.textContent || '';
      let dest;

      // CTA / contact transitions take priority
      if (state !== 'cta' && state !== 'contact' && /Haben wir Ihr Interesse geweckt/i.test(text)) {
        state = dest = 'cta';
      } else if (state === 'cta' && /Ansprechpartner/i.test(text)) {
        state = dest = 'contact';
      } else if (state === 'cta' || state === 'contact') {
        dest = state;
      } else {
        const heading = headingOf(node);
        if (heading) {
          state = dest = classifyHeading(heading);
        } else {
          dest = state;
          // Only the very first paragraph (company boilerplate) belongs in the
          // header. Any further pre-heading paragraphs (e.g. "Position: …" and
          // the role description) move into the body lead.
          if (state === 'intro') state = 'lead';
        }
      }

      out[dest].push(node);
      // Document-ordered body (everything except the header intro and the
      // CTA/contact footer) — used by the fallback renderer.
      if (dest === 'lead' || dest === 'aufgaben' || dest === 'profil' || dest === 'rest') {
        out.body.push(node);
      }
    });

    return out;
  }

  // SF always renders a background-image component (a `[role="img"]` row with a
  // `.backgroundimage…` child). Read that image at runtime — wherever CSB put
  // the URL (generated class, inline style, ::before, or an inner <img>) — and
  // use it for the hero. Falls back to CONFIG.heroImageUrl when none is found.
  function findHeroImageUrl() {
    const urlFrom = (el, pseudo) => {
      const bg = el && getComputedStyle(el, pseudo).backgroundImage;
      const m = bg && bg.match(/url\(["']?([^"')]+)["']?\)/);
      return m ? m[1] : null;
    };
    const els = [
      document.querySelector('[class*="backgroundimage"]'),
      document.querySelector('[role="img"]'),
    ].filter(Boolean);
    for (const el of els) {
      const u = urlFrom(el, null) || urlFrom(el, '::before') || urlFrom(el, '::after');
      if (u) return u;
      const img = el.querySelector('img[src]');
      if (img) return img.src;
    }
    return null;
  }

  // ── 1. Header ──────────────────────────────────────────────────────────────
  // Full-bleed image with dark tint, bold title left, speech bubble right,
  // "Werden Sie ein Teil unseres Teams" + intro text at the bottom.

  function buildHeader(jobNode, introNodes) {
    if (document.getElementById('sg-header-root')) return;

    // Find SF's hero component — used both as insertion anchor and to hide it
    const sfHero = document.querySelector(CONFIG.sfHeroSelector);
    const sfHeroAnchor = sfHero
      ? (sfHero.closest('section, [class*="module"], [class*="component"]') || sfHero.parentElement)
      : null;

    if (sfHeroAnchor && sfHeroAnchor !== document.body) sfHeroAnchor.style.display = 'none';
    else if (sfHero) sfHero.style.display = 'none';

    injectStyle('sg-header-style', `
      .sg-header-root {
        position: relative;
        width: 100%;
        overflow: hidden;
        font-size: 16px;
      }
      /* Background image – fills the root container */
      .sg-header-bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
        display: block;
        z-index: 0;
      }
      /* Dark-blue tint over image */
      .sg-header-root::before {
        content: '';
        position: absolute;
        inset: 0;
        background: rgba(20, 42, 70, 0.72);
        z-index: 1;
      }
      /* Content sits relative so it defines the container height */
      .sg-header-content {
        position: relative;
        z-index: 2;
        min-height: 520px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 44px 52px 44px;
        box-sizing: border-box;
      }
      /* Top row: job title left + speech bubble right */
      .sg-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 40px;
        flex: 1;
      }
      .sg-header-left {
        flex: 1;
        min-width: 0;
      }
      /* Eyebrow line above the title (dynamic intro sentence from the feed) */
      .sg-header-eyebrow {
        margin: 0 0 14px;
        max-width: 720px;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        font-weight: 700;
        font-size: 1.5em; /* 24px on the 16px header base */
        line-height: 1.4;
      }
      .sg-header-title {
        margin: 0;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        font-weight: 800;
        font-size: 3.2em;
        line-height: 1.1;
        text-transform: uppercase;
        hyphens: auto;
        overflow-wrap: break-word;
      }
      /* Subtitle below the title ("für den Bereich …") */
      .sg-header-subtitle {
        margin: 16px 0 0;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        font-weight: 700;
        font-size: 1.5em;
        line-height: 1.2;
      }
      /* Speech bubble */
      .sg-header-bubble {
        position: relative;
        background: ${CONFIG.yellow};
        color: #162840;
        font-weight: 900;
        font-size: 2.7em;
        line-height: 1.05;
        padding: 30px 38px;
        border-radius: 22px 0 22px 0; /* top-left + bottom-right rounded */
        flex-shrink: 0;
        align-self: flex-start;
      }
      .sg-header-be { color: #fff !important; -webkit-text-fill-color: #fff; }
      /* Tail pointing down-left */
      .sg-header-bubble::after {
        content: '';
        position: absolute;
        bottom: -26px;
        left: 0;
        width: 0;
        height: 0;
        border-top: 26px solid ${CONFIG.yellow};
        border-right: 34px solid transparent;
      }
      /* Bottom section */
      .sg-header-bottom {
        text-align: center;
        padding-top: 32px;
        border-top: 1px solid rgba(255, 255, 255, 0.25);
        margin-top: 32px;
      }
      .sg-header-werden {
        margin: 0 0 12px;
        font-size: 1.5em;
        font-weight: 700;
        color: #fff;
      }
      .sg-header-intro {
        max-width: 880px;
        margin: 0 auto;
        font-size: 1em;
        line-height: 1.65;
        color: #fff;
      }
      .sg-header-intro p   { margin: 0 0 4px; color: #fff !important; }
      .sg-header-intro *   { color: #fff !important; -webkit-text-fill-color: #fff !important; }
      @media (max-width: ${CONFIG.mobileBreakpoint}px) {
        .sg-header-content  { min-height: 0; padding: 28px 20px 32px; }
        .sg-header-top      { flex-direction: column-reverse; gap: 16px; }
        .sg-header-eyebrow  { font-size: 1.2em; margin-bottom: 10px; }
        .sg-header-title    { font-size: 1.9em; }
        .sg-header-subtitle { font-size: 1.15em; margin-top: 12px; }
        .sg-header-bubble   { font-size: 1.8em; padding: 18px 22px; align-self: flex-end; border-radius: 16px 0 16px 0; }
        .sg-header-bubble::after { display: none; }
        .sg-header-werden   { font-size: 1.15em; }
        .sg-header-intro    { font-size: 0.9em; }
        .sg-header-bottom   { padding-top: 22px; margin-top: 22px; }
      }
    `);

    const title = jobNode ? (nodeText(jobNode, 'title') || 'Jobtitel') : 'Jobtitel';

    // Dynamic intro sentence + "für den Bereich …" line, both from the feed.
    const lead = buildHeaderLead(nodeText(jobNode, 'department'), nodeText(jobNode, 'customfield5'));
    const dept = nodeText(jobNode, 'dept');

    // Speech bubble: "BE PART OF THE SOLUTION" ("BE" in white)
    const bubble = document.createElement('div');
    bubble.className = 'sg-header-bubble';
    bubble.innerHTML = '<span class="sg-header-be">BE</span><br>PART OF<br>THE<br>SOLUTION';

    // Left column: eyebrow → title → optional subtitle
    const leftChildren = [
      mk('div', { className: 'sg-header-eyebrow', textContent: lead }),
      mk('h1', { className: 'sg-header-title', textContent: title }),
    ];
    if (dept) {
      leftChildren.push(mk('div', { className: 'sg-header-subtitle', textContent: `für den Bereich ${dept}` }));
    }

    // Top row
    const topRow = mk('div', { className: 'sg-header-top' }, [
      mk('div', { className: 'sg-header-left' }, leftChildren),
      bubble,
    ]);

    // Bottom: static heading + intro paragraphs from feed
    const introDiv = mk('div', { className: 'sg-header-intro' });
    if (introNodes && introNodes.length) {
      introNodes.forEach(n => introDiv.appendChild(cleanClone(n, false)));
    }

    const bottom = mk('div', { className: 'sg-header-bottom' }, [
      mk('p', { className: 'sg-header-werden', textContent: 'Werden Sie ein Teil unseres Teams' }),
      introDiv,
    ]);

    // Content layer (position: relative → defines the container height)
    const content = mk('div', { className: 'sg-header-content' }, [topRow, bottom]);

    // Root — prefer the SF background image, fall back to the configured PNG.
    const heroImageUrl = findHeroImageUrl() || CONFIG.heroImageUrl;
    const root = mk('div', { id: 'sg-header-root', className: 'sg-header-root sg-root' }, [
      mk('img', { className: 'sg-header-bg', src: heroImageUrl, alt: '' }),
      content,
    ]);

    // Insert before SF's hero component (so it ends up at the right position on the page).
    // Fall back to before SCRIPT_EL, then to prepend to <body>.
    if (sfHeroAnchor && sfHeroAnchor.parentNode) {
      sfHeroAnchor.parentNode.insertBefore(root, sfHeroAnchor);
    } else if (sfHero && sfHero.parentNode) {
      sfHero.parentNode.insertBefore(root, sfHero);
    } else if (SCRIPT_EL && SCRIPT_EL.parentNode) {
      SCRIPT_EL.parentNode.insertBefore(root, SCRIPT_EL);
    } else {
      document.body.insertAdjacentElement('afterbegin', root);
    }
  }

  // ── 2. Job Body (Stellenbeschreibung: Aufgaben / Profil / …) ───────────────

  function buildJobBody(jobNode, sections) {
    if (document.getElementById('sg-body-root')) return;
    if (!sections && jobNode) sections = parseDescription(jobNode);
    if (!sections) return;

    injectStyle('sg-body-style', `
      .sg-body-root        { margin: 0 0 32px; }
      .sg-lead             { margin: 0 0 8px; }
      .sg-lead p           { margin: 0 0 12px; line-height: 1.6; }
      .sg-lead strong      { color: ${CONFIG.blue}; }
      .sg-two-col          { display: flex; gap: 40px; width: 100%; box-sizing: border-box; margin: 32px 0; }
      .sg-col              { flex: 1 1 0; min-width: 0; }
      .sg-col ul,.sg-rest ul { margin: 10px 0 0; padding-left: 22px !important; list-style-position: outside !important; list-style-type: disc; }
      .sg-col li,.sg-rest li { margin-bottom: 6px; line-height: 1.6; padding-left: 4px; text-align: left; }
      .sg-col li p,.sg-rest li p { margin: 0; } /* some feeds wrap li text in <p> */
      /* Headings nested inside cloned column content duplicate our own → hide */
      .sg-col :is(h1,h2,h3,h4,h5,h6):not(.sg-col-heading) { display: none; }
      .sg-rest             { margin: 24px 0; }
      .sg-rest p,.sg-col p { margin: 12px 0 0; line-height: 1.6; }
      /* Only the diversity / equal-opportunity statement gets the callout box */
      .sg-rest p.sg-note,.sg-col p.sg-note { margin-top: 18px; background: #f1f5f8; border-left: 4px solid ${CONFIG.yellow}; padding: 16px 20px; border-radius: 6px; }
      @media (max-width: ${CONFIG.mobileBreakpoint}px) {
        .sg-two-col  { flex-direction: column; gap: 24px; }
      }
    `);

    const root = mk('div', { className: 'sg-body-root sg-root', id: 'sg-body-root' });

    // Lead (role intro): everything between the company boilerplate (header) and
    // the first heading. Shared by both layouts.
    const addLead = () => {
      if (!sections.lead || !sections.lead.length) return;
      const leadDiv = mk('div', { className: 'sg-lead' });
      // Drop the redundant "Position: <Titel>" line — already the hero title.
      appendClones(leadDiv, sections.lead.filter(el => !/^position\s*:/i.test(el.textContent.trim())));
      if (leadDiv.children.length) root.appendChild(leadDiv);
    };

    // Two-column layout only when we cleanly recognised BOTH Aufgaben and Profil.
    const recognized = sections.aufgaben.length && sections.profil.length;

    if (recognized) {
      addLead();

      // Real <h2> headings for SEO; drop the feed's own (duplicate) headings —
      // both real <h1-6> and short <p> pseudo-headings (via headingOf).
      const bodyOnly = nodes => nodes.filter(el => !headingOf(el));
      const leftCol = mk('div', { className: 'sg-col' }, [
        sgHeading('Ihre Aufgaben', 'sg-col-heading'),
      ]);
      appendClones(leftCol, bodyOnly(sections.aufgaben));
      const rightCol = mk('div', { className: 'sg-col' }, [
        sgHeading('Ihr Profil', 'sg-col-heading'),
      ]);
      appendClones(rightCol, bodyOnly(sections.profil));
      root.appendChild(mk('div', { className: 'sg-two-col' }, [leftCol, rightCol]));

      // Extra sections ("Wir bieten" etc.)
      if (sections.rest.length) {
        const restDiv = mk('div', { className: 'sg-rest' });
        sections.rest.forEach(el => {
          if (isBlank(el)) return;
          const h = headingOf(el);
          restDiv.appendChild(h ? sgHeading(h.replace(/[:\s]+$/, '')) : cleanClone(el));
        });
        markDiversity(restDiv);
        if (restDiv.children.length) root.appendChild(restDiv);
      }
    } else {
      // Fallback (body not split into Aufgaben/Profil): keep the two-column look.
      // Group the body into heading-led chunks and balance them across two
      // columns — never splitting a list — reusing the column + heading styling.
      const bodyNodes = sections.body.filter(el =>
        !isBlank(el) && !/^position\s*:/i.test(el.textContent.trim()));

      const chunks = [];
      bodyNodes.forEach(n => {
        if (!chunks.length || headingOf(n)) chunks.push([]);
        chunks[chunks.length - 1].push(n);
      });

      const renderCol = group => {
        const col = mk('div', { className: 'sg-col' });
        group.forEach(chunk => chunk.forEach(node => {
          const h = headingOf(node);
          col.appendChild(h
            ? sgHeading(h.replace(/[:\s]+$/, ''), 'sg-col-heading')
            : cleanClone(node));
        }));
        markDiversity(col);
        return col;
      };

      if (chunks.length >= 2) {
        // Balance the chunks across the two columns by their bullet weight.
        const weight = ch => ch.reduce((w, n) => w + (n.querySelectorAll('li').length || 1), 0);
        const a = [], b = []; let wa = 0, wb = 0;
        chunks.forEach(ch => { if (wa <= wb) { a.push(ch); wa += weight(ch); } else { b.push(ch); wb += weight(ch); } });
        root.appendChild(mk('div', { className: 'sg-two-col' }, [renderCol(a), renderCol(b)]));
      } else if (chunks.length === 1) {
        root.appendChild(renderCol(chunks)); // only one section → single column
      }
    }

    insertBeforeScript(root);
  }

  // ── CTA + contact (yellow box) — rendered last so it sits below Benefits ─────

  function buildCta(sections, businessUnit) {
    if (document.getElementById('sg-cta-root')) return;
    const ctaSection = sections ? sections.cta : [];
    const contactSection = sections ? sections.contact : [];
    // SF's native apply button (usually at the very bottom) — pull it into the box.
    const applyBtns = document.querySelectorAll('.applylink, .unify-apply-button');
    const applyBtn = applyBtns[applyBtns.length - 1] || null;
    if (!ctaSection.length && !contactSection.length && !applyBtn) return;

    injectStyle('sg-cta-style', `
      /* Two stacked rows: 1) heading + lead text, 2) a two-zone footer — the
         contact block on the left, a logo-over-apply-button action stack on
         the right, split by a single divider so nothing floats unanchored on
         the flat yellow field. */
      .sg-cta-box          { display:flex; flex-direction:column; background: ${CONFIG.yellow}; padding: 32px; border-radius: 6px; margin: 32px 0; box-sizing: border-box; }
      .sg-cta-box,.sg-cta-box * { color: ${CONFIG.blue} !important; -webkit-text-fill-color: ${CONFIG.blue} !important; }
      /* Shared .sg-heading style — only the rule turns blue, since a yellow
         rule would vanish on the yellow box. */
      body #sg-cta-root .sg-heading { border-bottom-color: ${CONFIG.blue} !important; }
      .sg-cta-content      { min-width:0; }
      .sg-cta-box p        { margin: 0 0 8px; line-height: 1.6; }
      /* Footer row: contact zone (flexible) + action zone (fixed), divided by
         a single rule instead of three equal-width columns with dead space
         between them. */
      .sg-cta-bottom       { display:flex; align-items:stretch; gap:40px; margin-top:28px; padding-top:26px; border-top:1px solid rgba(20,42,70,0.18); }
      /* Contact zone: a small uppercase label on its own line, then the photo
         and the name/detail stack side by side underneath it. */
      .sg-cta-contact      { flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:flex-start; text-align:left; }
      .sg-cta-contact-label { font-size:.8em; font-weight:700; letter-spacing:.4px; text-transform:uppercase; margin:0 0 14px !important; }
      .sg-cta-contact-row  { display:flex; align-items:flex-start; gap:18px; width:100%; }
      .sg-cta-contact-text { display:flex; flex-direction:column; min-width:0; }
      .sg-cta-contact-text p { margin: 0 0 3px; line-height: 1.5; }
      .sg-cta-contact-text p:empty { display:none; }
      .sg-cta-box a        { color: ${CONFIG.blue} !important; text-decoration: underline; }
      .sg-cta-box img:not(.sg-cta-logo) { border-radius: 50%; width: 80px !important; height: 80px !important; object-fit: cover; display: block; margin: 0; flex-shrink: 0; }
      .sg-cta-box strong   { font-size: 1.05em; }
      /* Action zone: logo on top, apply button below, right-aligned, set off
         from the contact zone by a vertical rule. */
      .sg-cta-action       { flex:0 0 auto; display:flex; flex-direction:column; align-items:flex-end; justify-content:space-between; gap:20px; padding-left:40px; border-left:1px solid rgba(20,42,70,0.18); }
      /* Company logo — white card echoing the same geometric shape (top-left +
         bottom-right rounded corners) used by the header speech bubble/button. */
      .sg-cta-logo         { width:130px; height:auto; object-fit:contain; background:#fff; border-radius:14px 0 14px 0; padding:18px 24px; box-sizing:border-box; box-shadow:0 6px 16px rgba(0,30,60,0.18); }
      /* SF apply button as a "speech bubble" — same shape as the header BE bubble. */
      .sg-cta-apply-col a,.sg-cta-apply-col button,.sg-cta-apply-col input { position:relative; display:inline-block; background:${CONFIG.blue} !important; color:#fff !important; -webkit-text-fill-color:#fff !important; border:0 !important; padding:18px 48px !important; border-radius:18px 0 18px 0 !important; font-weight:800 !important; font-size:1.2em !important; letter-spacing:.4px; text-transform:uppercase; text-decoration:none !important; cursor:pointer; box-shadow:0 6px 16px rgba(0,30,60,0.22); transition:transform .12s ease, box-shadow .12s ease; }
      .sg-cta-apply-col a::after,.sg-cta-apply-col button::after { content:''; position:absolute; bottom:-15px; left:0; width:0; height:0; border-top:15px solid ${CONFIG.blue}; border-right:22px solid transparent; }
      .sg-cta-apply-col a:hover,.sg-cta-apply-col button:hover { transform:translateY(-1px); box-shadow:0 9px 22px rgba(0,30,60,0.28); }
      @media (max-width: ${CONFIG.mobileBreakpoint}px) {
        .sg-cta-box  { padding: 20px 18px; }
        .sg-cta-bottom { flex-direction:column; gap:24px; margin-top:20px; padding-top:20px; }
        .sg-cta-contact { align-items:center; text-align:center; }
        .sg-cta-contact-label { text-align:center !important; }
        .sg-cta-contact-row { justify-content:center; }
        .sg-cta-contact-text, .sg-cta-contact-text * { text-align:left !important; }
        .sg-cta-action { flex-direction:column; align-items:center; border-left:0; padding-left:0; padding-top:24px; border-top:1px solid rgba(20,42,70,0.18); width:100%; }
        .sg-cta-apply-col a,.sg-cta-apply-col button,.sg-cta-apply-col input { width:100%; text-align:center; padding:16px 24px !important; }
        .sg-cta-logo { width:110px; padding:16px 20px; }
      }
    `);

    const box = mk('div', { className: 'sg-cta-box sg-root', id: 'sg-cta-root' });

    // Row 1 + 2: pull the standalone "Haben wir Ihr Interesse geweckt?" line out
    // as a real heading (SEO); the rest of the cta section is the lead text.
    let headingEl = null;
    const leadNodes = [];
    ctaSection.forEach(el => {
      if (isBlank(el)) return;
      const text = el.textContent.trim();
      if (!headingEl && /^Haben wir Ihr Interesse geweckt\s*\??\s*$/i.test(text)) {
        headingEl = sgHeading(text, 'sg-cta-heading');
      } else {
        leadNodes.push(el);
      }
    });

    if (headingEl) box.appendChild(headingEl);

    if (leadNodes.length) {
      const content = mk('div', { className: 'sg-cta-content' });
      leadNodes.forEach(el => content.appendChild(cleanClone(el)));
      box.appendChild(content);
    }

    // Footer row: contact zone + action zone (logo above apply button),
    // split by a single divider instead of three equal free-floating columns.
    if (contactSection.length || applyBtn) {
      const bottomRow = mk('div', { className: 'sg-cta-bottom' });

      const contactCol = mk('div', { className: 'sg-cta-contact' });
      const contactRow = mk('div', { className: 'sg-cta-contact-row' });
      const contactText = mk('div', { className: 'sg-cta-contact-text' });
      let labelDone = false;
      contactSection.forEach(el => {
        if (isBlank(el)) return;
        const clone = cleanClone(el);
        // Style the "Ihr Ansprechpartner" line as a small label instead of a
        // plain paragraph, for a cleaner, more legible column.
        if (!labelDone && /Ansprechpartner/i.test(clone.textContent)) {
          clone.classList.add('sg-cta-contact-label');
          labelDone = true;
          contactCol.appendChild(clone);
          return;
        }
        // The CMS content puts the photo and every text line (name, role,
        // phone, email) inside one single <p>, separated only by <br> — pull
        // the <img> out of that block so it can sit beside the text instead
        // of stacked above it inside the same paragraph.
        const img = clone.tagName === 'IMG' ? clone : clone.querySelector('img');
        if (img) {
          // A wrapper around the photo (e.g. a link) is dropped only if the
          // photo was all it held — otherwise it also carries name/phone/email.
          const parent = img.parentElement;
          const emptyWrapper = parent && parent !== clone && !parent.textContent.trim() ? parent : null;
          const next = (emptyWrapper || img).nextSibling;
          contactRow.appendChild(img);
          if (emptyWrapper) emptyWrapper.remove();
          if (next && next.nodeName === 'BR') next.remove();
          if (clone !== img && clone.textContent.trim()) contactText.appendChild(clone);
        } else {
          contactText.appendChild(clone);
        }
      });
      if (contactText.children.length) contactRow.appendChild(contactText);
      if (contactRow.children.length) contactCol.appendChild(contactRow);
      bottomRow.appendChild(contactCol);

      const actionCol = mk('div', { className: 'sg-cta-action' });
      const logo = resolveCompanyLogo(businessUnit);
      actionCol.appendChild(mk('img', { className: 'sg-cta-logo', src: logo.src, alt: logo.alt, loading: 'lazy' }));
      // Move (not clone) the real apply button so its SF apply behaviour stays intact.
      if (applyBtn) {
        const applyWrap = mk('div', { className: 'sg-cta-apply-col' });
        applyWrap.appendChild(applyBtn);
        actionCol.appendChild(applyWrap);
      }
      bottomRow.appendChild(actionCol);

      box.appendChild(bottomRow);
    }

    if (box.children.length) insertBeforeScript(box);
  }

  function hideSFContent(ourRoot) {
    // Find an element containing the intro text that is NOT inside any of our
    // own roots. The header clones the same intro text and sits higher in the
    // DOM, so checking only `ourRoot` (the body root) would match our own
    // clone first and leave SF's native description visible.
    const ourRoots = ['sg-header-root', 'sg-body-root', 'sg-benefits-root', 'sg-cta-root']
      .map(id => document.getElementById(id))
      .filter(Boolean);
    const isOurs = node => ourRoots.some(r => r.contains(node));

    const introEl = Array.from(document.querySelectorAll('p')).find(p =>
      /Wir lieben Betten|pflegebedürftigen Menschen/i.test(p.textContent) &&
      !isOurs(p)
    );
    if (!introEl) return;

    // Walk up to a sibling of ourRoot (same parent level)
    const targetParent = ourRoot.parentNode;
    let el = introEl;
    while (el && el.parentNode !== targetParent && el !== document.body) {
      el = el.parentNode;
    }
    if (el && el !== document.body && el !== ourRoot) {
      el.style.display = 'none';
    }
  }

  // ── 3. Benefits ────────────────────────────────────────────────────────────

  // Benefit-ID (customfield4, Test-IDs 36–90) → label + icon file. Labels carry soft hyphens
  // (­) for clean line breaks in the narrow tiles; no file → placeholder SVG.
  const BENEFIT_IMG = 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/';
  const BENEFITS = {
    36: ['Mitarbeiter­rabatte', 'Mitarbeiterrabatte.png'],
    37: ['Gesundheits­vorsorge', 'Gesundheitsvorsorge.png'],
    38: ['Modern ausgestattete Arbeitsplätze', 'ModArbeitsplaetze.png'],
    39: ['Betriebliche Altersvorsorge', 'BetrAltersvorsorge.png'],
    40: ['Remote Work möglich', 'Homeoffice.png'],
    41: ['30 Tage Urlaub', 'Urlaub.png'],
    42: ['29 Tage Urlaub', 'Urlaub.png'],
    56: ['Individuelle Weiterbildung', 'Weiterbildungsangebote.png'],
    76: ['Spannende Aufgaben, zukunftssicherer Arbeitsplatz', 'Studium-angepasst-Arbeitszeiten.png'],
    77: ['Jobrad', 'Jobrad-Leasing.png'],
    78: ['kostenlose Parkplätze', 'Parkplatz.png'],
    79: ['Barriere­freiheit', 'Barrierefrei.png'],
    80: ['Coaching /Mentoring', 'Coaching.png'],
    81: ['Familien­freundlichkeit', 'Familienfreundlich.png'],
    82: ['Firmen­eigene Kantine', 'Kantine.png'],
    83: ['Firmenwagen', 'Firmenwagen.png'],
    84: ['Fitnessraum für Mitarbeiter/­innen', 'Fitnessraum.png'],
    85: ['Flexible Arbeitszeit', 'FlexArbeitszeit.png'],
    86: ['Gute Verkehrsanbindung', 'GuteVerkehrsanbindung.png'],
    87: ['Mitgestaltungsmöglichkeiten', null],
    88: ['Attraktive Vergütung', 'verguetung.png'],
    89: ['Modernes IT-Equipment', 'ITequipment.png'],
    90: ['Mitarbeiter-­Events', 'Mitarbeiterevents.png'],
  };

  // The Live SF system still uses the older option IDs 8–30 (Test uses 36–90),
  // so map those onto the same entries. Same benefit → same object, so the
  // duplicate check below also catches an old and a new ID for one benefit.
  const LEGACY_BENEFIT_IDS = {
    8: 38, 9: 81, 10: 89, 11: 83, 12: 39, 13: 37, 14: 90, 15: 36, 16: 88, 17: 87, 18: 56,
    19: 82, 20: 41, 21: 86, 22: 84, 23: 79, 24: 77, 25: 42, 26: 40, 27: 80, 28: 76, 29: 85, 30: 78,
  };
  for (const [oldId, newId] of Object.entries(LEGACY_BENEFIT_IDS)) BENEFITS[oldId] = BENEFITS[newId];

  // Some feeds carry benefit names instead of IDs. Match those ignoring soft
  // hyphens, hyphens, whitespace and case ("Mitarbeiter-Events" = ID 90).
  const benefitKey = t => t.replace(/[­-]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const BENEFITS_BY_NAME = Object.fromEntries(Object.values(BENEFITS).map(b => [benefitKey(b[0]), b]));

  function benefitPlaceholderIcon() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '44'); svg.setAttribute('height', '44'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('sg-benefits-icon');
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '11'); circle.setAttribute('fill', '#eef3f7');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm14.85-9.6c.3-.3.3-.75 0-1.05l-2.45-2.45c-.3-.3-.75-.3-1.05 0l-1.6 1.6 3.75 3.75 1.35-1.85z');
    path.setAttribute('fill', CONFIG.blue);
    svg.append(circle, path);
    return svg;
  }

  function buildBenefits(jobNode) {
    if (document.getElementById('sg-benefits-root')) return;

    const raw = jobNode ? nodeText(jobNode, 'customfield4') : '';
    const tokens = raw.split(';').map(s => s.trim()).filter(Boolean);

    injectStyle('sg-benefits-style', `
      .sg-benefits-wrapper { width:100%; display:flex; flex-direction:column; align-items:center; margin:40px 0 24px; }
      .sg-benefits-heading { width:100%; }
      .sg-benefits-inner   { display:flex; flex-wrap:wrap; justify-content:center; gap:30px 20px; padding:32px 40px; background:#fff; border-radius:24px; max-width:1200px; width:100%; box-sizing:border-box; }
      .sg-benefits-item    { flex:0 0 120px; max-width:120px; display:flex; flex-direction:column; align-items:center; text-align:center; }
      .sg-benefits-icon    { width:90px;height:90px;margin-bottom:14px;object-fit:contain; }
      .sg-benefits-label   { font-size:15px;line-height:1.35;font-weight:500;color:#555;overflow-wrap:break-word;word-break:break-word;hyphens:auto;text-wrap:balance; }
      @supports not (text-wrap:balance) { .sg-benefits-label { line-height:1.25; } }
      @media (max-width:760px)  { .sg-benefits-inner{gap:24px 18px;padding:22px 24px;border-radius:20px} .sg-benefits-item{flex-basis:128px;max-width:128px} }
      @media (max-width:520px)  { .sg-benefits-inner{gap:20px 14px;padding:18px} .sg-benefits-item{flex-basis:118px;max-width:118px} .sg-benefits-icon{width:80px;height:80px} }
      @media (max-width:380px)  { .sg-benefits-inner{padding:14px 12px} .sg-benefits-item{flex-basis:104px;max-width:104px} }
    `);

    const inner = mk('div', { className: 'sg-benefits-inner' });
    const seen = new Set();
    tokens.forEach(token => {
      const benefit = /^\d+$/.test(token) ? BENEFITS[Number(token)] : BENEFITS_BY_NAME[benefitKey(token)];
      if (!benefit || seen.has(benefit)) return; // unknown ID/name or duplicate
      seen.add(benefit);
      const [label, file] = benefit;
      inner.appendChild(mk('div', { className: 'sg-benefits-item' }, [
        // Decorative icon (alt="") — the label below already names the benefit.
        file ? mk('img', { className: 'sg-benefits-icon', src: BENEFIT_IMG + file, alt: '', loading: 'lazy' })
             : benefitPlaceholderIcon(),
        mk('div', { className: 'sg-benefits-label', textContent: label }),
      ]));
    });

    // Don't render a bare "Unsere Benefits" heading over an empty box.
    if (!inner.children.length) return;

    insertBeforeScript(mk('div', { className: 'sg-benefits-wrapper sg-root', id: 'sg-benefits-root' }, [
      sgHeading('Unsere Benefits', 'sg-benefits-heading'),
      inner,
    ]));
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    injectBaseStyle();
    const jobId = getJobId();
    const xml = await loadFeed(getFeedUrl()).catch(() => null);
    const jobNode = findJobNode(xml, jobId);

    // Prefer the SF layout tokens (Kopfzeile / Stellenbeschreibung / Fußzeile)
    // on the page; fall back to parsing the feed's <description> if absent.
    const tokens = readLayoutTokens();
    const sections = tokens ? sectionsFromTokens(tokens)
                            : (jobNode ? parseDescription(jobNode) : null);

    buildHeader(jobNode, sections?.intro ?? []);
    buildJobBody(jobNode, sections);
    buildBenefits(jobNode);
    buildCta(sections, nodeText(jobNode, 'businessunit')); // last → sits below the Benefits section

    // Hide the SF-native description so it isn't shown twice.
    if (tokens) {
      tokens.elements.forEach(el => { el.style.display = 'none'; });
    } else {
      const bodyRoot = document.getElementById('sg-body-root');
      if (bodyRoot) hideSFContent(bodyRoot);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
