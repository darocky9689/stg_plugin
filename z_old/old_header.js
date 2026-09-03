<script>
// Hilfsfunktionen
async function fetchJobTitleAndBusinessUnit(jobId) {
  const feedUrl = 'https://job.stiegelmeyer-group.com/feed/435055';
  const response = await fetch(feedUrl);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const jobs = xmlDoc.querySelectorAll('job');
  for (const job of jobs) {
    const idNode = job.querySelector('ID');
    if (idNode && idNode.textContent === jobId) {
      const titleNode = job.querySelector('title');
      const buNode = job.querySelector('businessunit');
      return {
        jobTitle: titleNode ? titleNode.textContent : 'Jobtitel',
        businessUnit: buNode ? buNode.textContent : ''
      };
    }
  }
  return { jobTitle: 'Jobtitel', businessUnit: '' };
}

function getJobReqIdFromUrl() {
  const url = window.location.href;
  const match = url.match(/\/([0-9]+-de_DE)$/);
  return match ? match[1] : null;
}

function createLogoCircle(businessUnit, size, position, rotate = false) {
  const circle = document.createElement('div');
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
    ...position
  });
  const logo = document.createElement('img');
  logo.src = businessUnit && businessUnit.toLowerCase().includes('burmeier')
    ? 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/burmeier.svg'
    : 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/stiegelmeyer-logo.svg';
  logo.alt = businessUnit && businessUnit.toLowerCase().includes('burmeier') ? 'Burmeier Logo' : 'Stiegelmeyer Logo';
  Object.assign(logo.style, {
    width: '80%',
    height: '80%',
    objectFit: 'contain',
    transform: 'scale(0.9)'
  });
  circle.appendChild(logo);
  return circle;
}

async function buildNewLayout() {
  // Globale H3-Definition einmalig injizieren
  const GLOBAL_H3_STYLE_ID = 'global-h3-style';
  if (!document.getElementById(GLOBAL_H3_STYLE_ID)) {
    const globalStyle = document.createElement('style');
    globalStyle.id = GLOBAL_H3_STYLE_ID;
    globalStyle.textContent = `h3 { font-family: Arial, sans-serif !important; font-weight:300; font-size:1.5em; color:#ECECEC; }`;
    document.head.appendChild(globalStyle);
  }

  // Globales P-Tag-Style für die gesamte Seite: Arial 14px, dünn
  const GLOBAL_P_STYLE_ID = 'global-p-style';
  if (!document.getElementById(GLOBAL_P_STYLE_ID)) {
    const pStyle = document.createElement('style');
    pStyle.id = GLOBAL_P_STYLE_ID;
  pStyle.textContent = `
      /* Einheitliche Typografie sitewide */
      p,
      p span,
      p a,
      p em,
      p strong,
      p b,
      p i,
      p u,
      p sup,
      p sub,
      li,
      li span,
      li a,
      li em,
      li strong,
      li b,
      li i,
      li u,
      li sup,
      li sub {
        font-family: Arial, sans-serif !important;
    font-weight: 200 !important;
    font-size: 16px !important;
      }
    `;
    document.head.appendChild(pStyle);
  }

  // Sauberes CSS für Layout injizieren
  const LAYOUT_STYLE_ID = 'jobtitle-overlay-styles';
  if (!document.getElementById(LAYOUT_STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = LAYOUT_STYLE_ID;
    styleEl.textContent = `
      .jobtitle-layout-wrapper{display:flex;position:relative;width:100%;flex-wrap:nowrap;align-items:flex-start;overflow:visible;}
      .jobtitle-image{width:70%;flex:0 0 70%;position:relative;z-index:1;}
      .jobtitle-image img{display:block;width:100%;height:auto;}
.jobtitle-overlay {
  position: absolute;
  right: 0;
  top: 50%;
  width: 40%;
  background: #395366;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  color: #fff;
  transform: translateY(-50%);
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
  const largeImage = document.querySelector('.large-image-component');
  if (!largeImage) return;

  // Wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'jobtitle-layout-wrapper';

  // Bild-Container klassifizieren
  largeImage.classList.add('jobtitle-image');

  // Overlay
  const overlay = document.createElement('div');
  overlay.className = 'jobtitle-overlay';

  // Einfache, robuste Darstellung ohne dynamische Min-Höhen o.ä.

  // Jobtitel & Businessunit
  const jobId = getJobReqIdFromUrl();
  let jobTitle = 'Jobtitel', businessUnit = '';
  if (jobId) {
    const result = await fetchJobTitleAndBusinessUnit(jobId);
    jobTitle = result.jobTitle;
    businessUnit = result.businessUnit;
  }
  // Gelbes Dreieck als PNG, startet an der ersten Textzeile
  const arrowImg = document.createElement('img');
  arrowImg.src = "https://rmkcdn.successfactors.com/70ccb92e/3fbced59-6c09-4532-99f4-3.png";
  arrowImg.alt = "Pfeil";
  arrowImg.style.width = "24px";
  arrowImg.style.height = "auto";
  arrowImg.style.marginRight = "8px";
  arrowImg.style.display = "inline-block";
  arrowImg.style.flexShrink = '0';
  // top-align with first line of the title
  arrowImg.style.alignSelf = 'flex-start';

  const titleH1 = document.createElement('h1');
  titleH1.textContent = jobTitle;
  const existingH1 = document.querySelector('h1');
  if (existingH1 && existingH1.className) {
    titleH1.className = existingH1.className;
  }
  // H1-Styling erfolgt über CSS-Klasse (.jobtitle-overlay h1)

  // Wrapper für Dreieck und Titel
  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'jobtitle-title-row';
  titleWrapper.appendChild(arrowImg);
  titleWrapper.appendChild(titleH1);
  overlay.appendChild(titleWrapper);

  // Text-Ausrichtung über CSS

  // Kreis-Logo positionieren (einfach): Desktop überlappend, mobil im Bild oben rechts
  let circleEl = null;
  const placeCircle = () => {
    if (circleEl && circleEl.parentNode) circleEl.parentNode.removeChild(circleEl);
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      const imageWidth = largeImage.offsetWidth || largeImage.clientWidth || 0;
      const circleSize = Math.min(100, Math.round(imageWidth * 0.15)) || 60;
      circleEl = createLogoCircle(businessUnit, circleSize, { top: '2%', right: '2%' });
      largeImage.style.position = 'relative';
      largeImage.appendChild(circleEl);
    } else {
      const circleSize = 140;
      const circleLeft = (largeImage.offsetWidth || 0) - Math.round(circleSize / 2);
      circleEl = createLogoCircle(businessUnit, circleSize, { top: '-42px', left: circleLeft + 'px', marginLeft: '-10%' }, true);
      wrapper.appendChild(circleEl);
      // dezenter Hover-Effekt beibehalten
      circleEl.style.transition = 'transform 0.3s, width 0.3s, height 0.3s';
      if (circleEl.firstChild) circleEl.firstChild.style.transition = 'transform 0.3s, width 0.3s, height 0.3s';
      circleEl.addEventListener('mouseenter', function() {
        circleEl.style.transform = 'rotate(0deg) scale(0.95)';
        circleEl.style.width = (circleSize * 1.2) + 'px';
        circleEl.style.height = (circleSize * 1.2) + 'px';
        if (circleEl.firstChild) circleEl.firstChild.style.transform = 'scale(1.05)';
      });
      circleEl.addEventListener('mouseleave', function() {
        circleEl.style.transform = 'rotate(15deg) scale(0.9)';
        circleEl.style.width = circleSize + 'px';
        circleEl.style.height = circleSize + 'px';
        if (circleEl.firstChild) circleEl.firstChild.style.transform = 'scale(1)';
      });
    }
  };

  // Overlay-Höhe auf 80% der Bildhöhe begrenzen (Desktop); mobil frei wachsen lassen
  const setOverlayHeight = () => {
    const imgHeight = largeImage.offsetHeight;
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      overlay.style.height = '';
      overlay.style.maxHeight = '';
      overlay.style.minHeight = '';
      return;
    }
    if (imgHeight > 0) {
      const overlayHeight = Math.round(imgHeight * 0.80);
      overlay.style.height = overlayHeight + 'px';
      overlay.style.maxHeight = overlayHeight + 'px';
      overlay.style.minHeight = overlayHeight + 'px';
    }
  };

  // Titel-Fit: verkleinert die Schrift bis der Text ins Overlay passt (ohne zu überlaufen)
  const fitOverlayTitle = () => {
    const csOverlay = getComputedStyle(overlay);
    const padTop = parseFloat(csOverlay.paddingTop) || 0;
    const padBottom = parseFloat(csOverlay.paddingBottom) || 0;
    const avail = overlay.clientHeight - padTop - padBottom;
    if (avail <= 0) return;
    const h1 = titleH1;
    const csH1 = getComputedStyle(h1);
    let fontPx = parseFloat(csH1.fontSize) || 32;
    const minPx = window.innerWidth < 768 ? 16 : 18;
    // Reset any previous inline reduction before measuring
    h1.style.fontSize = fontPx + 'px';
    h1.style.whiteSpace = 'normal';
    h1.style.wordBreak = 'break-word';
    // Reduce font size until fits
    let guard = 0;
    while ((h1.scrollHeight > avail) && fontPx > minPx && guard < 40) {
      fontPx -= 1;
      h1.style.fontSize = fontPx + 'px';
      guard++;
    }
  };

  // Einfügen der Struktur (CSS steuert Responsiveness)
  largeImage.parentNode.insertBefore(wrapper, largeImage);
  wrapper.appendChild(largeImage);
  wrapper.appendChild(overlay);
  // Kreis platzieren
  placeCircle();
  // Overlay-Höhe setzen
  setOverlayHeight();
  // Titel passend machen
  fitOverlayTitle();

  window.addEventListener('resize', () => {
    placeCircle();
    setOverlayHeight();
  fitOverlayTitle();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildNewLayout);
} else {
  buildNewLayout();
}
  

</script>
<script>
// Eigenständiges Job Info Design (nicht mit Overlay mischen)
const debug_job = null; // z.B. "123456-de_DE" für Test

const JOBINFO_STYLE_ID = 'jobinfodesign-style';
const JOBINFO_SCRIPT_ANCHOR = document.currentScript; // Positionierungsanker

function injectJobInfoStyles() {
  if (document.getElementById(JOBINFO_STYLE_ID)) return;
  const style = document.createElement('style');
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
    /* Vertikale Trenner entfernen, stattdessen horizontale Linien unter jedem Block außer dem letzten sichtbaren */
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
  const feedUrl = 'https://job.stiegelmeyer-group.com/feed/435055';
  const response = await fetch(feedUrl);
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const jobs = xmlDoc.querySelectorAll('job');
  for (const job of jobs) {
    const idNode = job.querySelector('ID');
    if (idNode && idNode.textContent === jobId) {
      return {
        businessUnit: job.querySelector('businessunit')?.textContent || '',
        location: job.querySelector('location')?.textContent || '',
        shifttype: job.querySelector('shifttype')?.textContent || '',
        entryDate: job.querySelector('customfield5')?.textContent || ''
      };
    }
  }
  return { businessUnit: '', location: '', shifttype: '', entryDate: '' };
}

function getJobReqIdFromUrl() {
  const url = window.location.href;
  const match = url.match(/\/([0-9]+-de_DE)$/);
  return match ? match[1] : null;
}

function createItem(iconUrl, label, value, extraClass = '') {
  const wrap = document.createElement('div');
  wrap.className = 'jobinfodesign-item ' + extraClass;
  const icon = document.createElement('img'); icon.src = iconUrl; icon.alt = label + ' Icon'; icon.className = 'jobinfodesign-icon';
  const l = document.createElement('div'); l.className = 'jobinfodesign-label'; l.textContent = label;
  const v = document.createElement('div'); v.className = 'jobinfodesign-value'; v.textContent = value && value.trim() !== '' ? value : '-';
  wrap.appendChild(icon); wrap.appendChild(l); wrap.appendChild(v);
  return wrap;
}

function buildJobInfoDOM(info) {
  const outer = document.createElement('div'); outer.className = 'jobinfodesign-wrapper';
  const inner = document.createElement('div'); inner.className = 'jobinfodesign-inner';

  // Unternehmen: Icon + Label + dynamisches Logo
  const companyItem = document.createElement('div'); companyItem.className = 'jobinfodesign-item company';
  const companyIcon = document.createElement('img');
  companyIcon.src = 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Icons/Jobs/Icon-Company.svg';
  companyIcon.alt = 'Unternehmen';
  companyIcon.className = 'jobinfodesign-icon';
  const companyLabel = document.createElement('div'); companyLabel.className = 'jobinfodesign-label'; companyLabel.textContent = 'Unternehmen';
  const companyLogo = document.createElement('img');
  const bu = (info.businessUnit || '').toLowerCase();
  if (bu.includes('burmeier')) { companyLogo.src = 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/burmeier.svg'; companyLogo.alt = 'Burmeier'; }
  else { companyLogo.src = 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/stiegelmeyer-logo.svg'; companyLogo.alt = 'Stiegelmeyer'; }
  companyLogo.className = 'jobinfodesign-companylogo';
  companyItem.appendChild(companyIcon);
  companyItem.appendChild(companyLabel);
  companyItem.appendChild(companyLogo);
  inner.appendChild(companyItem);

  inner.appendChild(createItem('https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Icons/Jobs/Icon-Location.svg', 'Standort', info.location));
  inner.appendChild(createItem('https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Icons/Jobs/Icon-Workload.svg', 'Auslastung', info.shifttype));
  inner.appendChild(createItem('https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Icons/Jobs/Icon-EntryDate.svg', 'Einstiegsdatum', info.entryDate));

  outer.appendChild(inner);
  return outer;
}

function placeJobInfo(wrapperNode) {
  if (JOBINFO_SCRIPT_ANCHOR && JOBINFO_SCRIPT_ANCHOR.parentNode) {
    JOBINFO_SCRIPT_ANCHOR.parentNode.insertBefore(wrapperNode, JOBINFO_SCRIPT_ANCHOR);
    return;
  }
  // Fallback falls kein currentScript ermittelt werden konnte
  document.body.appendChild(wrapperNode);
}

async function initJobInfoDesign() {
  injectJobInfoStyles();
  const jobId = debug_job || getJobReqIdFromUrl();
  if (debug_job) console.log('[JOBINFO DEBUG] debug_job aktiv:', debug_job);
  if (!jobId) { console.log('[JOBINFO DEBUG] Keine Job-ID gefunden.'); return; }
  try {
    const info = await fetchJobInfo(jobId);
    console.log('[JOBINFO DEBUG] Info geladen:', info);
    const dom = buildJobInfoDOM(info);
    placeJobInfo(dom);
  } catch (e) {
    console.error('[JOBINFO DEBUG] Fehler beim Laden:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJobInfoDesign);
} else {
  initJobInfoDesign();
}

</script>

<script>
// Benefits Design (eigenständig, unabhängige Klassen)
const SCRIPT_EL = document.currentScript || (function(){ const s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
let BENEFITS_ROOT = null; let STYLE_INJECTED = false;
const DEFAULT_FEED_ID = '435055';

function injectStyles(){
    const css = `
    .benefitsdesign-wrapper { width:100%; display:flex; flex-direction:column; align-items:stretch; justify-content:flex-start; margin:40px 0 24px; }
    .benefitsdesign-inner { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:40px 56px; padding:32px 48px; background:#ffffff; border-radius:24px; max-width:1200px; width:100%; margin:0 auto; box-sizing:border-box; font-family:inherit; justify-items:center; justify-content:center; }
    .benefitsdesign-item { display:flex; flex-direction:column; position:relative; align-items:center; text-align:center; box-sizing:border-box; }
    .benefitsdesign-icon { width:44px; height:44px; margin-bottom:10px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15)); box-sizing:border-box; }
    .benefitsdesign-label { font-size:13px; letter-spacing:.4px; text-transform:uppercase; font-weight:600; color:#395366; margin-bottom:4px; white-space:normal; overflow-wrap:break-word; word-break:break-word; hyphens:auto; text-wrap:balance; }
    .benefitsdesign-value { font-size:16px; font-weight:500; line-height:1.35; color:#22323f; white-space:normal; overflow-wrap:break-word; word-break:break-word; hyphens:auto; }
    /* Fallback for browsers ohne text-wrap */
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
    let styleEl = document.querySelector('style[data-benefits-style]');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.setAttribute('data-benefits-style','');
        document.head.appendChild(styleEl);
        console.log('[BENEFITS DEBUG] Neues Style-Element erstellt.');
    } else {
        console.log('[BENEFITS DEBUG] Vorhandenes Style-Element aktualisiert.');
    }
    styleEl.textContent = css;
    STYLE_INJECTED = true;
}

function getBenefitsHeadingTemplate(){
    const isHeadingTag = (el) => !!el && /^H[1-4]$/.test(el.tagName);
    if (SCRIPT_EL) {
        let node = SCRIPT_EL.previousElementSibling;
        while (node) {
            if (isHeadingTag(node)) {
                return { tag: node.tagName.toLowerCase(), className: node.className || '' };
            }
            if (node.querySelector) {
                const nestedHeading = node.querySelector('h1,h2,h3,h4');
                if (nestedHeading) {
                    return { tag: nestedHeading.tagName.toLowerCase(), className: nestedHeading.className || '' };
                }
            }
            node = node.previousElementSibling;
        }
    }
    const firstHeading = document.querySelector('h1,h2,h3,h4');
    return firstHeading
        ? { tag: firstHeading.tagName.toLowerCase(), className: firstHeading.className || '' }
        : { tag: 'h3', className: '' };
}

function ensureStructure(){
    if (!SCRIPT_EL){ console.warn('[BENEFITS DEBUG] Kein Script Element – fallback body'); BENEFITS_ROOT = BENEFITS_ROOT || document.body; }
    else if (!BENEFITS_ROOT){
        const maybeRoot = SCRIPT_EL.nextElementSibling;
        if (maybeRoot && maybeRoot.classList && maybeRoot.classList.contains('benefitsdesign-wrapper')) { BENEFITS_ROOT = maybeRoot; }
        else {
            BENEFITS_ROOT = document.createElement('div');
            if (SCRIPT_EL.parentNode) {
                SCRIPT_EL.parentNode.insertBefore(BENEFITS_ROOT, SCRIPT_EL.nextSibling);
            } else {
                document.body.appendChild(BENEFITS_ROOT);
            }
        }
    }
    if (!BENEFITS_ROOT){ console.error('[BENEFITS DEBUG] Root fehlt'); return; }
    BENEFITS_ROOT.innerHTML='';
    BENEFITS_ROOT.className = 'benefitsdesign-wrapper';
    const title = document.createElement('h2');
    title.textContent='Unsere Benefits';
    BENEFITS_ROOT.appendChild(title);
    const inner = document.createElement('div'); inner.className='benefitsdesign-inner'; BENEFITS_ROOT.appendChild(inner);
    const errorDiv = document.createElement('div'); errorDiv.id='error-msg'; errorDiv.style.width='100%'; errorDiv.style.textAlign='center'; errorDiv.style.marginTop='12px'; BENEFITS_ROOT.appendChild(errorDiv);
}

(function immediateInit(){ try { if (document.readyState !== 'loading') { ensureStructure(); injectStyles(); } else { document.addEventListener('readystatechange', function once(){ if (document.readyState !== 'loading') { document.removeEventListener('readystatechange', once); ensureStructure(); injectStyles(); } }); } } catch(e){ console.error('[BENEFITS DEBUG] immediateInit Fehler:', e); } })();

// Vollständige Benefit-Liste (Text-basiert) mit Bildpfaden
const benefitsByText = {
    'Mitarbeiter­rabatte': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterrabatte.png',
    'Mitarbeiterrabatte': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterrabatte.png',
    'Gesundheits­vorsorge': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Gesundheitsvorsorge.png',
    'Gesundheitsvorsorge': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Gesundheitsvorsorge.png',
    'Modern ausgestattete Arbeitsplätze': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/ModArbeitsplaetze.png',
    'Betriebliche Altersvorsorge': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/BetrAltersvorsorge.png',
    '30 Tage Urlaub': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Urlaub.png',
    '29 Tage Urlaub': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Urlaub.png',
    'Individuelle Weiterbildung': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Weiterbildungsangebote.png',
    'Spannende Aufgaben, zukunftssicherer Arbeitsplatz': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Studium-angepasst-Arbeitszeiten.png',
    'Jobrad': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Jobrad-Leasing.png',
    'kostenlose Parkplätze': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Parkplatz.png',
    'Barriere­freiheit': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Barrierefrei.png',
    'Barrierefreiheit': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Barrierefrei.png',
    'Coaching /Mentoring': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Coaching.png',
    'Familien­freundlichkeit': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Familienfreundlich.png',
    'Familienfreundlichkeit': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Familienfreundlich.png',
    'Firmen­eigene Kantine': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Kantine.png',
    'Firmen-eigene Kantine': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Kantine.png',
    'Firmenwagen': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Firmenwagen.png',
    'Fitnessraum für Mitarbeiter/­innen': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Fitnessraum.png',
    'Fitnessraum für Mitarbeiter/-innen': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Fitnessraum.png',
    'Flexible Arbeitszeit': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/FlexArbeitszeit.png',
    'Gute Verkehrsanbindung': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/GuteVerkehrsanbindung.png',
    'Mitarbeiter-­Events': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterevents.png',
    'Mitarbeiter-Events': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Mitarbeiterevents.png',
    'Modernes IT-Equipment': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/ITequipment.png',
    'Attraktive Vergütung': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/verguetung.png',
    'Remote Work möglich': 'https://www.stiegelmeyer.com/fileadmin/stiegelmeyer-gruppe/media/karriere/benefits/png/Homeoffice.png'
};

// Vollständige numerische Zuordnung (IDs aus der Tabelle)
const benefitsConfig = {
    15: { text: 'Mitarbeiter­rabatte', img: benefitsByText['Mitarbeiter­rabatte'] || benefitsByText['Mitarbeiterrabatte'] },
    13: { text: 'Gesundheits­vorsorge', img: benefitsByText['Gesundheits­vorsorge'] || benefitsByText['Gesundheitsvorsorge'] },
    8: { text: 'Modern ausgestattete Arbeitsplätze', img: benefitsByText['Modern ausgestattete Arbeitsplätze'] },
    12: { text: 'Betriebliche Altersvorsorge', img: benefitsByText['Betriebliche Altersvorsorge'] },
    20: { text: '30 Tage Urlaub', img: benefitsByText['30 Tage Urlaub'] },
    18: { text: 'Individuelle Weiterbildung', img: benefitsByText['Individuelle Weiterbildung'] },
    28: { text: 'Spannende Aufgaben, zukunftssicherer Arbeitsplatz', img: benefitsByText['Spannende Aufgaben, zukunftssicherer Arbeitsplatz'] },
    24: { text: 'kostenlose Parkplätze', img: benefitsByText['kostenlose Parkplätze'] },
    23: { text: 'Barriere­freiheit', img: benefitsByText['Barriere­freiheit'] || benefitsByText['Barrierefreiheit'] },
    27: { text: 'Coaching /Mentoring', img: benefitsByText['Coaching /Mentoring'] },
    9: { text: 'Familien­freundlichkeit', img: benefitsByText['Familien­freundlichkeit'] || benefitsByText['Familienfreundlichkeit'] },
    19: { text: 'Firmen­eigene Kantine', img: benefitsByText['Firmen­eigene Kantine'] || benefitsByText['Firmen-eigene Kantine'] },
    11: { text: 'Firmenwagen', img: benefitsByText['Firmenwagen'] },
    22: { text: 'Fitnessraum für Mitarbeiter/­innen', img: benefitsByText['Fitnessraum für Mitarbeiter/­innen'] || benefitsByText['Fitnessraum für Mitarbeiter/-innen'] },
    29: { text: 'Flexible Arbeitszeit', img: benefitsByText['Flexible Arbeitszeit'] },
    21: { text: 'Gute Verkehrsanbindung', img: benefitsByText['Gute Verkehrsanbindung'] },
    14: { text: 'Mitarbeiter-­Events', img: benefitsByText['Mitarbeiter-­Events'] || benefitsByText['Mitarbeiter-Events'] },
    10: { text: 'Modernes IT-Equipment', img: benefitsByText['Modernes IT-Equipment'] },
    25: { text: '29 Tage Urlaub', img: benefitsByText['29 Tage Urlaub'] },
    16: { text: 'Attraktive Vergütung', img: benefitsByText['Attraktive Vergütung'] },
    26: { text: 'Remote Work möglich', img: benefitsByText['Remote Work möglich'] },
    17: { text: 'Mitgestaltungsmöglichkeiten', img: benefitsByText['Mitgestaltungsmöglichkeiten'] || null }
};

function getJobReqIdFromUrl() {
    const url = window.location.href;
    console.log('[DEBUG] Aktuelle URL:', url);
    let jobReqId = null;
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(Boolean);
        jobReqId = segments.find(segment => /^\d+(?:-[a-z]{2,3}(?:_[a-z]{2,4})+)?$/i.test(segment)) || null;
    } catch (e) {
        console.warn('[DEBUG] URL konnte nicht geparst werden:', e);
    }
    console.log('[DEBUG] Extrahierte Job-Req-ID:', jobReqId);
    return jobReqId;
}

function getNumericJobReqId(jobReqId) {
    if (!jobReqId) { return null; }
    const match = String(jobReqId).match(/^(\d+)/);
    return match ? match[1] : null;
}

function getFeedUrlFromContext() {
    let feedId = null;
    try {
        feedId = new URL(window.location.href).searchParams.get('feedId');
    } catch (_) {}
    if (!feedId && SCRIPT_EL && SCRIPT_EL.dataset) {
        feedId = SCRIPT_EL.dataset.feedId || null;
    }
    if (!/^\d+$/.test(String(feedId || ''))) {
        feedId = DEFAULT_FEED_ID;
    }
    return `https://job.stiegelmeyer-group.com/feed/${feedId}`;
}

async function fetchXmlFeed(feedUrl) {
    console.log('[DEBUG] Abrufe XML-Feed:', feedUrl);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
        const r = await fetch(feedUrl, { signal: controller.signal });
        console.log('[DEBUG] HTTP-Status:', r.status);
        if (!r.ok) throw new Error('Feed konnte nicht geladen werden.');
        const t = await r.text();
        console.log('[DEBUG] XML-Feed Länge:', t.length);
        const xmlDoc = new window.DOMParser().parseFromString(t, 'application/xml');
        if (xmlDoc.querySelector('parsererror')) {
            throw new Error('Feed-Antwort ist kein gültiges XML.');
        }
        return xmlDoc;
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new Error('Feed-Request Timeout. Bitte später erneut versuchen.');
        }
        if (e instanceof TypeError) {
            throw new Error('Feed konnte nicht geladen werden (Netzwerk/CORS).');
        }
        throw e;
    } finally {
        window.clearTimeout(timeoutId);
    }
}
function findJobNodeById(xmlDoc, jobReqId) {
    const jobs = xmlDoc.querySelectorAll('job');
    const targetNumericId = getNumericJobReqId(jobReqId);
    if (!targetNumericId) {
        console.warn('[DEBUG] Ungültige Job-ID (kein numerischer Anteil):', jobReqId);
        return null;
    }
    console.log('[DEBUG] Anzahl Jobs im Feed:', jobs.length);
    for (const job of jobs) {
        const idNode = job.querySelector('ID');
        if (!idNode) { continue; }
        const feedJobId = idNode.textContent.trim();
        if (getNumericJobReqId(feedJobId) === targetNumericId) {
            console.log('[DEBUG] Passender Job-Knoten gefunden (numerisch):', feedJobId);
            return job;
        }
    }
    console.warn('[DEBUG] Kein passender Job-Knoten gefunden für ID:', jobReqId);
    return null;
}

function renderBenefitsList(benefitTokens){
    const inner = BENEFITS_ROOT.querySelector('.benefitsdesign-inner');
    if (!inner){ console.error('[BENEFITS DEBUG] inner fehlt'); return; }
    inner.innerHTML='';
        const seen = new Set();
        benefitTokens.forEach((token) => {
                let cfg;
                // Versuch: Zahl -> lookup in benefitsConfig
                const num = Number(token);
                if (!Number.isNaN(num) && benefitsConfig[num]) {
                    const key = `id:${num}`;
                    if (seen.has(key)) { return; }
                    cfg = benefitsConfig[num];
                    seen.add(key);
                } else {
                    // Text -> normalisieren und in benefitsByText nachsehen
                    const t = token.trim();
                    const norm = t.replace(/\s+/g,' ').replace(/\u00AD/g,'').toLowerCase();
                    const key = `text:${norm}`;
                    if (seen.has(key)) { return; }
                    const img = benefitsByText[t] || benefitsByText[t.replace(/\s+/g,' ')] || null;
                    if (img) {
                        cfg = { text: t, img };
                        seen.add(key);
                    } else {
                        console.warn('[BENEFITS DEBUG] Keine Bild-Zuordnung für', token);
                        return;
                    }
                }
                const item = document.createElement('div'); item.className='benefitsdesign-item';
                let icon;
                if (!cfg.img && cfg.text.toLowerCase().includes('mitgestaltung')) {
                    // Standard-Placeholder-Icon (inline SVG): Stift im Kreis
                    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                    svg.setAttribute('width','44');
                    svg.setAttribute('height','44');
                    svg.setAttribute('viewBox','0 0 24 24');
                    svg.classList.add('benefitsdesign-icon');
                    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
                    circle.setAttribute('cx','12'); circle.setAttribute('cy','12'); circle.setAttribute('r','11'); circle.setAttribute('fill','#eef3f7');
                    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                    path.setAttribute('d','M3 17.25V21h3.75l11-11-3.75-3.75-11 11zm14.85-9.6c.3-.3.3-.75 0-1.05l-2.45-2.45c-.3-.3-.75-.3-1.05 0l-1.6 1.6 3.75 3.75 1.35-1.85z');
                    path.setAttribute('fill','#395366');
                    svg.appendChild(circle); svg.appendChild(path);
                    icon = svg;
                } else {
                    icon = document.createElement('img'); icon.className='benefitsdesign-icon'; icon.src = cfg.img; icon.alt = cfg.text; icon.loading='lazy';
                }
                const label = document.createElement('div'); label.className='benefitsdesign-label'; label.textContent = cfg.text;
        // Kein separater value nötig -> Nutzen von label + evtl. future details
        item.appendChild(icon); item.appendChild(label);
        inner.appendChild(item);
    // Grid kümmert sich um Umbrüche automatisch
        });
}

async function main(){
    ensureStructure(); injectStyles(); if(!BENEFITS_ROOT) return; const errorDiv = BENEFITS_ROOT.querySelector('#error-msg'); if(!errorDiv){ console.error('[BENEFITS DEBUG] errorDiv fehlt'); return; } errorDiv.textContent='';
    const jobReqId = getJobReqIdFromUrl(); if(!jobReqId){ errorDiv.textContent='Job-Req-ID konnte nicht aus der URL gelesen werden.'; return; }
    try {
        const xmlDoc = await fetchXmlFeed(getFeedUrlFromContext());
    const jobNode = findJobNodeById(xmlDoc, jobReqId); if(!jobNode){ errorDiv.textContent='Benefits werden ergänzt'; return; }
        const customfield4 = jobNode.querySelector('customfield4, customField4, customfield_4'); if(!customfield4 || !customfield4.textContent.trim()){ errorDiv.textContent='Keine Benefits für diesen Job hinterlegt.'; return; }
    const benefitTokens = customfield4.textContent.split(';').map(s=>s.trim()).filter(Boolean);
    renderBenefitsList(benefitTokens);
    } catch(e){ errorDiv.textContent = e.message; console.error('[BENEFITS DEBUG] Fehler in main():', e); }
}

window.addEventListener('DOMContentLoaded', main);





</script>