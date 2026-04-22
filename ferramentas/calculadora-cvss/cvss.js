/**
 * CVSS Calculator - Inteligencia Brasil
 * Suporta CVSS 3.1 (formula oficial FIRST.org) e CVSS 4.0 (macrovector)
 */
(function () {
    'use strict';

    // ========== CVSS 3.1 METRIC VALUES ==========
    var CVSS31 = {
        AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.20 },
        AC: { L: 0.77, H: 0.44 },
        PR: {
            U: { N: 0.85, L: 0.62, H: 0.27 }, // Scope Unchanged
            C: { N: 0.85, L: 0.68, H: 0.50 }  // Scope Changed
        },
        UI: { N: 0.85, R: 0.62 },
        CIA: { N: 0.00, L: 0.22, H: 0.56 }
    };

    var METRICS_31 = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
    var TEMPORAL_31 = ['E', 'RL', 'RC'];
    var METRICS_40 = ['AV', 'AC', 'AT', 'PR', 'UI', 'VC', 'VI', 'VA', 'SC', 'SI', 'SA'];

    // CVSS 3.1 Temporal metric values
    var CVSS31_TEMPORAL = {
        E:  { X: 1.0, U: 0.91, P: 0.94, F: 0.97, H: 1.0 },
        RL: { X: 1.0, O: 0.95, T: 0.96, W: 0.97, U: 1.0 },
        RC: { X: 1.0, U: 0.92, R: 0.96, C: 1.0 }
    };

    // CVSS 3.1 official roundup function
    function roundup(value) {
        var input = Math.round(value * 100000);
        if (input % 10000 === 0) {
            return input / 100000;
        }
        return (Math.floor(input / 10000) + 1) / 10;
    }

    // Calculate CVSS 3.1 base score
    function calc31(m) {
        if (!m.AV || !m.AC || !m.PR || !m.UI || !m.S || !m.C || !m.I || !m.A) {
            return null;
        }

        var av = CVSS31.AV[m.AV];
        var ac = CVSS31.AC[m.AC];
        var pr = CVSS31.PR[m.S][m.PR];
        var ui = CVSS31.UI[m.UI];
        var c = CVSS31.CIA[m.C];
        var i = CVSS31.CIA[m.I];
        var a = CVSS31.CIA[m.A];

        var iss = 1 - ((1 - c) * (1 - i) * (1 - a));
        var impact;
        if (m.S === 'U') {
            impact = 6.42 * iss;
        } else {
            impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
        }

        var exploitability = 8.22 * av * ac * pr * ui;

        var baseScore;
        if (impact <= 0) {
            baseScore = 0;
        } else if (m.S === 'U') {
            baseScore = roundup(Math.min(impact + exploitability, 10));
        } else {
            baseScore = roundup(Math.min(1.08 * (impact + exploitability), 10));
        }

        // Temporal score (if any temporal metric is set)
        var temporalScore = null;
        if (m.E || m.RL || m.RC) {
            var e = CVSS31_TEMPORAL.E[m.E || 'X'];
            var rl = CVSS31_TEMPORAL.RL[m.RL || 'X'];
            var rc = CVSS31_TEMPORAL.RC[m.RC || 'X'];
            temporalScore = roundup(baseScore * e * rl * rc);
        }

        return {
            base: baseScore,
            impact: roundup(impact),
            exploitability: roundup(exploitability),
            temporal: temporalScore
        };
    }

    // ========== CVSS 4.0 LOOKUP TABLE ==========
    // Tabela oficial do FIRST.org cvss-v4-calculator (cvssLookup_global)
    // Mapeamento de macrovectors (6 digitos: EQ1 EQ2 EQ3 EQ4 EQ5 EQ6) para scores
    var CVSS40_LOOKUP = {
        "000000": 10, "000001": 9.9, "000010": 9.8, "000011": 9.5, "000020": 9.2, "000021": 8.9,
        "000100": 10, "000101": 9.6, "000110": 9.3, "000111": 8.7, "000120": 9.1, "000121": 8.1,
        "000200": 9.3, "000201": 9.0, "000210": 8.9, "000211": 8.0, "000220": 8.1, "000221": 6.8,
        "001000": 9.8, "001001": 9.5, "001010": 9.5, "001011": 9.2, "001020": 9.0, "001021": 8.4,
        "001100": 9.3, "001101": 9.2, "001110": 8.9, "001111": 8.1, "001120": 8.1, "001121": 6.5,
        "001200": 8.8, "001201": 8.0, "001210": 7.8, "001211": 7.0, "001220": 6.9, "001221": 4.8,
        "002001": 9.2, "002011": 8.2, "002021": 7.2, "002101": 7.9, "002111": 6.9, "002121": 5.0,
        "002201": 6.9, "002211": 5.5, "002221": 2.7,
        "010000": 9.9, "010001": 9.7, "010010": 9.5, "010011": 9.2, "010020": 9.2, "010021": 8.5,
        "010100": 9.5, "010101": 9.1, "010110": 9.0, "010111": 8.3, "010120": 8.4, "010121": 7.1,
        "010200": 9.2, "010201": 8.1, "010210": 8.2, "010211": 7.1, "010220": 7.2, "010221": 5.3,
        "011000": 9.5, "011001": 9.3, "011010": 9.2, "011011": 8.5, "011020": 8.5, "011021": 7.3,
        "011100": 9.2, "011101": 8.2, "011110": 8.0, "011111": 7.2, "011120": 7.0, "011121": 5.9,
        "011200": 8.4, "011201": 7.0, "011210": 7.1, "011211": 5.2, "011220": 5.0, "011221": 3.0,
        "012001": 8.6, "012011": 7.5, "012021": 5.2, "012101": 7.1, "012111": 5.2, "012121": 2.9,
        "012201": 6.3, "012211": 2.9, "012221": 1.7,
        "100000": 9.8, "100001": 9.5, "100010": 9.4, "100011": 8.7, "100020": 9.1, "100021": 8.1,
        "100100": 9.4, "100101": 8.9, "100110": 8.6, "100111": 7.4, "100120": 7.7, "100121": 6.4,
        "100200": 8.7, "100201": 7.5, "100210": 7.4, "100211": 6.3, "100220": 6.3, "100221": 4.9,
        "101000": 9.4, "101001": 8.9, "101010": 8.8, "101011": 7.7, "101020": 7.6, "101021": 6.7,
        "101100": 8.6, "101101": 7.6, "101110": 7.4, "101111": 5.8, "101120": 5.9, "101121": 5.0,
        "101200": 7.2, "101201": 5.7, "101210": 5.7, "101211": 5.2, "101220": 5.2, "101221": 2.5,
        "102001": 8.3, "102011": 7.0, "102021": 5.4, "102101": 6.5, "102111": 5.8, "102121": 2.6,
        "102201": 5.3, "102211": 2.1, "102221": 1.3,
        "110000": 9.5, "110001": 9.0, "110010": 8.8, "110011": 7.6, "110020": 7.6, "110021": 7.0,
        "110100": 9.0, "110101": 7.7, "110110": 7.5, "110111": 6.2, "110120": 6.1, "110121": 5.3,
        "110200": 7.7, "110201": 6.6, "110210": 6.8, "110211": 5.9, "110220": 5.2, "110221": 3.0,
        "111000": 8.9, "111001": 7.8, "111010": 7.6, "111011": 6.7, "111020": 6.2, "111021": 5.8,
        "111100": 7.4, "111101": 5.9, "111110": 5.7, "111111": 5.7, "111120": 4.7, "111121": 2.3,
        "111200": 6.1, "111201": 5.2, "111210": 5.7, "111211": 2.9, "111220": 2.4, "111221": 1.6,
        "112001": 7.1, "112011": 5.9, "112021": 3.0, "112101": 5.8, "112111": 2.6, "112121": 1.5,
        "112201": 2.3, "112211": 1.3, "112221": 0.6,
        "200000": 9.3, "200001": 8.7, "200010": 8.6, "200011": 7.2, "200020": 7.5, "200021": 5.8,
        "200100": 8.6, "200101": 7.4, "200110": 7.4, "200111": 6.1, "200120": 5.6, "200121": 3.4,
        "200200": 7.0, "200201": 5.4, "200210": 5.2, "200211": 4.0, "200220": 4.0, "200221": 2.2,
        "201000": 8.5, "201001": 7.5, "201010": 7.4, "201011": 5.5, "201020": 6.2, "201021": 5.1,
        "201100": 7.2, "201101": 5.7, "201110": 5.5, "201111": 4.1, "201120": 4.6, "201121": 1.9,
        "201200": 5.3, "201201": 3.6, "201210": 3.4, "201211": 1.9, "201220": 1.9, "201221": 0.8,
        "202001": 6.4, "202011": 5.1, "202021": 2.0, "202101": 4.7, "202111": 2.1, "202121": 1.1,
        "202201": 2.4, "202211": 0.9, "202221": 0.4,
        "210000": 8.8, "210001": 7.5, "210010": 7.3, "210011": 5.3, "210020": 6.0, "210021": 5.0,
        "210100": 7.3, "210101": 5.5, "210110": 5.9, "210111": 4.0, "210120": 4.1, "210121": 2.0,
        "210200": 5.4, "210201": 4.3, "210210": 4.5, "210211": 2.2, "210220": 2.0, "210221": 1.1,
        "211000": 7.5, "211001": 5.5, "211010": 5.8, "211011": 4.5, "211020": 4.0, "211021": 2.1,
        "211100": 6.1, "211101": 5.1, "211110": 4.8, "211111": 1.8, "211120": 2.0, "211121": 0.9,
        "211200": 4.6, "211201": 1.8, "211210": 1.7, "211211": 0.7, "211220": 0.8, "211221": 0.2,
        "212001": 5.3, "212011": 2.4, "212021": 1.4, "212101": 2.4, "212111": 1.2, "212121": 0.5,
        "212201": 1.0, "212211": 0.3, "212221": 0.1
    };

    // CVSS 4.0 metric values for macrovector calculation
    var CVSS40_MV = {
        AV: { N: 0, A: 1, L: 2, P: 3 },
        AC: { L: 0, H: 1 },
        AT: { N: 0, P: 1 },
        PR: { N: 0, L: 1, H: 2 },
        UI: { N: 0, P: 1, A: 2 },
        VC: { H: 0, L: 1, N: 2 },
        VI: { H: 0, L: 1, N: 2 },
        VA: { H: 0, L: 1, N: 2 },
        SC: { H: 0, L: 1, N: 2 },
        SI: { H: 0, L: 1, N: 2 },
        SA: { H: 0, L: 1, N: 2 }
    };

    // Calculate CVSS 4.0 macrovector and score
    function calc40(m) {
        for (var i = 0; i < METRICS_40.length; i++) {
            if (!m[METRICS_40[i]]) return null;
        }

        var av = CVSS40_MV.AV[m.AV];
        var ac = CVSS40_MV.AC[m.AC];
        var at = CVSS40_MV.AT[m.AT];
        var pr = CVSS40_MV.PR[m.PR];
        var ui = CVSS40_MV.UI[m.UI];
        var vc = CVSS40_MV.VC[m.VC];
        var vi = CVSS40_MV.VI[m.VI];
        var va = CVSS40_MV.VA[m.VA];
        var sc = CVSS40_MV.SC[m.SC];
        var si = CVSS40_MV.SI[m.SI];
        var sa = CVSS40_MV.SA[m.SA];

        // EQ1: AV/PR/UI
        var eq1;
        if (av === 0 && pr === 0 && ui === 0) eq1 = 0;
        else if ((av === 0 || pr === 0 || ui === 0) && !(av === 0 && pr === 0 && ui === 0) && av !== 3) eq1 = 1;
        else if (av === 3 || !(av === 0 || pr === 0 || ui === 0)) eq1 = 2;
        else eq1 = 2;

        // EQ2: AC/AT
        var eq2 = (ac === 0 && at === 0) ? 0 : 1;

        // EQ3: VC/VI/VA
        var eq3;
        if (vc === 0 && vi === 0) eq3 = 0;
        else if (!(vc === 0 && vi === 0) && (vc === 0 || vi === 0 || va === 0)) eq3 = 1;
        else if (vc !== 0 && vi !== 0 && va !== 0) eq3 = 2;
        else eq3 = 2;

        // EQ4: SC/SI/SA (using msi/msa concept simplified)
        var eq4;
        if (si === 0 || sa === 0) eq4 = 0;
        else if (sc === 0 || si === 1 || sa === 1) eq4 = 1;
        else eq4 = 2;

        // EQ5: Threat (E - exploit maturity) - default to Attacked = 0
        var eq5 = 1; // Default neutral

        // EQ6: CR/IR/AR (environmental) + VC/VI/VA - default neutral
        var eq6;
        if ((vc === 0 && vi === 0) || (vc === 0 && va === 0) || (vi === 0 && va === 0)) eq6 = 0;
        else eq6 = 1;

        var macrovector = "" + eq1 + eq2 + eq3 + eq4 + eq5 + eq6;
        var score = CVSS40_LOOKUP[macrovector];

        if (score === undefined) {
            // Fallback - should not happen with valid input
            score = 0;
        }

        return {
            base: score,
            macrovector: macrovector
        };
    }

    // ========== SEVERITY CLASSIFICATION ==========
    function getSeverity(score) {
        if (score === 0) return 'none';
        if (score < 4) return 'low';
        if (score < 7) return 'medium';
        if (score < 9) return 'high';
        return 'critical';
    }

    function severityLabel(sev) {
        return { none: 'None', low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[sev];
    }

    // ========== STATE ==========
    var state31 = {};
    var state40 = {};

    // ========== UI: BUILD VECTOR STRING ==========
    function buildVector31(m) {
        var parts = ['CVSS:3.1'];
        METRICS_31.forEach(function (k) {
            parts.push(k + ':' + (m[k] || '_'));
        });
        // Append temporal metrics only if set
        TEMPORAL_31.forEach(function (k) {
            if (m[k]) parts.push(k + ':' + m[k]);
        });
        return parts.join('/');
    }

    function buildVector40(m) {
        var parts = ['CVSS:4.0'];
        METRICS_40.forEach(function (k) {
            parts.push(k + ':' + (m[k] || '_'));
        });
        return parts.join('/');
    }

    // ========== UI: PARSE VECTOR STRING (for examples & permalinks) ==========
    function parseVector(vec) {
        if (!vec) return null;
        var parts = vec.split('/');
        if (parts.length < 2) return null;
        var version = parts[0];
        var m = {};
        for (var i = 1; i < parts.length; i++) {
            var kv = parts[i].split(':');
            if (kv.length === 2 && kv[1] !== '_') {
                m[kv[0]] = kv[1];
            }
        }
        return { version: version, metrics: m };
    }

    // ========== UI: UPDATE DISPLAY ==========
    function updateDisplay(version) {
        var state = version === '31' ? state31 : state40;
        var result = version === '31' ? calc31(state) : calc40(state);

        var vectorEl = document.getElementById('vector' + version);
        var scoreEl = document.getElementById('score' + version);
        var severityEl = document.getElementById('severity' + version);
        var gaugeEl = document.getElementById('gauge' + version);

        // Vector
        vectorEl.value = version === '31' ? buildVector31(state) : buildVector40(state);

        // Score & severity
        if (result === null) {
            scoreEl.textContent = '0.0';
            severityEl.textContent = 'None';
            gaugeEl.setAttribute('stroke-dashoffset', '534');
            gaugeEl.setAttribute('class', 'gauge-fg sev-none');
            severityEl.setAttribute('class', 'gauge-label sev-none');
            if (version === '31') {
                document.getElementById('impact31').textContent = '-';
                document.getElementById('exploit31').textContent = '-';
                document.getElementById('impact31bar').style.width = '0%';
                document.getElementById('exploit31bar').style.width = '0%';
                var tEl = document.getElementById('temporalScore31');
                if (tEl) tEl.textContent = '-';
            } else {
                document.getElementById('macro40').textContent = '------';
            }
            return;
        }

        var score = result.base;
        var sev = getSeverity(score);

        scoreEl.textContent = score.toFixed(1);
        severityEl.textContent = severityLabel(sev);

        // Gauge animation: dashoffset = 534 (full) - (score/10 * 534)
        var offset = 534 - (score / 10) * 534;
        gaugeEl.setAttribute('stroke-dashoffset', offset);
        gaugeEl.setAttribute('class', 'gauge-fg sev-' + sev);
        severityEl.setAttribute('class', 'gauge-label sev-' + sev);

        if (version === '31') {
            document.getElementById('impact31').textContent = result.impact.toFixed(1);
            document.getElementById('exploit31').textContent = result.exploitability.toFixed(1);
            // Bars: Impact max ~6.0, Exploitability max ~3.9
            document.getElementById('impact31bar').style.width = Math.min(100, (result.impact / 6.0) * 100) + '%';
            document.getElementById('exploit31bar').style.width = Math.min(100, (result.exploitability / 3.9) * 100) + '%';
            // Temporal pill
            var tempEl = document.getElementById('temporalScore31');
            if (tempEl) tempEl.textContent = result.temporal !== null ? result.temporal.toFixed(1) : '-';
        } else {
            document.getElementById('macro40').textContent = result.macrovector;
        }
    }

    // ========== UI: BUTTON SELECTION ==========
    function selectMetric(version, metric, value) {
        var state = version === '31' ? state31 : state40;
        state[metric] = value;

        // Update button states
        var container = document.querySelector('[data-metric="' + metric + '"][data-version="' + version + '"]');
        if (container) {
            container.querySelectorAll('button').forEach(function (btn) {
                btn.classList.toggle('active', btn.dataset.value === value);
            });
        }

        updateDisplay(version);
    }

    function setVector(version, vec) {
        var parsed = parseVector(vec);
        if (!parsed) return;

        var state = version === '31' ? state31 : state40;
        var metrics = version === '31' ? METRICS_31.concat(TEMPORAL_31) : METRICS_40;

        // Clear state
        Object.keys(state).forEach(function (k) { delete state[k]; });

        // Set from parsed
        metrics.forEach(function (k) {
            if (parsed.metrics[k]) {
                state[k] = parsed.metrics[k];
                var btn = document.querySelector('[data-metric="' + k + '"][data-version="' + version + '"] button[data-value="' + parsed.metrics[k] + '"]');
                if (btn) {
                    btn.parentNode.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                }
            }
        });

        updateDisplay(version);
    }

    function reset(version) {
        var state = version === '31' ? state31 : state40;
        Object.keys(state).forEach(function (k) { delete state[k]; });

        document.querySelectorAll('[data-version="' + version + '"] button').forEach(function (btn) {
            btn.classList.remove('active');
        });

        updateDisplay(version);
    }

    // ========== TOAST ==========
    function showToast(msg) {
        var toast = document.getElementById('cvss-toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    // ========== COPY & SHARE ==========
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                showToast('Vector copiado!');
            });
        } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showToast('Vector copiado!');
        }
    }

    function shareUrl(version) {
        var vec = document.getElementById('vector' + version).value;
        var url = window.location.origin + window.location.pathname + '#' + vec;
        copyToClipboard(url);
        showToast('Link compartilhavel copiado!');
        history.replaceState(null, '', '#' + vec);
    }

    // ========== TAB SWITCHING ==========
    function switchTab(tab) {
        document.querySelectorAll('.cvss-tab').forEach(function (t) {
            var active = t.dataset.tab === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active);
        });
        document.querySelectorAll('.cvss-panel').forEach(function (p) {
            p.classList.toggle('active', p.id === 'panel-' + tab);
        });
    }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function () {
        // Metric button clicks
        document.querySelectorAll('.metric-options').forEach(function (group) {
            var metric = group.dataset.metric;
            var version = group.dataset.version;
            group.querySelectorAll('button').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    selectMetric(version, metric, btn.dataset.value);
                });
            });
        });

        // Tab switching
        document.querySelectorAll('.cvss-tab').forEach(function (t) {
            t.addEventListener('click', function () { switchTab(t.dataset.tab); });
        });

        // Copy & share
        document.getElementById('copy31').addEventListener('click', function () {
            copyToClipboard(document.getElementById('vector31').value);
        });
        document.getElementById('copy40').addEventListener('click', function () {
            copyToClipboard(document.getElementById('vector40').value);
        });
        document.getElementById('share31').addEventListener('click', function () { shareUrl('31'); });
        document.getElementById('share40').addEventListener('click', function () { shareUrl('40'); });

        // Reset buttons
        document.getElementById('reset31').addEventListener('click', function () { reset('31'); });
        document.getElementById('reset40').addEventListener('click', function () { reset('40'); });

        // Examples
        document.querySelectorAll('.example-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                setVector('31', btn.dataset.vector);
            });
        });

        // Initial render
        updateDisplay('31');
        updateDisplay('40');

        // Parse hash if present (permalink support)
        if (window.location.hash) {
            var hash = decodeURIComponent(window.location.hash.substring(1));
            if (hash.indexOf('CVSS:3.1') === 0) {
                setVector('31', hash);
                switchTab('v31');
            } else if (hash.indexOf('CVSS:4.0') === 0) {
                setVector('40', hash);
                switchTab('v40');
            }
        }
    });

})();
