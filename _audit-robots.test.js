// Valida que os Disallow do grupo "*" realmente se aplicam aos robôs que
// antes tinham grupo próprio com apenas "Allow: /".
const fs = require('fs');
const assert = require('assert');
const robotsParser = require('robots-parser');

const src = process.argv[2] || 'robots.txt';
const body = fs.readFileSync(src, 'utf8');
const BASE = 'https://inteligenciabrasil.seg.br';
const robots = robotsParser(BASE + '/robots.txt', body);

const BLOCKED = ['/x87g/', '/x87g/gtm.js', '/.planning/x', '/cdn-cgi/x',
  '/cdn-cgi/l/email-protection', '/a.pdf'];
const ALLOWED = ['/blog/', '/', '/lp/blue-team/', '/politica-de-privacidade.html'];
const INDEXERS = ['Googlebot', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot',
  'YandexBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot',
  'GPTBot', 'Google-Extended', 'Applebot', 'CCBot', 'Amazonbot', 'Bytespider'];

let fail = 0;
const bad = (m) => { console.log('  FAIL ' + m); fail++; };

for (const ua of INDEXERS) {
  for (const p of BLOCKED) {
    if (robots.isAllowed(BASE + p, ua) !== false) bad(`${ua} deveria ser BLOQUEADO em ${p}`);
  }
  for (const p of ALLOWED) {
    if (robots.isAllowed(BASE + p, ua) !== true) bad(`${ua} deveria ser LIBERADO em ${p}`);
  }
}

// Scrapers com grupo próprio: regra diferente, mas Disallow repetidos.
for (const ua of ['AhrefsBot', 'SemrushBot']) {
  for (const p of BLOCKED) {
    if (robots.isAllowed(BASE + p, ua) !== false) bad(`${ua} deveria ser BLOQUEADO em ${p}`);
  }
  if (robots.isAllowed(BASE + '/blog/', ua) !== true) bad(`${ua} deveria ser LIBERADO em /blog/`);
  if (robots.getCrawlDelay(ua) !== 30) bad(`${ua} perdeu o Crawl-delay: 30`);
}

// Bloqueio total preservado.
for (const ua of ['MJ12bot', 'DotBot']) {
  for (const p of [...BLOCKED, ...ALLOWED]) {
    if (robots.isAllowed(BASE + p, ua) !== false) bad(`${ua} deveria ser BLOQUEADO em ${p}`);
  }
}

assert.strictEqual(robots.getSitemaps().length, 1, 'sitemap deve continuar declarado');

console.log(fail === 0
  ? `OK robots.txt: ${INDEXERS.length} indexadores + 4 scrapers validados`
  : `${fail} falha(s)`);
process.exit(fail === 0 ? 0 : 1);
