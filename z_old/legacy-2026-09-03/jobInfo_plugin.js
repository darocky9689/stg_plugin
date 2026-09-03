

// Eigenständiges Job Info Design (nicht mit Overlay mischen)
const JOBINFO_CONFIG = {
  debugJob: null, // z.B. "123456-de_DE" für Test
  feedUrl: 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205',
  requestTimeoutMs: 8000,
  assetsBase: 'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c'
};

const JOBINFO_ASSETS = {
  companyIcon: `${JOBINFO_CONFIG.assetsBase}/Icons/Jobs/Icon-Company.svg`,
  locationIcon: `${JOBINFO_CONFIG.assetsBase}/Icons/Jobs/Icon-Location.svg`,
  workloadIcon: `${JOBINFO_CONFIG.assetsBase}/Icons/Jobs/Icon-Workload.svg`,
  entryDateIcon: `${JOBINFO_CONFIG.assetsBase}/Icons/Jobs/Icon-EntryDate.svg`,
  howryouLogo: 'https://rmkcdn.successfactors.com/70ccb92e/61920400-cd1b-4fd3-9830-a.png',
  burmeierLogo: `${JOBINFO_CONFIG.assetsBase}/Images/burmeier.svg`,
  stiegelmeyerLogo: `${JOBINFO_CONFIG.assetsBase}/Images/stiegelmeyer-logo.svg`
};

const JOBINFO_STYLE_ID = 'jobinfodesign-style';
const JOBINFO_WRAPPER_ID = 'jobinfodesign-root';
const JOBINFO_SCRIPT_ANCHOR = document.currentScript; // Positionierungsanker
const JOBINFO_DEBUG = Boolean(JOBINFO_CONFIG.debugJob);

function logDebug(...args) {
  if (JOBINFO_DEBUG) console.log('[JOBINFO DEBUG]', ...args);
}

function injectJobInfoStyles() {
  let style = document.getElementById(JOBINFO_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = JOBINFO_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `
  .jobinfodesign-wrapper {
    width:100%;
    display:flex;
    justify-content:stretch;
    margin:42px 0 24px;
  }
  .jobinfodesign-inner {
    --jobinfo-accent-blue:#395366;
    --jobinfo-tile-bg:#ffffff;
    position:relative;
    overflow:hidden;
    display:flex;
    flex-wrap:nowrap;
    gap:18px;
    padding:22px 20px;
    background:transparent;
    border:0;
    border-radius:0;
    box-shadow:none;
    max-width:none;
    width:100%;
    box-sizing:border-box;
    font-family:inherit;
    justify-content:space-between;
    align-items:stretch;
  }
  .jobinfodesign-inner:before {
    content:'';
    position:absolute;
    left:0;
    right:0;
    top:0;
    display:none;
  }
  .jobinfodesign-item {
    display:flex;
    flex-direction:column;
    justify-content:center;
    gap:4px;
    min-width:0;
    flex:1 1 0;
    align-items:center;
    text-align:center;
    background:var(--jobinfo-tile-bg);
    border:2px solid var(--jobinfo-accent-blue);
    border-radius:8px;
    box-shadow:0 2px 6px rgba(0, 35, 75, 0.10);
    padding:14px 12px;
    min-height:168px;
    animation:jobinfo-fade-up .28s ease-out both;
  }
  .jobinfodesign-item.company { flex:1 1 0; }
  .jobinfodesign-item:nth-child(2) { animation-delay:.04s; }
  .jobinfodesign-item:nth-child(3) { animation-delay:.08s; }
  .jobinfodesign-item:nth-child(4) { animation-delay:.12s; }
  .jobinfodesign-icon {
    width:38px;
    height:38px;
    margin-bottom:0;
    object-fit:contain;
    background:#003269;
    border-radius:50%;
    padding:7px;
    box-sizing:border-box;
    border:1px solid rgba(255,255,255,0.45);
    box-shadow:0 2px 7px rgba(0, 50, 105, 0.25);
  }
  .jobinfodesign-label {
    font-size:10px;
    letter-spacing:.8px;
    text-transform:uppercase;
    font-weight:700;
    color:#5f7282;
    margin-bottom:0;
  }
  .jobinfodesign-value {
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:14px;
    font-weight:600;
    line-height:1.3;
    color:#1f2f3d;
    word-break:break-word;
    min-height:36px;
    max-width:220px;
  }
  .jobinfodesign-companylogo {
    width:auto;
    max-width:148px;
    height:44px;
    object-fit:contain;
    margin-top:0;
  }

  @keyframes jobinfo-fade-up {
    from { opacity:0; transform:translateY(6px); }
    to { opacity:1; transform:translateY(0); }
  }

  @media (max-width: 900px) {
    .jobinfodesign-inner {
      gap:12px;
      padding:18px 12px;
    }
    .jobinfodesign-item {
      padding:12px 8px 10px;
    }
  }
  @media (max-width: 760px) {
    .jobinfodesign-wrapper { margin:32px 0 22px; }
    .jobinfodesign-inner {
      flex-wrap:wrap;
      gap:10px;
      border-radius:0;
    }
    .jobinfodesign-item {
      flex:1 1 calc(50% - 8px);
    }
  }
  @media (max-width: 520px) {
    .jobinfodesign-inner {
      padding:12px 10px;
      gap:8px;
    }
    .jobinfodesign-item {
      flex-basis:100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .jobinfodesign-item { animation:none; }
  }
  `;
}

async function fetchJobInfo(jobId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JOBINFO_CONFIG.requestTimeoutMs);

  try {
    const response = await fetch(JOBINFO_CONFIG.feedUrl, {
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Feed request failed (${response.status})`);
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Feed XML is invalid');
    }

    const jobs = xmlDoc.querySelectorAll('job');
    for (const job of jobs) {
      const idNode = job.querySelector('ID');
      if (idNode && idNode.textContent && idNode.textContent.trim() === jobId) {
        return {
          businessUnit: job.querySelector('businessunit')?.textContent?.trim() || '',
          location: job.querySelector('location')?.textContent?.trim() || '',
          shifttype: job.querySelector('shifttype')?.textContent?.trim() || '',
          entryDate: job.querySelector('customfield5')?.textContent?.trim() || ''
        };
      }
    }
    return { businessUnit: '', location: '', shifttype: '', entryDate: '' };
  } finally {
    clearTimeout(timeoutId);
  }
}

function getJobReqIdFromUrl() {
  try {
    const { pathname } = new URL(window.location.href);
    const match = pathname.match(/\/(\d+-[a-z]{2}_[A-Z]{2})\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
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
  outer.id = JOBINFO_WRAPPER_ID;
  const inner = document.createElement('div'); inner.className = 'jobinfodesign-inner';

  // Unternehmen: Icon + Label + dynamisches Logo
  const companyItem = document.createElement('div'); companyItem.className = 'jobinfodesign-item company';
  const companyIcon = document.createElement('img');
  companyIcon.src = JOBINFO_ASSETS.companyIcon;
  companyIcon.alt = 'Unternehmen';
  companyIcon.className = 'jobinfodesign-icon';
  const companyLabel = document.createElement('div'); companyLabel.className = 'jobinfodesign-label'; companyLabel.textContent = 'Unternehmen';
  const companyLogo = document.createElement('img');
  const bu = (info.businessUnit || '').toLowerCase();
  if (bu.includes('howryou')) { companyLogo.src = JOBINFO_ASSETS.howryouLogo; companyLogo.alt = 'HowRyou'; }
  else if (bu.includes('burmeier')) { companyLogo.src = JOBINFO_ASSETS.burmeierLogo; companyLogo.alt = 'Burmeier'; }
  else { companyLogo.src = JOBINFO_ASSETS.stiegelmeyerLogo; companyLogo.alt = 'Stiegelmeyer'; }
  companyLogo.className = 'jobinfodesign-companylogo';
  companyItem.appendChild(companyIcon);
  companyItem.appendChild(companyLabel);
  companyItem.appendChild(companyLogo);
  inner.appendChild(companyItem);

  inner.appendChild(createItem(JOBINFO_ASSETS.locationIcon, 'Standort', info.location));
  inner.appendChild(createItem(JOBINFO_ASSETS.workloadIcon, 'Auslastung', info.shifttype));
  inner.appendChild(createItem(JOBINFO_ASSETS.entryDateIcon, 'Einstiegsdatum', info.entryDate));

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
  if (document.getElementById(JOBINFO_WRAPPER_ID)) {
    logDebug('Bereits gerendert, überspringe Initialisierung.');
    return;
  }

  const jobId = JOBINFO_CONFIG.debugJob || getJobReqIdFromUrl();
  if (JOBINFO_CONFIG.debugJob) logDebug('debug_job aktiv:', JOBINFO_CONFIG.debugJob);
  if (!jobId) {
    logDebug('Keine Job-ID gefunden.');
    return;
  }
  try {
    const info = await fetchJobInfo(jobId);
    logDebug('Info geladen:', info);
    const dom = buildJobInfoDOM(info);
    placeJobInfo(dom);
  } catch (e) {
    if (JOBINFO_DEBUG) {
      console.error('[JOBINFO DEBUG] Fehler beim Laden:', e);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initJobInfoDesign);
} else {
  initJobInfoDesign();
}
