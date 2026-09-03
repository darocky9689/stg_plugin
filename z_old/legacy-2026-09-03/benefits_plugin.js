<script>
// Benefits Design (eigenständig, unabhängige Klassen)
const SCRIPT_EL = document.currentScript || (function(){ const s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
let BENEFITS_ROOT = null; let STYLE_INJECTED = false;

function injectStyles(){
    const css = `
    .benefitsdesign-wrapper { width:100%; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; margin:40px 0 24px; }
    .benefitsdesign-inner { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:40px 56px; padding:32px 48px; background:#ffffff; border-radius:24px; max-width:1200px; width:100%; box-sizing:border-box; font-family:inherit; justify-items:center; justify-content:center; }
    .benefitsdesign-title { grid-column: 1 / -1; width:100%; text-align:left; margin:0; margin-bottom:8px; }
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

function ensureStructure(){
    if (!SCRIPT_EL){ console.warn('[BENEFITS DEBUG] Kein Script Element – fallback body'); BENEFITS_ROOT = BENEFITS_ROOT || document.body; }
    else if (!BENEFITS_ROOT){
        const maybeRoot = SCRIPT_EL.nextElementSibling;
        if (maybeRoot && maybeRoot.classList && maybeRoot.classList.contains('benefitsdesign-wrapper')) { BENEFITS_ROOT = maybeRoot; }
        else { BENEFITS_ROOT = document.createElement('div'); SCRIPT_EL.parentNode.insertBefore(BENEFITS_ROOT, SCRIPT_EL.nextSibling); }
    }
    if (!BENEFITS_ROOT){ console.error('[BENEFITS DEBUG] Root fehlt'); return; }
    BENEFITS_ROOT.innerHTML='';
    BENEFITS_ROOT.className = 'benefitsdesign-wrapper';
    const title = document.createElement('h3'); title.className='benefitsdesign-title'; title.textContent='Benefits'; BENEFITS_ROOT.appendChild(title);
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
    36: { text: 'Mitarbeiter­rabatte', img: benefitsByText['Mitarbeiter­rabatte'] || benefitsByText['Mitarbeiterrabatte'] },
    37: { text: 'Gesundheits­vorsorge', img: benefitsByText['Gesundheits­vorsorge'] || benefitsByText['Gesundheitsvorsorge'] },
    38: { text: 'Modern ausgestattete Arbeitsplätze', img: benefitsByText['Modern ausgestattete Arbeitsplätze'] },
    39: { text: 'Betriebliche Altersvorsorge', img: benefitsByText['Betriebliche Altersvorsorge'] },
    41: { text: '30 Tage Urlaub', img: benefitsByText['30 Tage Urlaub'] },
    56: { text: 'Individuelle Weiterbildung', img: benefitsByText['Individuelle Weiterbildung'] },
    76: { text: 'Spannende Aufgaben, zukunftssicherer Arbeitsplatz', img: benefitsByText['Spannende Aufgaben, zukunftssicherer Arbeitsplatz'] },
    77: { text: 'Jobrad', img: benefitsByText['Jobrad'] },
    78: { text: 'kostenlose Parkplätze', img: benefitsByText['kostenlose Parkplätze'] },
    79: { text: 'Barriere­freiheit', img: benefitsByText['Barriere­freiheit'] || benefitsByText['Barrierefreiheit'] },
    80: { text: 'Coaching /Mentoring', img: benefitsByText['Coaching /Mentoring'] },
    81: { text: 'Familien­freundlichkeit', img: benefitsByText['Familien­freundlichkeit'] || benefitsByText['Familienfreundlichkeit'] },
    82: { text: 'Firmen­eigene Kantine', img: benefitsByText['Firmen­eigene Kantine'] || benefitsByText['Firmen-eigene Kantine'] },
    83: { text: 'Firmenwagen', img: benefitsByText['Firmenwagen'] },
    84: { text: 'Fitnessraum für Mitarbeiter/­innen', img: benefitsByText['Fitnessraum für Mitarbeiter/­innen'] || benefitsByText['Fitnessraum für Mitarbeiter/-innen'] },
    85: { text: 'Flexible Arbeitszeit', img: benefitsByText['Flexible Arbeitszeit'] },
    86: { text: 'Gute Verkehrsanbindung', img: benefitsByText['Gute Verkehrsanbindung'] },
    90: { text: 'Mitarbeiter-­Events', img: benefitsByText['Mitarbeiter-­Events'] || benefitsByText['Mitarbeiter-Events'] },
    89: { text: 'Modernes IT-Equipment', img: benefitsByText['Modernes IT-Equipment'] },
    42: { text: '29 Tage Urlaub', img: benefitsByText['29 Tage Urlaub'] },
    88: { text: 'Attraktive Vergütung', img: benefitsByText['Attraktive Vergütung'] },
    40: { text: 'Remote Work möglich', img: benefitsByText['Remote Work möglich'] },
    87: { text: 'Mitgestaltungsmöglichkeiten', img: benefitsByText['Mitgestaltungsmöglichkeiten'] || null }
};

function getJobReqIdFromUrl() {
    const url = window.location.href; console.log('[DEBUG] Aktuelle URL:', url);
    const match = url.match(/\/([0-9]+-de_DE)$/); const jobReqId = match ? match[1] : null; console.log('[DEBUG] Extrahierte Job-Req-ID:', jobReqId); return jobReqId;
}
async function fetchXmlFeed(feedUrl) { console.log('[DEBUG] Abrufe XML-Feed:', feedUrl); const r = await fetch(feedUrl); console.log('[DEBUG] HTTP-Status:', r.status); if (!r.ok) throw new Error('Feed konnte nicht geladen werden.'); const t = await r.text(); console.log('[DEBUG] XML-Feed Länge:', t.length); return new window.DOMParser().parseFromString(t, 'application/xml'); }
function findJobNodeById(xmlDoc, jobReqId) { const jobs = xmlDoc.querySelectorAll('job'); console.log('[DEBUG] Anzahl Jobs im Feed:', jobs.length); for (const job of jobs) { const idNode = job.querySelector('ID'); if (idNode) { if (idNode.textContent === jobReqId) { console.log('[DEBUG] Passender Job-Knoten gefunden.'); return job; } } } console.warn('[DEBUG] Kein passender Job-Knoten gefunden für ID:', jobReqId); return null; }

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
        const xmlDoc = await fetchXmlFeed('https://stiegemeyt1.valhalla55.stage.jobs2web.com/feed/430205');
    const jobNode = findJobNodeById(xmlDoc, jobReqId); if(!jobNode){ errorDiv.textContent='Benefits werden ergänzt'; return; }
        const customfield4 = jobNode.querySelector('customfield4'); if(!customfield4 || !customfield4.textContent.trim()){ errorDiv.textContent='Keine Benefits für diesen Job hinterlegt.'; return; }
    const benefitTokens = customfield4.textContent.split(';').map(s=>s.trim()).filter(Boolean);
    renderBenefitsList(benefitTokens);
    } catch(e){ errorDiv.textContent = e.message; console.error('[BENEFITS DEBUG] Fehler in main():', e); }
}

window.addEventListener('DOMContentLoaded', main);


</script>