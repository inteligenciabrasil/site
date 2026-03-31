(function() {
  'use strict';

  if (localStorage.getItem('cookie_consent')) return;

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
    '@media(max-width:600px){#cc-inner{flex-direction:column;text-align:center}' +
    '#cc-btns{width:100%;justify-content:center}}';
  document.head.appendChild(css);

  var banner = document.createElement('div');
  banner.id = 'cc-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Consentimento de cookies');
  banner.innerHTML =
    '<div id="cc-inner">' +
    '<p id="cc-text">Este site utiliza cookies e tecnologias semelhantes para melhorar sua experi\u00eancia. ' +
    'Ao continuar navegando, voc\u00ea concorda com nossa ' +
    '<a href="/politica-de-privacidade.html">Pol\u00edtica de Privacidade</a>.</p>' +
    '<div id="cc-btns">' +
    '<button id="cc-accept">Aceitar</button>' +
    '<button id="cc-reject">Rejeitar</button>' +
    '</div></div>';
  document.body.appendChild(banner);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      banner.classList.add('cc-show');
    });
  });

  function hide(value) {
    localStorage.setItem('cookie_consent', value);
    banner.classList.remove('cc-show');
    if (value === 'accepted') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cookie_consent_granted' });
    }
    setTimeout(function() { banner.remove(); }, 500);
  }

  document.getElementById('cc-accept').addEventListener('click', function() { hide('accepted'); });
  document.getElementById('cc-reject').addEventListener('click', function() { hide('rejected'); });
})();
