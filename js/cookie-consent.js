(function() {
  'use strict';

  // --- Consent key names ---
  var KEY_V2  = 'ib_consent_v2';
  var KEY_OLD = 'cookie_consent';

  // --- Consent Mode v2 signal sets ---
  // Two optional categories map to five Google signals.
  // Category A: analytics (measurement) -> analytics_storage
  // Category B: marketing (advertising) -> ad_storage, ad_user_data, ad_personalization, personalization_storage
  function buildSignals(analytics, marketing) {
    return {
      'analytics_storage':      analytics ? 'granted' : 'denied',
      'ad_storage':             marketing ? 'granted' : 'denied',
      'ad_user_data':           marketing ? 'granted' : 'denied',
      'ad_personalization':     marketing ? 'granted' : 'denied',
      'personalization_storage': marketing ? 'granted' : 'denied'
    };
  }

  // --- Apply consent to Consent Mode v2 (one call) and push dataLayer event ---
  function applyConsent_(analytics, marketing) {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', buildSignals(analytics, marketing));
    }
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'ib_consent_update',
      ib_analytics: analytics ? 'granted' : 'denied',
      ib_marketing: marketing ? 'granted' : 'denied'
    });
  }

  // --- Read and migrate consent ---
  // Returns {analytics, marketing} or null if no prior decision.
  function readConsent_() {
    try {
      var raw = localStorage.getItem(KEY_V2);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj.analytics === 'boolean' && typeof obj.marketing === 'boolean') {
          return { analytics: obj.analytics, marketing: obj.marketing };
        }
      }
    } catch (e) { /* invalid JSON -> treat as new visitor */ }

    // Migration path: translate legacy key
    var old = localStorage.getItem(KEY_OLD);
    if (old) {
      var granted = (old === 'accepted');
      writeConsent_(granted, granted);  // conservative: both on or both off
      return { analytics: granted, marketing: granted };
    }

    return null;  // new visitor
  }

  // --- Write both keys ---
  // Legacy key: 'accepted' only when both categories granted; else 'rejected'.
  function writeConsent_(analytics, marketing) {
    var obj = { analytics: analytics, marketing: marketing, date: new Date().toISOString() };
    localStorage.setItem(KEY_V2, JSON.stringify(obj));
    localStorage.setItem(KEY_OLD, (analytics && marketing) ? 'accepted' : 'rejected');
  }

  // --- Check existing decision ---
  var prior = readConsent_();

  if (prior !== null) {
    // Returning visitor: restore signals without showing banner
    applyConsent_(prior.analytics, prior.marketing);
    // Expose global even for returning visitors so policy page button works
    window.ibConsent = {
      get: function() { return readConsent_(); },
      open: function() { openPanel_(); }
    };
    return;
  }

  // --- Panel builder (used by banner "Preferencias" and by ibConsent.open()) ---
  function buildPanelHTML() {
    return (
      '<div id="cc-panel" role="dialog" aria-modal="true" aria-label="Preferencias de cookies">' +
      '<div id="cc-panel-inner">' +
      '<h3 id="cc-panel-title">Preferencias de privacidade</h3>' +
      '<p id="cc-panel-desc">Selecione quais cookies voce aceita. Os necessarios nao podem ser desativados.</p>' +

      '<div class="cc-cat cc-cat-required">' +
      '<label><input type="checkbox" id="cc-req" checked disabled> Necessarios (sempre ativos)</label>' +
      '<p>Guardam suas preferencias de consentimento (<code>' + KEY_V2 + '</code>) e o identificador anonimo de limite de abuso (<code>ib_fpr</code>). Sem eles o site nao funciona corretamente.</p>' +
      '</div>' +

      '<div class="cc-cat">' +
      '<label><input type="checkbox" id="cc-analytics"> Medicao de audiencia</label>' +
      '<p>Permite analisar como os visitantes usam o site (Google Analytics via GTM). Sem este cookie, o trafego nao e contabilizado.</p>' +
      '</div>' +

      '<div class="cc-cat">' +
      '<label><input type="checkbox" id="cc-marketing"> Marketing e publicidade</label>' +
      '<p>Permite personalizar anuncios e medir conversoes (sinais de anuncio do Google via GTM). Os tres sinais sao: ad_storage, ad_user_data e ad_personalization.</p>' +
      '</div>' +

      '<div id="cc-panel-btns">' +
      '<button id="cc-panel-save">Salvar preferencias</button>' +
      '<button id="cc-panel-all">Aceitar tudo</button>' +
      '<button id="cc-panel-none">Rejeitar tudo</button>' +
      '</div>' +

      '<button id="cc-panel-close" aria-label="Fechar painel">&#x2715;</button>' +
      '</div></div>'
    );
  }

  function openPanel_() {
    var existing = document.getElementById('cc-panel');
    if (existing) {
      existing.style.display = 'flex';
      existing.removeAttribute('hidden');
      // Sync checkboxes to current decision
      var cur = readConsent_();
      if (cur) {
        var cba = document.getElementById('cc-analytics');
        var cbm = document.getElementById('cc-marketing');
        if (cba) cba.checked = cur.analytics;
        if (cbm) cbm.checked = cur.marketing;
      }
      return;
    }

    // Build panel DOM on demand (works even if banner was removed)
    var tmp = document.createElement('div');
    tmp.innerHTML = buildPanelHTML();
    var panel = tmp.firstChild;
    document.body.appendChild(panel);

    // Sync checkboxes if returning visitor re-opens
    var cur = readConsent_();
    if (cur) {
      var cba2 = panel.querySelector('#cc-analytics');
      var cbm2 = panel.querySelector('#cc-marketing');
      if (cba2) cba2.checked = cur.analytics;
      if (cbm2) cbm2.checked = cur.marketing;
    }

    function savePanel(analytics, marketing) {
      writeConsent_(analytics, marketing);
      applyConsent_(analytics, marketing);
      panel.style.display = 'none';
      // Hide banner if still visible
      var banner = document.getElementById('cc-banner');
      if (banner) {
        banner.classList.remove('cc-show');
        setTimeout(function() { banner.remove(); }, 500);
      }
    }

    panel.querySelector('#cc-panel-save').addEventListener('click', function() {
      var a = panel.querySelector('#cc-analytics').checked;
      var m = panel.querySelector('#cc-marketing').checked;
      savePanel(a, m);
    });
    panel.querySelector('#cc-panel-all').addEventListener('click', function() {
      panel.querySelector('#cc-analytics').checked = true;
      panel.querySelector('#cc-marketing').checked = true;
      savePanel(true, true);
    });
    panel.querySelector('#cc-panel-none').addEventListener('click', function() {
      panel.querySelector('#cc-analytics').checked = false;
      panel.querySelector('#cc-marketing').checked = false;
      savePanel(false, false);
    });
    panel.querySelector('#cc-panel-close').addEventListener('click', function() {
      panel.style.display = 'none';
    });

    // Escape key closes panel
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        panel.style.display = 'none';
        document.removeEventListener('keydown', onKey);
      }
    });

    requestAnimationFrame(function() { panel.style.display = 'flex'; });
  }

  // --- Banner renderer ---
  function renderBanner() {
    var css = document.createElement('style');
    css.textContent =
      '#cc-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;' +
      'background:#0D1E38;border-top:1px solid rgba(96,165,250,.2);' +
      'padding:1.25rem 1.5rem;font-family:Inter,system-ui,sans-serif;' +
      'transform:translateY(100%);transition:transform .4s ease;' +
      'box-shadow:0 -4px 24px rgba(0,0,0,.4)}' +
      '#cc-banner.cc-show{transform:translateY(0)}' +
      '#cc-inner{max-width:1140px;margin:0 auto;display:flex;' +
      'align-items:center;gap:1.25rem;flex-wrap:wrap}' +
      '#cc-text{flex:1 1 400px;color:rgba(255,255,255,.85);' +
      'font-size:.9rem;line-height:1.6;margin:0}' +
      '#cc-text a{color:#60A5FA;text-decoration:underline}' +
      '#cc-text a:hover{color:#93c5fd}' +
      '#cc-btns{display:flex;gap:.75rem;flex-shrink:0}' +
      '#cc-accept{background:#2563EB;color:#fff;border:none;' +
      'padding:.55rem 1.5rem;border-radius:6px;font-size:.875rem;' +
      'font-weight:600;cursor:pointer;font-family:inherit;' +
      'transition:background .2s}' +
      '#cc-accept:hover{background:#1D4ED8}' +
      '#cc-reject{background:transparent;color:rgba(255,255,255,.7);' +
      'border:1px solid rgba(255,255,255,.25);padding:.55rem 1.5rem;' +
      'border-radius:6px;font-size:.875rem;font-weight:500;' +
      'cursor:pointer;font-family:inherit;transition:border-color .2s,color .2s}' +
      '#cc-reject:hover{color:#fff;border-color:rgba(255,255,255,.5)}' +
      '#cc-prefs{background:transparent;color:#60A5FA;' +
      'border:1px solid rgba(96,165,250,.4);padding:.55rem 1.1rem;' +
      'border-radius:6px;font-size:.875rem;font-weight:500;' +
      'cursor:pointer;font-family:inherit;transition:border-color .2s,color .2s}' +
      '#cc-prefs:hover{color:#93c5fd;border-color:rgba(147,197,253,.6)}' +
      '@media(max-width:600px){#cc-inner{flex-direction:column;text-align:center}' +
      '#cc-btns{width:100%;justify-content:center}}' +
      // Panel styles
      '#cc-panel{display:none;position:fixed;inset:0;z-index:100000;' +
      'background:rgba(0,0,0,.6);align-items:center;justify-content:center;' +
      'font-family:Inter,system-ui,sans-serif}' +
      '#cc-panel-inner{background:#0D1E38;border:1px solid rgba(96,165,250,.2);' +
      'border-radius:8px;padding:2rem;max-width:520px;width:90%;position:relative;' +
      'color:rgba(255,255,255,.85);max-height:90vh;overflow-y:auto}' +
      '#cc-panel-title{font-size:1.1rem;font-weight:700;color:#fff;margin:0 0 .5rem}' +
      '#cc-panel-desc{font-size:.875rem;opacity:.8;margin:0 0 1.25rem}' +
      '.cc-cat{border:1px solid rgba(96,165,250,.15);border-radius:6px;' +
      'padding:.75rem 1rem;margin-bottom:.75rem}' +
      '.cc-cat-required{opacity:.7}' +
      '.cc-cat label{display:flex;align-items:center;gap:.5rem;' +
      'font-size:.875rem;font-weight:600;cursor:pointer;color:#fff}' +
      '.cc-cat-required label{cursor:default}' +
      '.cc-cat p{font-size:.8rem;opacity:.75;margin:.4rem 0 0;line-height:1.5}' +
      '.cc-cat code{font-size:.75rem;background:rgba(96,165,250,.1);' +
      'padding:.1rem .3rem;border-radius:3px}' +
      '#cc-panel-btns{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1.25rem}' +
      '#cc-panel-save{background:#2563EB;color:#fff;border:none;' +
      'padding:.5rem 1.2rem;border-radius:6px;font-size:.875rem;' +
      'font-weight:600;cursor:pointer;font-family:inherit}' +
      '#cc-panel-all{background:transparent;color:rgba(255,255,255,.7);' +
      'border:1px solid rgba(255,255,255,.25);padding:.5rem 1rem;' +
      'border-radius:6px;font-size:.875rem;cursor:pointer;font-family:inherit}' +
      '#cc-panel-none{background:transparent;color:rgba(255,255,255,.5);' +
      'border:1px solid rgba(255,255,255,.15);padding:.5rem 1rem;' +
      'border-radius:6px;font-size:.875rem;cursor:pointer;font-family:inherit}' +
      '#cc-panel-close{position:absolute;top:.75rem;right:.75rem;' +
      'background:transparent;border:none;color:rgba(255,255,255,.5);' +
      'font-size:1.1rem;cursor:pointer;line-height:1;padding:.25rem .4rem}' +
      '#cc-panel-close:hover{color:#fff}';
    document.head.appendChild(css);

    var banner = document.createElement('div');
    banner.id = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Consentimento de cookies');
    banner.innerHTML =
      '<div id="cc-inner">' +
      '<p id="cc-text">Este site utiliza cookies e tecnologias semelhantes para melhorar sua experiencia. ' +
      'Veja nossa <a href="/politica-de-privacidade.html">Politica de Privacidade</a> e escolha suas preferencias.</p>' +
      '<div id="cc-btns">' +
      '<button id="cc-accept">Aceitar tudo</button>' +
      '<button id="cc-prefs">Preferencias</button>' +
      '<button id="cc-reject">Rejeitar tudo</button>' +
      '</div></div>';
    document.body.appendChild(banner);

    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        banner.classList.add('cc-show');
      });
    });

    function hideBanner(analytics, marketing) {
      writeConsent_(analytics, marketing);
      applyConsent_(analytics, marketing);
      banner.classList.remove('cc-show');
      setTimeout(function() { banner.remove(); }, 500);
    }

    document.getElementById('cc-accept').addEventListener('click', function() {
      hideBanner(true, true);
    });
    document.getElementById('cc-reject').addEventListener('click', function() {
      hideBanner(false, false);
    });
    document.getElementById('cc-prefs').addEventListener('click', function() {
      openPanel_();
    });
  }

  // --- Expose global API ---
  window.ibConsent = {
    get: function() { return readConsent_(); },
    open: function() { openPanel_(); }
  };

  // Defer banner DOM work to idle so it never blocks initial paint (DIAG-PERF-012).
  if ('requestIdleCallback' in window) {
    requestIdleCallback(renderBanner, { timeout: 1000 });
  } else {
    setTimeout(renderBanner, 100);
  }
})();
