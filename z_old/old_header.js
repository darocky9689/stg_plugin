<script>

// Hilfsfunktionen
async function fetchJobTitleAndBusinessUnit(jobId) {
  const feedUrl = 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205';
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
