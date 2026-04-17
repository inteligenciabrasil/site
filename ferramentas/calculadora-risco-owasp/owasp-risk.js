(function () {
    'use strict';

    var FACTORS = {
        SL: 'sl', M: 'm', O: 'o', S: 's',
        ED: 'ed', EE: 'ee', A: 'a', ID: 'id',
        LC: 'lc', LI: 'li', LAV: 'lav', LAC: 'lac',
        FD: 'fd', RD: 'rd', NC: 'nc', PV: 'pv'
    };

    var THREAT = ['SL', 'M', 'O', 'S'];
    var VULN = ['ED', 'EE', 'A', 'ID'];
    var TECH = ['LC', 'LI', 'LAV', 'LAC'];
    var BIZ = ['FD', 'RD', 'NC', 'PV'];

    var MATRIX = {
        'LOW-LOW': 'NOTE',
        'LOW-MEDIUM': 'LOW',
        'LOW-HIGH': 'MEDIUM',
        'MEDIUM-LOW': 'LOW',
        'MEDIUM-MEDIUM': 'MEDIUM',
        'MEDIUM-HIGH': 'HIGH',
        'HIGH-LOW': 'MEDIUM',
        'HIGH-MEDIUM': 'HIGH',
        'HIGH-HIGH': 'CRITICAL'
    };

    var LABELS = {
        NOTE: 'Informativo',
        LOW: 'Baixo',
        MEDIUM: 'Medio',
        HIGH: 'Alto',
        CRITICAL: 'Critico'
    };

    function levelFromScore(s) {
        if (s < 3) return 'LOW';
        if (s < 6) return 'MEDIUM';
        return 'HIGH';
    }

    function getVal(code) {
        var el = document.getElementById('f-' + FACTORS[code]);
        if (!el || el.value === '') return null;
        return parseFloat(el.value);
    }

    function avg(codes) {
        var sum = 0, count = 0;
        for (var i = 0; i < codes.length; i++) {
            var v = getVal(codes[i]);
            if (v === null) return null;
            sum += v;
            count++;
        }
        return count ? sum / count : null;
    }

    function formatNum(n) {
        return n === null ? '—' : n.toFixed(2);
    }

    function renderLevel(el, level, score) {
        el.className = 'owasp-score-level level-' + level.toLowerCase();
        el.textContent = LABELS[level] || level;
    }

    function buildVector() {
        var parts = [];
        ['SL', 'M', 'O', 'S', 'ED', 'EE', 'A', 'ID', 'LC', 'LI', 'LAV', 'LAC', 'FD', 'RD', 'NC', 'PV'].forEach(function (k) {
            var v = getVal(k);
            parts.push(k + ':' + (v === null ? '_' : v));
        });
        return '(' + parts.join('/') + ')';
    }

    function highlightMatrix(likelihood, impact) {
        var cells = document.querySelectorAll('.risk-matrix .mx-cell');
        cells.forEach(function (c) { c.classList.remove('active'); });
        if (!likelihood || !impact) return;
        var key = likelihood + '-' + impact;
        var sel = document.querySelector('.risk-matrix .mx-cell[data-key="' + key + '"]');
        if (sel) sel.classList.add('active');
    }

    function compute() {
        var like = avg(THREAT.concat(VULN));
        var impact = avg(TECH.concat(BIZ));

        document.getElementById('likelihood-value').textContent = formatNum(like);
        document.getElementById('impact-value').textContent = formatNum(impact);

        var likeLevel = like !== null ? levelFromScore(like) : null;
        var impLevel = impact !== null ? levelFromScore(impact) : null;

        var likeEl = document.getElementById('likelihood-level');
        var impEl = document.getElementById('impact-level');
        var overallEl = document.getElementById('overall-level');
        var overallVal = document.getElementById('overall-value');

        if (likeLevel) {
            renderLevel(likeEl, likeLevel, like);
        } else {
            likeEl.className = 'owasp-score-level';
            likeEl.textContent = '—';
        }
        if (impLevel) {
            renderLevel(impEl, impLevel, impact);
        } else {
            impEl.className = 'owasp-score-level';
            impEl.textContent = '—';
        }

        if (likeLevel && impLevel) {
            var key = likeLevel + '-' + impLevel;
            var severity = MATRIX[key];
            renderLevel(overallEl, severity, null);
            overallVal.textContent = LABELS[severity];
            overallVal.className = 'owasp-score-value sev-' + severity.toLowerCase();
            highlightMatrix(likeLevel, impLevel);
        } else {
            overallEl.className = 'owasp-score-level';
            overallEl.textContent = '—';
            overallVal.textContent = '—';
            overallVal.className = 'owasp-score-value';
            highlightMatrix(null, null);
        }

        document.getElementById('owasp-vector').value = buildVector();
    }

    var PRESETS = {
        'sqli-exposed': { SL: 9, M: 9, O: 9, S: 9, ED: 9, EE: 9, A: 9, ID: 8, LC: 9, LI: 9, LAV: 7, LAC: 9, FD: 7, RD: 9, NC: 7, PV: 9 },
        'ransomware':   { SL: 6, M: 9, O: 7, S: 9, ED: 7, EE: 9, A: 9, ID: 8, LC: 9, LI: 9, LAV: 9, LAC: 7, FD: 9, RD: 9, NC: 7, PV: 9 },
        'xss-auth':     { SL: 5, M: 4, O: 4, S: 7, ED: 7, EE: 5, A: 6, ID: 3, LC: 6, LI: 5, LAV: 1, LAC: 1, FD: 3, RD: 4, NC: 5, PV: 3 },
        'missing-header': { SL: 3, M: 1, O: 7, S: 7, ED: 9, EE: 3, A: 6, ID: 8, LC: 2, LI: 1, LAV: 1, LAC: 1, FD: 1, RD: 1, NC: 2, PV: 3 }
    };

    function applyPreset(name) {
        var data = PRESETS[name];
        if (!data) return;
        Object.keys(data).forEach(function (code) {
            var id = FACTORS[code];
            if (!id) return;
            var el = document.getElementById('f-' + id);
            if (el) el.value = String(data[code]);
        });
        compute();
        showToast('Cenario carregado');
        document.querySelector('.owasp-groups').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function countFilled() {
        var n = 0;
        document.querySelectorAll('.owasp-select').forEach(function (s) { if (s.value !== '') n++; });
        return n;
    }

    function resetAll() {
        var filled = countFilled();
        if (filled >= 8) {
            if (!window.confirm('Existem ' + filled + ' fatores preenchidos. Deseja realmente limpar tudo?')) return;
        }
        document.querySelectorAll('.owasp-select').forEach(function (s) { s.value = ''; });
        compute();
        if (window.history && window.history.replaceState) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    function gtmPush(eventName, extra) {
        if (!window.dataLayer) window.dataLayer = [];
        var payload = { event: eventName };
        if (extra) Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
        window.dataLayer.push(payload);
    }

    function exportMarkdown() {
        var filled = countFilled();
        if (filled < 16) {
            showToast('Preencha todos os 16 fatores para exportar', true);
            return;
        }
        var like = avg(THREAT.concat(VULN));
        var impact = avg(TECH.concat(BIZ));
        var likeLevel = levelFromScore(like);
        var impLevel = levelFromScore(impact);
        var severity = MATRIX[likeLevel + '-' + impLevel];
        var url = window.location.origin + window.location.pathname + '?v=' + encodeURIComponent(buildVector());
        var today = new Date().toISOString().slice(0, 10);

        var codesOrder = ['SL', 'M', 'O', 'S', 'ED', 'EE', 'A', 'ID', 'LC', 'LI', 'LAV', 'LAC', 'FD', 'RD', 'NC', 'PV'];
        var names = {
            SL: 'Skill Level', M: 'Motive', O: 'Opportunity', S: 'Size',
            ED: 'Ease of Discovery', EE: 'Ease of Exploit', A: 'Awareness', ID: 'Intrusion Detection',
            LC: 'Loss of Confidentiality', LI: 'Loss of Integrity', LAV: 'Loss of Availability', LAC: 'Loss of Accountability',
            FD: 'Financial Damage', RD: 'Reputation Damage', NC: 'Non-compliance', PV: 'Privacy Violation'
        };

        var md = '# Analise de Risco OWASP\n\n';
        md += '**Data:** ' + today + '\n';
        md += '**Severidade Final:** ' + LABELS[severity] + '\n';
        md += '**Probabilidade (Likelihood):** ' + like.toFixed(2) + ' — ' + LABELS[likeLevel] + '\n';
        md += '**Impacto (Impact):** ' + impact.toFixed(2) + ' — ' + LABELS[impLevel] + '\n\n';
        md += '## Fatores\n\n';
        md += '| Codigo | Nome | Valor |\n|---|---|---|\n';
        codesOrder.forEach(function (c) {
            md += '| ' + c + ' | ' + names[c] + ' | ' + getVal(c) + ' |\n';
        });
        md += '\n## Vector\n\n`' + buildVector() + '`\n\n';
        md += '## Permalink\n\n' + url + '\n\n';
        md += '---\n*Gerado por [Calculadora de Risco OWASP — Inteligencia Brasil](' + window.location.origin + window.location.pathname + ')*\n';

        if (navigator.clipboard) {
            navigator.clipboard.writeText(md).then(function () { showToast('Relatorio Markdown copiado!'); });
        } else {
            var ta = document.createElement('textarea');
            ta.value = md;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Relatorio Markdown copiado!');
        }
    }

    function copyVector() {
        var input = document.getElementById('owasp-vector');
        var text = input.value;
        if (!text || text.indexOf('_') > -1) {
            showToast('Preencha todos os fatores antes de copiar', true);
            return;
        }
        var share = window.location.origin + window.location.pathname + '?v=' + encodeURIComponent(text);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(share).then(function () { showToast('Link copiado!'); });
        } else {
            input.select();
            document.execCommand('copy');
            showToast('Link copiado!');
        }
    }

    function handleGtmClick(e) {
        var el = e.target.closest('[data-gtm]');
        if (!el) return;
        var eventName = el.getAttribute('data-gtm');
        gtmPush(eventName);
    }

    function showToast(msg, isError) {
        var t = document.getElementById('owasp-toast');
        t.textContent = msg;
        t.style.background = isError ? '#EF4444' : '#10B981';
        t.classList.add('show');
        clearTimeout(showToast._t);
        showToast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
    }

    function loadFromURL() {
        var q = window.location.search;
        if (!q) return;
        var match = q.match(/[?&]v=([^&]+)/);
        if (!match) return;
        var vec = decodeURIComponent(match[1]);
        var inner = vec.replace(/^\(|\)$/g, '');
        inner.split('/').forEach(function (p) {
            var kv = p.split(':');
            if (kv.length !== 2) return;
            var code = kv[0].toUpperCase();
            var val = kv[1];
            if (val === '_') return;
            var id = FACTORS[code];
            if (!id) return;
            var el = document.getElementById('f-' + id);
            if (el) el.value = val;
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.owasp-select').forEach(function (s) {
            s.addEventListener('change', compute);
        });
        var reset = document.getElementById('owasp-reset');
        if (reset) reset.addEventListener('click', resetAll);
        var copy = document.getElementById('owasp-copy');
        if (copy) copy.addEventListener('click', copyVector);
        var exportBtn = document.getElementById('owasp-export');
        if (exportBtn) exportBtn.addEventListener('click', exportMarkdown);

        document.querySelectorAll('.preset-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { applyPreset(btn.getAttribute('data-preset')); });
        });

        document.addEventListener('click', handleGtmClick);

        loadFromURL();
        compute();
    });
})();
