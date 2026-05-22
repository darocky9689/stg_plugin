(() => {
  if (window.__jobHeaderPluginInitialized) {
    return;
  }
  window.__jobHeaderPluginInitialized = true;

  const CONFIG = {
    feedUrl: 'https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205',
    imageSelector: '.large-image-component',
    desktopImageWidthPercent: 70,
    desktopOverlayWidthPercent: 40,
    fixedImageHeight: 482,
    mobileImageHeight: 300,
    overlayHeightRatio: 0.90,
    mobileBreakpoint: 768,
    styleId: 'job-header-plugin-styles',
    initFlag: 'jobHeaderPluginInitialized',
    logos: {
      howryou: 'https://rmkcdn.successfactors.com/70ccb92e/9031dae2-6e6a-426f-8d08-c.png',
      burmeier:
        'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/burmeier.svg',
      stiegelmeyer:
        'https://www.stiegelmeyer-group.com/_assets/b8240a57c4b6735fe1567cb15f63534c/Images/stiegelmeyer-logo.svg'
    },
    arrowIcon: 'https://rmkcdn.successfactors.com/70ccb92e/3fbced59-6c09-4532-99f4-3.png'
  };

  function debounce(fn, wait) {
    let timer = null;
    return (...args) => {
      if (timer) {
        window.clearTimeout(timer);
      }
      timer = window.setTimeout(() => fn(...args), wait);
    };
  }

  function getJobReqIdFromUrl() {
    const match = window.location.href.match(/\/([0-9]+-de_DE)$/);
    return match ? match[1] : null;
  }

  function getNodeText(parent, selector) {
    const node = parent.querySelector(selector);
    return node && node.textContent ? node.textContent.trim() : '';
  }

  async function fetchJobData(jobId) {
    if (!jobId) {
      return { jobTitle: 'Jobtitel', businessUnit: '' };
    }

    try {
      const response = await fetch(CONFIG.feedUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Feed request failed with status ${response.status}`);
      }

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const parserError = xmlDoc.querySelector('parsererror');

      if (parserError) {
        throw new Error('Unable to parse XML feed');
      }

      const jobs = xmlDoc.querySelectorAll('job');
      for (const job of jobs) {
        const id = getNodeText(job, 'ID');
        if (id === jobId) {
          return {
            jobTitle: getNodeText(job, 'title') || 'Jobtitel',
            businessUnit: getNodeText(job, 'businessunit')
          };
        }
      }
    } catch (error) {
      console.warn('[job-header-plugin] Feed could not be loaded:', error);
    }

    return { jobTitle: 'Jobtitel', businessUnit: '' };
  }

  function resolveLogo(entityData) {
    const businessUnit = (entityData.businessUnit || '').toLowerCase();

    if (businessUnit.includes('howryou')) {
      return {
        src: CONFIG.logos.howryou,
        alt: 'HowRyou Logo'
      };
    }

    if (businessUnit.includes('burmeier')) {
      return {
        src: CONFIG.logos.burmeier,
        alt: 'Burmeier Logo'
      };
    }

    return {
      src: CONFIG.logos.stiegelmeyer,
      alt: 'Stiegelmeyer Logo'
    };
  }

  function injectStyles() {
    if (document.getElementById(CONFIG.styleId)) {
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = CONFIG.styleId;
    styleEl.textContent = `
      .jobtitle-layout-wrapper {
        display: flex;
        position: relative;
        width: 100%;
        align-items: flex-start;
        overflow: visible;
      }

      .jobtitle-image {
        width: ${CONFIG.desktopImageWidthPercent}%;
        flex: 0 0 ${CONFIG.desktopImageWidthPercent}%;
        height: ${CONFIG.fixedImageHeight}px;
        min-height: ${CONFIG.fixedImageHeight}px;
        max-height: ${CONFIG.fixedImageHeight}px;
        position: relative;
        overflow: hidden;
        z-index: 1;
      }

      .jobtitle-image img {
        display: block;
        width: 100% !important;
        max-width: none !important;
        height: 100% !important;
        object-fit: cover !important;
        object-position: center !important;
      }

      .jobtitle-overlay {
        position: absolute;
        right: 0;
        top: 50%;
        width: ${CONFIG.desktopOverlayWidthPercent}%;
        max-width: ${CONFIG.desktopOverlayWidthPercent}%;
        background: #395366;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 24px;
        box-sizing: border-box;
        color: #fff;
        transform: translateY(-50%);
      }

      .jobtitle-title-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
        max-width: 100%;
      }

      .jobtitle-title-icon {
        width: 24px;
        height: auto;
        margin-top: 2px;
        flex-shrink: 0;
      }

      .jobtitle-overlay h1,
      .jobtitle-overlay .jobtitle-main-title {
        margin: 0;
        font-family: Arial, sans-serif;
        font-weight: 300;
        font-size: 2em;
        line-height: 1.15;
        text-transform: uppercase;
        color: #fff !important;
        -webkit-text-fill-color: #fff;
        text-align: left;
        overflow-wrap: break-word;
        word-break: normal;
        hyphens: auto;
      }

      .jobtitle-logo-circle {
        position: absolute;
        background: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        z-index: 10;
      }

      .jobtitle-logo-circle img {
        width: 80%;
        height: 80%;
        object-fit: contain;
      }

      @media (max-width: 767px) {
        .jobtitle-layout-wrapper {
          flex-direction: column;
        }

        .jobtitle-image,
        .jobtitle-overlay {
          width: 100%;
          flex: 0 0 auto;
          position: static;
          transform: none;
        }

        .jobtitle-image {
          height: ${CONFIG.mobileImageHeight}px;
          min-height: ${CONFIG.mobileImageHeight}px;
          max-height: ${CONFIG.mobileImageHeight}px;
        }

        .jobtitle-overlay {
          width: 100%;
          max-width: none;
          align-self: stretch;
          margin-top: -26px;
          padding: 18px 16px;
          justify-content: flex-start;
          z-index: 3;
        }

        .jobtitle-overlay h1,
        .jobtitle-overlay .jobtitle-main-title {
          font-size: 1.35em;
          line-height: 1.2;
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  function createLogoCircle(logoData, size, position) {
    const circle = document.createElement('div');
    circle.className = 'jobtitle-logo-circle';
    Object.assign(circle.style, {
      width: `${size}px`,
      height: `${size}px`,
      ...position
    });

    const logo = document.createElement('img');
    logo.src = logoData.src;
    logo.alt = logoData.alt;
    circle.appendChild(logo);

    return circle;
  }

  function setOverlayHeight(overlay, largeImage, isMobile) {
    if (isMobile) {
      overlay.style.width = '';
      overlay.style.maxWidth = '';
      overlay.style.height = '';
      overlay.style.maxHeight = '';
      overlay.style.minHeight = '';
      return;
    }

    overlay.style.width = `${CONFIG.desktopOverlayWidthPercent}%`;
    overlay.style.maxWidth = `${CONFIG.desktopOverlayWidthPercent}%`;

    const imgHeight = largeImage.offsetHeight;
    if (!imgHeight) {
      return;
    }

    const overlayHeight = Math.round(imgHeight * CONFIG.overlayHeightRatio);
    overlay.style.height = `${overlayHeight}px`;
    overlay.style.maxHeight = `${overlayHeight}px`;
    overlay.style.minHeight = `${overlayHeight}px`;
  }

  function fitOverlayTitle(overlay, titleEl, isMobile) {
    const style = window.getComputedStyle(overlay);
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
    const availableHeight = overlay.clientHeight - paddingTop - paddingBottom;

    if (availableHeight <= 0) {
      return;
    }

    let fontSize = Number.parseFloat(window.getComputedStyle(titleEl).fontSize) || 32;
    const minSize = isMobile ? 16 : 18;
    let guard = 0;

    titleEl.style.whiteSpace = 'normal';
    titleEl.style.wordBreak = 'break-word';

    while (titleEl.scrollHeight > availableHeight && fontSize > minSize && guard < 40) {
      fontSize -= 1;
      titleEl.style.fontSize = `${fontSize}px`;
      guard += 1;
    }
  }

  async function buildNewLayout() {
    const largeImage = document.querySelector(CONFIG.imageSelector);
    if (!largeImage || largeImage.dataset[CONFIG.initFlag] === 'true') {
      return;
    }

    injectStyles();

    let wrapper = largeImage.closest('.jobtitle-layout-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'jobtitle-layout-wrapper';
    }

    const overlay = document.createElement('div');
    overlay.className = 'jobtitle-overlay';

    const titleRow = document.createElement('div');
    titleRow.className = 'jobtitle-title-row';

    const arrowImg = document.createElement('img');
    arrowImg.className = 'jobtitle-title-icon';
    arrowImg.src = CONFIG.arrowIcon;
    arrowImg.alt = 'Pfeil';

    const titleH1 = document.createElement('h1');
    titleH1.className = 'jobtitle-main-title';
    titleH1.textContent = 'Jobtitel';
    titleH1.style.color = '#fff';
    titleH1.style.webkitTextFillColor = '#fff';

    titleRow.appendChild(arrowImg);
    titleRow.appendChild(titleH1);
    overlay.appendChild(titleRow);

    const parent = largeImage.parentNode;
    if (!parent) {
      return;
    }

    if (!wrapper.contains(largeImage)) {
      parent.insertBefore(wrapper, largeImage);
      wrapper.appendChild(largeImage);
    }

    // Safety cleanup for leftovers from previous runs.
    wrapper.querySelectorAll('.jobtitle-overlay').forEach((node) => node.remove());
    wrapper.querySelectorAll('.jobtitle-logo-circle').forEach((node) => node.remove());

    wrapper.appendChild(overlay);
    largeImage.classList.add('jobtitle-image');

    const jobId = getJobReqIdFromUrl();
    const jobData = await fetchJobData(jobId);
    titleH1.textContent = jobData.jobTitle;

    const logoData = resolveLogo(jobData);
    let circleEl = null;

    const placeCircle = () => {
      if (circleEl && circleEl.parentNode) {
        circleEl.parentNode.removeChild(circleEl);
      }

      const isMobile = window.innerWidth < CONFIG.mobileBreakpoint;

      if (isMobile) {
        // On mobile, keep the header cleaner by hiding the floating logo.
        return;
      }

      const circleSize = 140;
      const circleLeft = (largeImage.offsetWidth || 0) - Math.round(circleSize / 2);
      circleEl = createLogoCircle(logoData, circleSize, {
        top: '-42px',
        left: `${circleLeft}px`,
        marginLeft: '-10%'
      });

      circleEl.style.transition = 'transform 0.3s, width 0.3s, height 0.3s';
      circleEl.style.transform = 'rotate(15deg) scale(0.9)';
      if (circleEl.firstElementChild) {
        circleEl.firstElementChild.style.transition = 'transform 0.3s';
        circleEl.firstElementChild.style.transform = 'scale(1)';
      }

      circleEl.addEventListener('mouseenter', () => {
        circleEl.style.transform = 'rotate(0deg) scale(0.95)';
        circleEl.style.width = `${circleSize * 1.2}px`;
        circleEl.style.height = `${circleSize * 1.2}px`;
        if (circleEl.firstElementChild) {
          circleEl.firstElementChild.style.transform = 'scale(1.05)';
        }
      });

      circleEl.addEventListener('mouseleave', () => {
        circleEl.style.transform = 'rotate(15deg) scale(0.9)';
        circleEl.style.width = `${circleSize}px`;
        circleEl.style.height = `${circleSize}px`;
        if (circleEl.firstElementChild) {
          circleEl.firstElementChild.style.transform = 'scale(1)';
        }
      });

      wrapper.appendChild(circleEl);
    };

    const refreshLayout = () => {
      const isMobile = window.innerWidth < CONFIG.mobileBreakpoint;
      setOverlayHeight(overlay, largeImage, isMobile);
      fitOverlayTitle(overlay, titleH1, isMobile);
      placeCircle();
    };

    const debouncedRefresh = debounce(refreshLayout, 120);
    window.addEventListener('resize', debouncedRefresh, { passive: true });

    const imageCandidates = largeImage.querySelectorAll('picture img, img');
    imageCandidates.forEach((img) => {
      img.style.setProperty('width', '100%', 'important');
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('height', '100%', 'important');
      img.style.setProperty('object-fit', 'cover', 'important');
      img.style.setProperty('object-position', 'center', 'important');
    });

    const imageEl = largeImage.querySelector('picture img, img');
    if (imageEl && !imageEl.complete) {
      imageEl.addEventListener('load', refreshLayout, { once: true });
    }

    refreshLayout();
    largeImage.dataset[CONFIG.initFlag] = 'true';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildNewLayout, { once: true });
  } else {
    buildNewLayout();
  }
})();
