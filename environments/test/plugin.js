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

  const CONFIG = {
    feedUrl: 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205',
    heroImageUrl: 'https://rmkcdn.successfactors.com/70ccb92e/8151d114-670e-4cd9-9de1-a.png',
    sfHeroSelector: '.large-image-component', // SF component to hide after we build our own header
    mobileBreakpoint: 768,
    blue: '#395366',
    yellow: '#F5C200',
  };

  // ── Utilities ──────────────────────────────────────────────────────────────

  function injectStyle(id, css) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }

  function getJobId() {
    try {
      const { pathname } = new URL(window.location.href);
      const m = pathname.match(/\/(\d+-[a-z]{2}_[A-Z]{2})\/?$/);
      return m ? m[1] : null;
    } catch { return null; }
  }

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
    nodes.forEach(el => { if (!isBlank(el)) parent.appendChild(el.cloneNode(true)); });

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

  let _feedPromise = null;

  function getFeed() {
    if (!_feedPromise) {
      _feedPromise = fetch(CONFIG.feedUrl, { cache: 'no-store' })
        .then(r => { if (!r.ok) throw new Error(`Feed HTTP ${r.status}`); return r.text(); })
        .then(xml => {
          const doc = new DOMParser().parseFromString(xml, 'application/xml');
          if (doc.querySelector('parsererror')) throw new Error('Feed XML parse error');
          return doc;
        });
    }
    return _feedPromise;
  }

  function findJobNode(xmlDoc, jobId) {
    if (!xmlDoc || !jobId) return null;
    for (const job of xmlDoc.querySelectorAll('job')) {
      const id = job.querySelector('ID');
      if (id && id.textContent.trim() === jobId) return job;
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

    const temp = document.createElement('div');
    temp.innerHTML = descEl.textContent;
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
        font-family: Arial, sans-serif;
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
        align-items: flex-start;
        gap: 40px;
        flex: 1;
        align-items: center;
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
        font-family: Arial, sans-serif;
        font-weight: 700;
        font-size: 1.5em; /* 24px on the 16px header base */
        line-height: 1.4;
      }
      .sg-header-title {
        margin: 0;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        font-family: Arial, sans-serif;
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
        font-family: Arial, sans-serif;
        font-weight: 700;
        font-size: 1.5em;
        line-height: 1.2;
      }
      /* Speech bubble */
      .sg-header-bubble {
        position: relative;
        background: ${CONFIG.yellow};
        color: #162840;
        font-family: Arial, sans-serif;
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
        font-family: Arial, sans-serif;
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
      introNodes.forEach(n => introDiv.appendChild(n.cloneNode(true)));
    }

    const bottom = mk('div', { className: 'sg-header-bottom' }, [
      mk('p', { className: 'sg-header-werden', textContent: 'Werden Sie ein Teil unseres Teams' }),
      introDiv,
    ]);

    // Content layer (position: relative → defines the container height)
    const content = mk('div', { className: 'sg-header-content' }, [topRow, bottom]);

    // Root — prefer the SF background image, fall back to the configured PNG.
    const heroImageUrl = findHeroImageUrl() || CONFIG.heroImageUrl;
    const root = mk('div', { id: 'sg-header-root', className: 'sg-header-root' }, [
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
      .sg-body-root        { font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #22323f; margin: 0 0 32px; }
      .sg-lead             { margin: 0 0 8px; }
      .sg-lead p           { margin: 0 0 12px; line-height: 1.6; }
      .sg-lead strong      { color: ${CONFIG.blue}; }
      .sg-two-col          { display: flex; gap: 40px; width: 100%; box-sizing: border-box; margin: 32px 0; }
      .sg-col              { flex: 1 1 0; min-width: 0; }
      /* One shared heading style for all body section headings */
      .sg-col-heading,
      .sg-rest h2,.sg-rest h3,.sg-rest h4 { font-size: 1.15em; font-weight: 700; color: ${CONFIG.blue}; text-transform: uppercase; margin: 0 0 14px; padding-bottom: 8px; border-bottom: 3px solid ${CONFIG.yellow}; }
      .sg-col ul,.sg-rest ul { margin: 10px 0 0; padding-left: 22px !important; list-style-position: outside !important; list-style-type: disc; }
      .sg-col li,.sg-rest li { margin-bottom: 6px; line-height: 1.6; padding-left: 4px; text-align: left; }
      .sg-col li p,.sg-rest li p { margin: 0; } /* some feeds wrap li text in <p> */
      .sg-col h2:not(.sg-col-heading),.sg-col h3,.sg-col h4 { display: none; }
      .sg-rest             { margin: 24px 0; }
      .sg-rest p,.sg-col p { margin: 12px 0 0; line-height: 1.6; }
      /* Only the diversity / equal-opportunity statement gets the callout box */
      .sg-rest p.sg-note,.sg-col p.sg-note { margin-top: 18px; background: #f1f5f8; border-left: 4px solid ${CONFIG.yellow}; padding: 16px 20px; border-radius: 6px; }
      .sg-cta-box          { display:flex; align-items:flex-end; justify-content:space-between; gap:32px; background: ${CONFIG.yellow}; padding: 28px 32px; border-radius: 6px; margin: 32px 0; box-sizing: border-box; }
      .sg-cta-content      { flex:1 1 auto; min-width:0; }
      .sg-cta-box,.sg-cta-box * { color: ${CONFIG.blue} !important; -webkit-text-fill-color: ${CONFIG.blue} !important; }
      .sg-cta-heading      { margin: 0 0 12px; font-size: 1.3em; font-weight: 800; line-height: 1.2; }
      .sg-cta-box p        { margin: 0 0 8px; line-height: 1.6; }
      /* SF apply button as a "speech bubble" — same shape as the header BE bubble.
         Desktop: bottom-right, level with the last text line. Mobile: see media query. */
      .sg-cta-apply        { flex:0 0 auto; margin:0; }
      .sg-cta-apply a,.sg-cta-apply button,.sg-cta-apply input { position:relative; display:inline-block; background:${CONFIG.blue} !important; color:#fff !important; -webkit-text-fill-color:#fff !important; border:0 !important; padding:18px 48px !important; border-radius:18px 0 18px 0 !important; font-weight:800 !important; font-size:1.2em !important; letter-spacing:.4px; text-transform:uppercase; text-decoration:none !important; cursor:pointer; box-shadow:0 6px 16px rgba(0,30,60,0.22); transition:transform .12s ease, box-shadow .12s ease; }
      .sg-cta-apply a::after,.sg-cta-apply button::after { content:''; position:absolute; bottom:-15px; left:0; width:0; height:0; border-top:15px solid ${CONFIG.blue}; border-right:22px solid transparent; }
      .sg-cta-apply a:hover,.sg-cta-apply button:hover { transform:translateY(-1px); box-shadow:0 9px 22px rgba(0,30,60,0.28); }
      .sg-cta-box a        { color: ${CONFIG.blue} !important; text-decoration: underline; }
      .sg-cta-box img      { border-radius: 50%; width: 80px !important; height: 80px !important; object-fit: cover; display: block; margin: 8px 0; }
      .sg-cta-box strong   { font-size: 1.05em; }
      @media (max-width: ${CONFIG.mobileBreakpoint}px) {
        .sg-two-col  { flex-direction: column; gap: 24px; }
        .sg-cta-box  { flex-direction:column; align-items:stretch; padding: 20px 18px; }
        .sg-cta-apply { display:flex; justify-content:center; margin:20px 0 0; }
        .sg-cta-apply a,.sg-cta-apply button,.sg-cta-apply input { width:100%; text-align:center; padding:16px 24px !important; }
      }
    `);

    const root = mk('div', { className: 'sg-body-root', id: 'sg-body-root' });

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
        mk('h2', { className: 'sg-col-heading', textContent: 'Ihre Aufgaben' }),
      ]);
      appendClones(leftCol, bodyOnly(sections.aufgaben));
      const rightCol = mk('div', { className: 'sg-col' }, [
        mk('h2', { className: 'sg-col-heading', textContent: 'Ihr Profil' }),
      ]);
      appendClones(rightCol, bodyOnly(sections.profil));
      root.appendChild(mk('div', { className: 'sg-two-col' }, [leftCol, rightCol]));

      // Extra sections ("Wir bieten" etc.)
      if (sections.rest.length) {
        const restDiv = mk('div', { className: 'sg-rest' });
        appendClones(restDiv, sections.rest);
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
            ? mk('h2', { className: 'sg-col-heading', textContent: h.replace(/[:\s]+$/, '') })
            : node.cloneNode(true));
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

  function buildCta(sections) {
    if (document.getElementById('sg-cta-root')) return;
    const ctaNodes = sections ? [...sections.cta, ...sections.contact] : [];
    // SF's native apply button (usually at the very bottom) — pull it into the box.
    const applyBtns = document.querySelectorAll('.applylink, .unify-apply-button');
    const applyBtn = applyBtns[applyBtns.length - 1] || null;
    if (!ctaNodes.length && !applyBtn) return;

    const box = mk('div', { className: 'sg-cta-box', id: 'sg-cta-root' });
    const content = mk('div', { className: 'sg-cta-content' });
    ctaNodes.forEach(el => {
      if (isBlank(el)) return;
      const text = el.textContent.trim();
      // Render the standalone "Haben wir Ihr Interesse geweckt?" line as a real
      // heading (SEO) instead of a paragraph.
      if (/^Haben wir Ihr Interesse geweckt\s*\??\s*$/i.test(text)) {
        content.appendChild(mk('h2', { className: 'sg-cta-heading', textContent: text }));
      } else {
        content.appendChild(el.cloneNode(true));
      }
    });
    if (content.children.length) box.appendChild(content);

    // Move (not clone) the real apply button so its SF apply behaviour stays intact.
    if (applyBtn) box.appendChild(mk('div', { className: 'sg-cta-apply' }, [applyBtn]));

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

  const BENEFIT_IMAGES = {
    'Mitarbeiter­rabatte':                        'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterrabatte.png',
    'Mitarbeiterrabatte':                              'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterrabatte.png',
    'Gesundheits­vorsorge':                       'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Gesundheitsvorsorge.png',
    'Gesundheitsvorsorge':                             'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Gesundheitsvorsorge.png',
    'Modern ausgestattete Arbeitsplätze':         'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/ModArbeitsplaetze.png',
    'Betriebliche Altersvorsorge':                     'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/BetrAltersvorsorge.png',
    '30 Tage Urlaub':                                  'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Urlaub.png',
    '29 Tage Urlaub':                                  'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Urlaub.png',
    'Individuelle Weiterbildung':                      'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Weiterbildungsangebote.png',
    'Spannende Aufgaben, zukunftssicherer Arbeitsplatz': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Studium-angepasst-Arbeitszeiten.png',
    'Jobrad':                                          'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Jobrad-Leasing.png',
    'kostenlose Parkplätze':                      'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Parkplatz.png',
    'Barriere­freiheit':                          'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Barrierefrei.png',
    'Barrierefreiheit':                                'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Barrierefrei.png',
    'Coaching /Mentoring':                             'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Coaching.png',
    'Familien­freundlichkeit':                    'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Familienfreundlich.png',
    'Familienfreundlichkeit':                          'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Familienfreundlich.png',
    'Firmen­eigene Kantine':                      'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Kantine.png',
    'Firmen-eigene Kantine':                           'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Kantine.png',
    'Firmenwagen':                                     'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Firmenwagen.png',
    'Fitnessraum für Mitarbeiter/­innen':    'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Fitnessraum.png',
    'Fitnessraum für Mitarbeiter/-innen':         'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Fitnessraum.png',
    'Flexible Arbeitszeit':                            'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/FlexArbeitszeit.png',
    'Gute Verkehrsanbindung':                          'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/GuteVerkehrsanbindung.png',
    'Mitarbeiter-­Events':                        'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterevents.png',
    'Mitarbeiter-Events':                              'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterevents.png',
    'Modernes IT-Equipment':                           'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/ITequipment.png',
    'Attraktive Vergütung':                       'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/verguetung.png',
    'Remote Work möglich':                        'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Homeoffice.png',
  };

  const BENEFIT_BY_ID = {
    36: 'Mitarbeiter­rabatte',     37: 'Gesundheits­vorsorge',
    38: 'Modern ausgestattete Arbeitsplätze', 39: 'Betriebliche Altersvorsorge',
    40: 'Remote Work möglich',     41: '30 Tage Urlaub',
    42: '29 Tage Urlaub',               56: 'Individuelle Weiterbildung',
    76: 'Spannende Aufgaben, zukunftssicherer Arbeitsplatz',
    77: 'Jobrad',                        78: 'kostenlose Parkplätze',
    79: 'Barriere­freiheit',        80: 'Coaching /Mentoring',
    81: 'Familien­freundlichkeit',  82: 'Firmen­eigene Kantine',
    83: 'Firmenwagen',                   84: 'Fitnessraum für Mitarbeiter/­innen',
    85: 'Flexible Arbeitszeit',          86: 'Gute Verkehrsanbindung',
    87: 'Mitgestaltungsmöglichkeiten',
    88: 'Attraktive Vergütung',     89: 'Modernes IT-Equipment',
    90: 'Mitarbeiter-­Events',
  };

  function buildBenefits(jobNode) {
    if (document.getElementById('sg-benefits-root')) return;

    const raw = jobNode ? nodeText(jobNode, 'customfield4') : '';
    const tokens = raw ? raw.split(';').map(s => s.trim()).filter(Boolean) : [];

    injectStyle('sg-benefits-style', `
      .sg-benefits-wrapper { width:100%; display:flex; flex-direction:column; align-items:center; margin:40px 0 24px; font-family:Arial,sans-serif; font-size:16px; }
      .sg-benefits-heading { width:100%; font-size:1.15em; font-weight:700; color:${CONFIG.blue}; text-transform:uppercase; margin:0 0 14px; padding-bottom:8px; border-bottom:3px solid ${CONFIG.yellow}; }
      .sg-benefits-inner   { display:flex; flex-wrap:wrap; justify-content:center; gap:30px 20px; padding:32px 40px; background:#fff; border-radius:24px; max-width:1200px; width:100%; box-sizing:border-box; }
      .sg-benefits-item    { flex:0 0 120px; max-width:120px; display:flex; flex-direction:column; align-items:center; text-align:center; }
      .sg-benefits-icon    { width:90px;height:90px;margin-bottom:14px;object-fit:contain; }
      .sg-benefits-label   { font-size:15px;line-height:1.35;font-weight:500;color:#555;overflow-wrap:break-word;word-break:break-word;hyphens:auto;text-wrap:balance; }
      @supports not (text-wrap:balance) { .sg-benefits-label { line-height:1.25; } }
      @media (max-width:760px)  { .sg-benefits-inner{gap:24px 18px;padding:22px 24px;border-radius:20px} .sg-benefits-item{flex-basis:128px;max-width:128px} }
      @media (max-width:520px)  { .sg-benefits-inner{gap:20px 14px;padding:18px} .sg-benefits-item{flex-basis:118px;max-width:118px} .sg-benefits-icon{width:80px;height:80px} }
      @media (max-width:380px)  { .sg-benefits-inner{padding:14px 12px} .sg-benefits-item{flex-basis:104px;max-width:104px} }
      @media (prefers-reduced-motion:reduce) { .sg-benefits-item{animation:none} }
    `);

    const inner = mk('div', { className: 'sg-benefits-inner' });
    const outer = mk('div', { className: 'sg-benefits-wrapper', id: 'sg-benefits-root' }, [
      mk('h2', { className: 'sg-benefits-heading', textContent: 'Unsere Benefits' }),
      inner,
    ]);

    if (tokens.length) {
      const seen = new Set();
      tokens.forEach(token => {
        const num = Number(token);
        let text;

        if (!Number.isNaN(num) && BENEFIT_BY_ID[num]) {
          if (seen.has(num)) return;
          seen.add(num);
          text = BENEFIT_BY_ID[num];
        } else {
          const t = token.trim();
          const key = t.replace(/\s+/g, ' ').toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          text = t;
        }

        const imgSrc = BENEFIT_IMAGES[text] ?? BENEFIT_IMAGES[text.replace(/­/g, '')] ?? null;
        const isMitgestaltung = text.toLowerCase().includes('mitgestaltung');
        // No icon and no inline-SVG fallback → nothing meaningful to show.
        if (!imgSrc && !isMitgestaltung) return;

        const item = mk('div', { className: 'sg-benefits-item' });

        if (!imgSrc && isMitgestaltung) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '44'); svg.setAttribute('height', '44'); svg.setAttribute('viewBox', '0 0 24 24');
          svg.classList.add('sg-benefits-icon');
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '11'); circle.setAttribute('fill', '#eef3f7');
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', 'M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm14.85-9.6c.3-.3.3-.75 0-1.05l-2.45-2.45c-.3-.3-.75-.3-1.05 0l-1.6 1.6 3.75 3.75 1.35-1.85z');
          path.setAttribute('fill', CONFIG.blue);
          svg.append(circle, path);
          item.appendChild(svg);
        } else if (imgSrc) {
          item.appendChild(mk('img', { className: 'sg-benefits-icon', src: imgSrc, alt: text, loading: 'lazy' }));
        }

        item.appendChild(mk('div', { className: 'sg-benefits-label', textContent: text }));
        inner.appendChild(item);
      });
    }

    // Don't render a bare "Unsere Benefits" heading over an empty box.
    if (!inner.children.length) return;

    insertBeforeScript(outer);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  async function init() {
    const jobId = getJobId();
    const xml = await getFeed().catch(() => null);
    const jobNode = findJobNode(xml, jobId);

    // Prefer the SF layout tokens (Kopfzeile / Stellenbeschreibung / Fußzeile)
    // on the page; fall back to parsing the feed's <description> if absent.
    const tokens = readLayoutTokens();
    const sections = tokens ? sectionsFromTokens(tokens)
                            : (jobNode ? parseDescription(jobNode) : null);

    buildHeader(jobNode, sections?.intro ?? []);
    buildJobBody(jobNode, sections);
    buildBenefits(jobNode);
    buildCta(sections); // last → sits below the Benefits section

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
  var DEFAULT_FEED_ID = '430205';
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
    return 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/' + feedId;
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
  var DEFAULT_FEED_ID = '430205';
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
    return 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/' + feedId;
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
