/**
 * Security Headers Analyzer
 * Analisador de headers de seguranca HTTP.
 * Parseia output de curl -I / get response headers / paste cru e gera score A+ a F.
 */
(function () {
    'use strict';

    // ============================================================
    // CATALOGO DE HEADERS AVALIADOS
    // weight: pontuacao maxima quando configurado corretamente
    // info: headers cuja presenca eh negativa (info disclosure)
    // ============================================================
    var HEADERS = [
        {
            name: 'Strict-Transport-Security',
            key: 'strict-transport-security',
            weight: 20,
            type: 'security',
            doc: 'Forca o navegador a usar HTTPS por um periodo definido, prevenindo downgrade attacks e SSL stripping.',
            ideal: 'max-age=31536000; includeSubDomains; preload',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'Header HSTS ausente. Sem ele, o navegador pode aceitar conexoes HTTP iniciais e ficar vulneravel a downgrade attacks.' };
                var maxAge = (val.match(/max-age\s*=\s*(\d+)/i) || [])[1];
                maxAge = maxAge ? parseInt(maxAge, 10) : 0;
                var includeSub = /includeSubDomains/i.test(val);
                var preload = /preload/i.test(val);
                if (maxAge >= 31536000 && includeSub && preload) return { status: 'ok', score: 20, msg: 'HSTS configurado de forma exemplar (>= 1 ano, includeSubDomains, preload).' };
                if (maxAge >= 31536000 && includeSub) return { status: 'ok', score: 18, msg: 'HSTS forte. Considere adicionar diretiva preload e submeter ao hstspreload.org para protecao mesmo no primeiro acesso.' };
                if (maxAge >= 15552000) return { status: 'warn', score: 12, msg: 'max-age presente mas faltam includeSubDomains e/ou preload. Subdominios podem ficar expostos.' };
                if (maxAge > 0) return { status: 'warn', score: 6, msg: 'max-age muito curto (< 6 meses). Recomendado >= 31536000 (1 ano) para entrar em listas preload.' };
                return { status: 'miss', score: 0, msg: 'HSTS presente mas sem max-age valido.' };
            }
        },
        {
            name: 'Content-Security-Policy',
            key: 'content-security-policy',
            weight: 25,
            type: 'security',
            doc: 'Define quais origens de conteudo (scripts, imagens, frames, etc) o navegador pode carregar. Defesa principal contra XSS.',
            ideal: "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'CSP ausente. Sem CSP, a aplicacao depende exclusivamente de sanitizacao do lado da aplicacao para mitigar XSS.' };
                var lower = val.toLowerCase();
                var hasUnsafeInline = /unsafe-inline/.test(lower);
                var hasUnsafeEval = /unsafe-eval/.test(lower);
                var hasWildcard = /(\*\s|^\*|\s\*$|\s\*\s)/.test(lower);
                var hasDataScript = /script-src[^;]*data:/.test(lower);
                var hasDefaultSrc = /default-src/.test(lower);
                var hasFrameAncestors = /frame-ancestors/.test(lower);
                var hasObjectSrc = /object-src/.test(lower);
                var score = 25;
                var issues = [];
                if (hasUnsafeInline) { score -= 8; issues.push("contem 'unsafe-inline' (permite scripts inline)"); }
                if (hasUnsafeEval) { score -= 5; issues.push("contem 'unsafe-eval' (permite eval/Function)"); }
                if (hasWildcard) { score -= 4; issues.push("usa wildcard '*' em diretivas (origem ampla demais)"); }
                if (hasDataScript) { score -= 3; issues.push("permite data: em script-src (vetor para XSS)"); }
                if (!hasDefaultSrc) { score -= 2; issues.push('sem default-src (fallback ausente)'); }
                if (!hasFrameAncestors) { score -= 2; issues.push('sem frame-ancestors (clickjacking permanece via X-Frame-Options legacy)'); }
                if (!hasObjectSrc && !hasDefaultSrc) { score -= 1; issues.push('sem object-src (plugins legados nao restringidos)'); }
                if (score >= 23) return { status: 'ok', score: score, msg: 'CSP bem configurada com fontes restritas.' };
                if (score >= 15) return { status: 'warn', score: score, msg: 'CSP presente mas com fraquezas: ' + issues.join('; ') + '.' };
                return { status: 'warn', score: Math.max(score, 5), msg: 'CSP permissiva. Problemas: ' + issues.join('; ') + '.' };
            }
        },
        {
            name: 'X-Frame-Options',
            key: 'x-frame-options',
            weight: 10,
            type: 'security',
            doc: 'Protege contra clickjacking impedindo que a pagina seja embutida em frame/iframe de outras origens. CSP frame-ancestors eh a substituicao moderna.',
            ideal: 'DENY (ou SAMEORIGIN)',
            evaluate: function (val, allHeaders) {
                var csp = allHeaders['content-security-policy'];
                var hasFrameAncestors = csp && /frame-ancestors/i.test(csp);
                if (!val && !hasFrameAncestors) return { status: 'miss', score: 0, msg: 'Nao ha X-Frame-Options nem CSP frame-ancestors. Pagina pode ser embutida em iframe malicioso (clickjacking).' };
                if (!val && hasFrameAncestors) return { status: 'ok', score: 10, msg: 'X-Frame-Options ausente, mas CSP frame-ancestors esta configurada (substituto moderno). OK.' };
                var lower = val.toLowerCase().trim();
                if (lower === 'deny' || lower === 'sameorigin') return { status: 'ok', score: 10, msg: 'Configuracao adequada contra clickjacking.' };
                if (lower.indexOf('allow-from') === 0) return { status: 'warn', score: 5, msg: 'ALLOW-FROM esta obsoleto e nao eh suportado pelos navegadores modernos. Use CSP frame-ancestors.' };
                return { status: 'warn', score: 3, msg: 'Valor incomum: "' + val + '". Use DENY ou SAMEORIGIN.' };
            }
        },
        {
            name: 'X-Content-Type-Options',
            key: 'x-content-type-options',
            weight: 5,
            type: 'security',
            doc: 'Impede que o navegador tente adivinhar o tipo MIME do conteudo (MIME sniffing). Bloqueia uma classe de ataques onde arquivos enganam o tipo declarado.',
            ideal: 'nosniff',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'Header ausente. Recomendado em qualquer aplicacao: previne ataques baseados em MIME sniffing.' };
                if (/nosniff/i.test(val)) return { status: 'ok', score: 5, msg: 'Configurado corretamente.' };
                return { status: 'warn', score: 0, msg: 'Valor incomum. Use "nosniff".' };
            }
        },
        {
            name: 'Referrer-Policy',
            key: 'referrer-policy',
            weight: 10,
            type: 'security',
            doc: 'Controla quanta informacao do Referer (URL de origem) eh enviada em navegacoes e requisicoes cross-origin. Protege privacidade e evita vazamento de tokens em URLs.',
            ideal: 'strict-origin-when-cross-origin (ou no-referrer)',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'Sem Referrer-Policy, o navegador usa default que pode vazar URLs completas em requisicoes cross-origin.' };
                var lower = val.toLowerCase().trim().split(',')[0].trim();
                var safe = ['no-referrer', 'no-referrer-when-downgrade', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
                var unsafe = ['unsafe-url', 'origin-when-cross-origin', 'origin'];
                if (safe.indexOf(lower) !== -1) return { status: 'ok', score: 10, msg: 'Politica de Referer adequada.' };
                if (unsafe.indexOf(lower) !== -1) return { status: 'warn', score: 4, msg: 'Politica "' + lower + '" pode vazar mais informacoes do que o necessario. Prefira strict-origin-when-cross-origin.' };
                return { status: 'warn', score: 2, msg: 'Valor incomum: "' + val + '".' };
            }
        },
        {
            name: 'Permissions-Policy',
            key: 'permissions-policy',
            weight: 10,
            type: 'security',
            doc: 'Controla quais APIs do navegador (camera, microfone, geolocalizacao, USB, etc) a pagina pode usar - e quais podem ser delegadas a iframes embutidos.',
            ideal: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
            evaluate: function (val, allHeaders) {
                if (!val) {
                    var legacy = allHeaders['feature-policy'];
                    if (legacy) return { status: 'warn', score: 4, msg: 'Apenas Feature-Policy (legado) detectada. Migre para Permissions-Policy.' };
                    return { status: 'miss', score: 0, msg: 'Header ausente. Sem ele, todas as APIs do navegador ficam disponiveis (ou seguem default amplo).' };
                }
                var directives = val.split(',').length;
                if (directives >= 4) return { status: 'ok', score: 10, msg: 'Politica robusta com multiplas APIs restritas.' };
                if (directives >= 2) return { status: 'warn', score: 6, msg: 'Politica presente mas restringe poucas APIs. Considere adicionar camera, microphone, geolocation, payment, usb.' };
                return { status: 'warn', score: 3, msg: 'Politica muito limitada.' };
            }
        },
        {
            name: 'Cross-Origin-Opener-Policy',
            key: 'cross-origin-opener-policy',
            weight: 7,
            type: 'security',
            doc: 'Isola o browsing context da pagina de janelas abertas por outras origens. Mitiga Spectre-class side-channel attacks e habilita SharedArrayBuffer/high-resolution timers.',
            ideal: 'same-origin (ou same-origin-allow-popups)',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'COOP ausente. Recomendado em aplicacoes sensiveis ou que usam APIs de alta resolucao.' };
                var lower = val.toLowerCase().trim();
                if (lower === 'same-origin') return { status: 'ok', score: 7, msg: 'COOP isolada (same-origin). Maximo de isolamento.' };
                if (lower === 'same-origin-allow-popups') return { status: 'ok', score: 6, msg: 'COOP same-origin-allow-popups. Bom equilibrio entre isolamento e UX.' };
                if (lower === 'unsafe-none') return { status: 'warn', score: 0, msg: 'unsafe-none desabilita o isolamento.' };
                return { status: 'warn', score: 2, msg: 'Valor incomum: "' + val + '".' };
            }
        },
        {
            name: 'Cross-Origin-Embedder-Policy',
            key: 'cross-origin-embedder-policy',
            weight: 4,
            type: 'security',
            doc: 'Exige que recursos cross-origin opt-in para serem carregados (CORS ou CORP). Junto com COOP, habilita o estado "cross-origin isolated" e algumas APIs poderosas.',
            ideal: 'require-corp',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'COEP ausente. So eh critico se a pagina precisa de cross-origin isolation.' };
                var lower = val.toLowerCase().trim();
                if (lower === 'require-corp' || lower === 'credentialless') return { status: 'ok', score: 4, msg: 'COEP configurada para isolamento cross-origin.' };
                return { status: 'warn', score: 1, msg: 'Valor incomum: "' + val + '".' };
            }
        },
        {
            name: 'Cross-Origin-Resource-Policy',
            key: 'cross-origin-resource-policy',
            weight: 4,
            type: 'security',
            doc: 'Bloqueia que outras origens carreguem recursos desta resposta (imagens, scripts). Protege contra side-channel attacks via leakage de recursos.',
            ideal: 'same-origin (ou same-site)',
            evaluate: function (val) {
                if (!val) return { status: 'miss', score: 0, msg: 'CORP ausente. Sem ela, recursos podem ser embarcados livremente por outras origens (com excecoes).' };
                var lower = val.toLowerCase().trim();
                if (lower === 'same-origin') return { status: 'ok', score: 4, msg: 'CORP isolando recurso a mesma origem.' };
                if (lower === 'same-site') return { status: 'ok', score: 3, msg: 'CORP same-site. Bom para subdominios proprios.' };
                if (lower === 'cross-origin') return { status: 'warn', score: 1, msg: 'cross-origin permite uso amplo. Util para CDNs e recursos publicos.' };
                return { status: 'warn', score: 0, msg: 'Valor incomum: "' + val + '".' };
            }
        },
        {
            name: 'Server',
            key: 'server',
            weight: 3,
            type: 'info-disclosure',
            doc: 'Identifica o software do servidor (Apache, nginx, IIS). Sua presenca em si nao eh vulneravel, mas revelar versao ajuda atacantes a buscar exploits dirigidos.',
            ideal: 'Ausente, ou apenas nome generico sem versao',
            evaluate: function (val) {
                if (!val) return { status: 'ok', score: 3, msg: 'Header ausente. Bom: nao expoe software/versao do servidor.' };
                var hasVersion = /\d+\.\d+/.test(val) || /\d+/.test(val);
                if (hasVersion) return { status: 'warn', score: 0, msg: 'Revela "' + val + '" - inclui versao do servidor. Remova ou substitua por valor generico.' };
                return { status: 'info', score: 2, msg: 'Revela "' + val + '" sem numero de versao. Ainda eh preferivel ocultar totalmente.' };
            }
        },
        {
            name: 'X-Powered-By',
            key: 'x-powered-by',
            weight: 2,
            type: 'info-disclosure',
            doc: 'Identifica tecnologia/framework usada (PHP, ASP.NET, Express). Header ja considerado obsoleto - sua presenca eh information disclosure.',
            ideal: 'Ausente',
            evaluate: function (val) {
                if (!val) return { status: 'ok', score: 2, msg: 'Header ausente. Bom.' };
                return { status: 'warn', score: 0, msg: 'Revela "' + val + '". Configure o servidor/app para suprimir este header (expose_php=Off no PHP, X-Powered-By em IIS, app.disable("x-powered-by") em Express).' };
            }
        },
        {
            name: 'X-XSS-Protection',
            key: 'x-xss-protection',
            weight: 0,
            type: 'security',
            doc: 'Header legado dos navegadores antigos. Os navegadores modernos removeram o filtro XSS - dependemos de CSP. Configurar este header como "0" eh a recomendacao atual.',
            ideal: '0 (desabilitado) ou ausente',
            evaluate: function (val) {
                if (!val) return { status: 'info', score: 0, msg: 'Ausente. Aceitavel - confie em CSP em vez do filtro XSS legacy.' };
                var lower = val.trim();
                if (lower === '0') return { status: 'ok', score: 0, msg: 'Desabilitado explicitamente. Configuracao moderna recomendada.' };
                if (lower.indexOf('1; mode=block') === 0) return { status: 'info', score: 0, msg: '"1; mode=block" funciona apenas em navegadores legados. Considere mudar para "0" e investir em CSP.' };
                return { status: 'warn', score: 0, msg: 'Valor "' + val + '" pode introduzir vulnerabilidades em navegadores antigos. Configure "0" e use CSP.' };
            }
        }
    ];

    // ============================================================
    // PARSER DE HEADERS
    // Aceita formatos: curl -I, http response cru, blocos "Header: value"
    // ============================================================
    function parseHeaders(text) {
        var headers = {};
        if (!text) return headers;
        var lines = text.split(/\r?\n/);
        var lastKey = null;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line.trim()) continue;
            // Status line (HTTP/1.1 200 OK)
            if (/^HTTP\/[\d.]+/i.test(line)) { lastKey = null; continue; }
            // Continuation line (folded)
            if (/^[ \t]/.test(line) && lastKey) {
                headers[lastKey] += ' ' + line.trim();
                continue;
            }
            var idx = line.indexOf(':');
            if (idx === -1) continue;
            var key = line.substring(0, idx).trim().toLowerCase();
            var val = line.substring(idx + 1).trim();
            if (!key) continue;
            // Some sites send multiple headers with same name - join with comma per RFC 7230
            if (headers[key]) headers[key] += ', ' + val;
            else headers[key] = val;
            lastKey = key;
        }
        return headers;
    }

    // ============================================================
    // ANALISE E SCORING
    // ============================================================
    function analyze(rawHeaders) {
        var headers = parseHeaders(rawHeaders);
        var results = [];
        var totalMax = 0;
        var totalGot = 0;
        var counts = { ok: 0, warn: 0, miss: 0, info: 0 };

        HEADERS.forEach(function (h) {
            var val = headers[h.key];
            var res = h.evaluate(val, headers);
            totalMax += h.weight;
            totalGot += res.score;
            counts[res.status]++;
            results.push({
                name: h.name,
                key: h.key,
                value: val || null,
                status: res.status,
                score: res.score,
                weight: h.weight,
                msg: res.msg,
                doc: h.doc,
                ideal: h.ideal,
                type: h.type
            });
        });

        var pct = totalMax > 0 ? Math.round((totalGot / totalMax) * 100) : 0;
        var grade = scoreToGrade(pct, counts);

        return {
            headers: headers,
            results: results,
            score: totalGot,
            maxScore: totalMax,
            pct: pct,
            grade: grade,
            counts: counts,
            hasInput: Object.keys(headers).length > 0
        };
    }

    function scoreToGrade(pct, counts) {
        if (pct >= 95 && counts.miss === 0) return { letter: 'A+', cls: 'aplus' };
        if (pct >= 85) return { letter: 'A', cls: 'a' };
        if (pct >= 70) return { letter: 'B', cls: 'b' };
        if (pct >= 55) return { letter: 'C', cls: 'c' };
        if (pct >= 40) return { letter: 'D', cls: 'd' };
        return { letter: 'F', cls: 'f' };
    }

    // ============================================================
    // RENDER
    // ============================================================
    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function render(report) {
        if (!report.hasInput) {
            return '<div class="sh-error">Nenhum header valido encontrado no texto. Verifique se o formato esta correto (ex: <code>Header-Name: valor</code> em cada linha).</div>';
        }

        var grade = report.grade;
        var summaryText = '';
        if (grade.letter === 'A+') summaryText = 'Configuracao excelente. Todos os headers criticos estao presentes e bem configurados.';
        else if (grade.letter === 'A') summaryText = 'Configuracao forte. Poucos ajustes finos podem elevar para A+.';
        else if (grade.letter === 'B') summaryText = 'Boa base, mas ha headers importantes ausentes ou com configuracao subotima.';
        else if (grade.letter === 'C') summaryText = 'Configuracao media. Varios headers de defesa em profundidade estao ausentes.';
        else if (grade.letter === 'D') summaryText = 'Postura fraca. Aplicacao depende excessivamente de outros controles.';
        else summaryText = 'Postura critica. Headers fundamentais ausentes - alta exposicao a XSS, clickjacking e downgrade attacks.';

        var html = '';
        html += '<div class="sh-grade-card">';
        html += '<div class="sh-grade-letter ' + grade.cls + '">' + grade.letter + '</div>';
        html += '<div class="sh-grade-info">';
        html += '<h3>Pontuacao: ' + report.pct + '%</h3>';
        html += '<p class="score">' + report.score + ' / ' + report.maxScore + ' pontos</p>';
        html += '<p class="summary">' + summaryText + '</p>';
        html += '</div></div>';

        html += '<div class="sh-stats">';
        html += '<div class="sh-stat ok"><div class="stat-num">' + report.counts.ok + '</div><div class="stat-label">Configurados</div></div>';
        html += '<div class="sh-stat warn"><div class="stat-num">' + report.counts.warn + '</div><div class="stat-label">Atencao</div></div>';
        html += '<div class="sh-stat miss"><div class="stat-num">' + report.counts.miss + '</div><div class="stat-label">Ausentes</div></div>';
        html += '<div class="sh-stat info"><div class="stat-num">' + report.counts.info + '</div><div class="stat-label">Informativos</div></div>';
        html += '</div>';

        html += '<div class="sh-header-grid">';
        report.results.forEach(function (r) {
            var badgeLabel = r.status === 'ok' ? 'OK'
                : r.status === 'warn' ? 'Atencao'
                : r.status === 'miss' ? 'Ausente'
                : 'Info';
            html += '<div class="sh-header-row ' + r.status + '">';
            html += '<div class="sh-header-top">';
            html += '<div class="sh-header-name">' + escapeHtml(r.name) + '</div>';
            html += '<div class="sh-header-badge ' + r.status + '">' + badgeLabel + ' (' + r.score + '/' + r.weight + ')</div>';
            html += '</div>';
            if (r.value) {
                html += '<div class="sh-header-value">' + escapeHtml(r.value) + '</div>';
            }
            html += '<div class="sh-header-desc">' + escapeHtml(r.msg) + '</div>';
            html += '<div class="sh-header-rec"><strong>Recomendacao:</strong> ' + escapeHtml(r.ideal) + '</div>';
            html += '</div>';
        });
        html += '</div>';

        return html;
    }

    // ============================================================
    // BIND UI
    // ============================================================
    var tabs = document.querySelectorAll('.sh-tab');
    var tabContents = document.querySelectorAll('.sh-tab-content');
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            var target = tab.getAttribute('data-tab');
            tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
            tabContents.forEach(function (c) { c.classList.toggle('active', c.getAttribute('data-tab') === target); });
        });
    });

    var analyzeBtn = document.getElementById('shAnalyzeBtn');
    var pasteArea = document.getElementById('shPasteArea');
    var urlInput = document.getElementById('shUrlInput');
    var fetchBtn = document.getElementById('shFetchBtn');
    var resultsBox = document.getElementById('shResults');
    var clearBtn = document.getElementById('shClearBtn');
    var sampleBtn = document.getElementById('shSampleBtn');

    var SAMPLE = 'HTTP/2 200\n' +
        'server: cloudflare\n' +
        'strict-transport-security: max-age=31536000; includeSubDomains; preload\n' +
        'content-security-policy: default-src \'self\'; script-src \'self\' \'unsafe-inline\'; object-src \'none\'; frame-ancestors \'none\'\n' +
        'x-frame-options: DENY\n' +
        'x-content-type-options: nosniff\n' +
        'referrer-policy: strict-origin-when-cross-origin\n' +
        'permissions-policy: camera=(), microphone=(), geolocation=()\n' +
        'cross-origin-opener-policy: same-origin\n' +
        'x-xss-protection: 0\n' +
        'content-type: text/html; charset=UTF-8';

    function showResults(report) {
        resultsBox.innerHTML = render(report);
        resultsBox.classList.add('active');
        // Scroll to results
        setTimeout(function () { resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    }

    function runAnalyze() {
        var text = (pasteArea.value || '').trim();
        if (!text) {
            resultsBox.innerHTML = '<div class="sh-error">Cole o output de <code>curl -I</code> ou os headers HTTP no campo acima.</div>';
            resultsBox.classList.add('active');
            return;
        }
        var report = analyze(text);
        showResults(report);
    }

    if (analyzeBtn) analyzeBtn.addEventListener('click', runAnalyze);

    if (clearBtn) clearBtn.addEventListener('click', function () {
        pasteArea.value = '';
        resultsBox.innerHTML = '';
        resultsBox.classList.remove('active');
        pasteArea.focus();
    });

    if (sampleBtn) sampleBtn.addEventListener('click', function () {
        pasteArea.value = SAMPLE;
        runAnalyze();
    });

    // URL fetch via public CORS proxy (best effort - some headers may be filtered)
    if (fetchBtn) {
        fetchBtn.addEventListener('click', function () {
            var url = (urlInput.value || '').trim();
            if (!url) {
                resultsBox.innerHTML = '<div class="sh-error">Informe uma URL para analisar.</div>';
                resultsBox.classList.add('active');
                return;
            }
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
            var origLabel = fetchBtn.textContent;
            fetchBtn.disabled = true;
            fetchBtn.textContent = 'Buscando...';
            resultsBox.classList.remove('active');

            // Use corsproxy.io as relay - returns the upstream headers in response.headers
            var proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
            fetch(proxy, { method: 'GET', cache: 'no-store', redirect: 'follow' })
                .then(function (res) {
                    var lines = ['HTTP/1.1 ' + res.status + ' ' + res.statusText];
                    res.headers.forEach(function (val, key) {
                        lines.push(key + ': ' + val);
                    });
                    var raw = lines.join('\n');
                    pasteArea.value = raw;
                    // Switch to paste tab so user sees the raw headers
                    document.querySelector('.sh-tab[data-tab="paste"]').click();
                    var report = analyze(raw);
                    showResults(report);
                })
                .catch(function (err) {
                    resultsBox.innerHTML = '<div class="sh-error">Erro ao buscar URL via proxy CORS: ' + escapeHtml(err.message || 'falha desconhecida') + '. Tente colar manualmente o output de <code>curl -I ' + escapeHtml(url) + '</code>.</div>';
                    resultsBox.classList.add('active');
                })
                .finally(function () {
                    fetchBtn.disabled = false;
                    fetchBtn.textContent = origLabel;
                });
        });

        urlInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); fetchBtn.click(); } });
    }

    // Copy curl command buttons
    document.querySelectorAll('.sh-copy-cmd').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var code = btn.previousElementSibling;
            var text = code ? code.textContent : '';
            if (!text) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function () {
                    var orig = btn.textContent;
                    btn.textContent = 'Copiado!';
                    setTimeout(function () { btn.textContent = orig; }, 1500);
                });
            }
        });
    });
})();
