/* DNS + DNSSEC validator - tool standalone JS */
(function () {
    'use strict';

    var input = document.getElementById('dnsDomainInput');
    var btn = document.getElementById('dnsAnalyzeBtn');
    var loading = document.getElementById('dnsLoading');
    var results = document.getElementById('dnsResults');

    if (!input || !btn) return;

    // Cloudflare and Google DoH endpoints with JSON API
    var DOH_CF = 'https://cloudflare-dns.com/dns-query';
    var DOH_GG = 'https://dns.google/resolve';

    // RR type numeric codes (used to enrich some Status mapping if needed)
    var RR = { A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, DS: 43, RRSIG: 46, DNSKEY: 48, CAA: 257 };

    function setStatus(elId, text, cls) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = text;
        el.className = 'record-status ' + cls;
    }
    function setValue(elId, value) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = value || '';
    }
    function setAnalysisList(elId, items) {
        var el = document.getElementById(elId);
        if (!el) return;
        if (!items || !items.length) { el.innerHTML = ''; return; }
        var html = '<ul>';
        items.forEach(function (it) {
            html += '<li class="' + (it.kind || 'info') + '">' + escapeHtml(it.text) + '</li>';
        });
        html += '</ul>';
        el.innerHTML = html;
    }
    function escapeHtml(s) {
        return String(s || '').replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function normalizeDomain(raw) {
        if (!raw) return '';
        var d = String(raw).trim().toLowerCase();
        d = d.replace(/^https?:\/\//, '');
        d = d.replace(/^www\./, '');
        d = d.replace(/\/.*$/, '');
        d = d.replace(/[^a-z0-9.\-]/g, '');
        d = d.replace(/^\.+|\.+$/g, '');
        return d;
    }

    function parentZone(domain) {
        var i = domain.indexOf('.');
        return i === -1 ? '' : domain.substring(i + 1);
    }

    // DoH query: returns object {Status, AD, Answer:[]}; falls back to Google if Cloudflare fails.
    function doh(name, type) {
        var qs = '?name=' + encodeURIComponent(name) + '&type=' + encodeURIComponent(type) + '&do=1';
        return fetch(DOH_CF + qs, { headers: { 'Accept': 'application/dns-json' } })
            .then(function (r) { if (!r.ok) throw new Error('cf ' + r.status); return r.json(); })
            .catch(function () {
                return fetch(DOH_GG + qs, { headers: { 'Accept': 'application/dns-json' } })
                    .then(function (r) { if (!r.ok) throw new Error('gg ' + r.status); return r.json(); });
            });
    }

    // Render and analyze each record
    function analyze(domain) {
        loading.style.display = 'block';
        results.style.display = 'none';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analisando...';

        // Reset prior state
        ['dnssec', 'a', 'aaaa', 'mx', 'ns', 'soa', 'caa', 'txt'].forEach(function (k) {
            setStatus('status-' + k, '-', 'notfound');
            setValue('value-' + k, '');
            var a = document.getElementById('analysis-' + k);
            if (a) a.innerHTML = '';
        });

        // Issue parallel queries
        var parent = parentZone(domain);
        var queries = [
            doh(domain, 'A').then(function (r) { return { k: 'A', r: r }; }).catch(function () { return { k: 'A', err: true }; }),
            doh(domain, 'AAAA').then(function (r) { return { k: 'AAAA', r: r }; }).catch(function () { return { k: 'AAAA', err: true }; }),
            doh(domain, 'MX').then(function (r) { return { k: 'MX', r: r }; }).catch(function () { return { k: 'MX', err: true }; }),
            doh(domain, 'NS').then(function (r) { return { k: 'NS', r: r }; }).catch(function () { return { k: 'NS', err: true }; }),
            doh(domain, 'SOA').then(function (r) { return { k: 'SOA', r: r }; }).catch(function () { return { k: 'SOA', err: true }; }),
            doh(domain, 'TXT').then(function (r) { return { k: 'TXT', r: r }; }).catch(function () { return { k: 'TXT', err: true }; }),
            doh(domain, 'CAA').then(function (r) { return { k: 'CAA', r: r }; }).catch(function () { return { k: 'CAA', err: true }; }),
            doh(domain, 'DNSKEY').then(function (r) { return { k: 'DNSKEY', r: r }; }).catch(function () { return { k: 'DNSKEY', err: true }; }),
            parent ? doh(domain, 'DS').then(function (r) { return { k: 'DS', r: r }; }).catch(function () { return { k: 'DS', err: true }; }) : Promise.resolve({ k: 'DS', err: true })
        ];

        Promise.all(queries).then(function (results) {
            var by = {};
            results.forEach(function (x) { by[x.k] = x; });

            var score = 0;
            var summaryParts = [];

            // A
            var aAns = answers(by.A);
            if (aAns.length) {
                setStatus('status-a', aAns.length + ' encontrado' + (aAns.length > 1 ? 's' : ''), 'ok');
                setValue('value-a', aAns.map(function (a) { return a.data; }).join('\n'));
            } else {
                setStatus('status-a', 'Nao encontrado', 'notfound');
                setValue('value-a', 'Nenhum registro A retornado.');
            }

            // AAAA
            var aaaaAns = answers(by.AAAA);
            if (aaaaAns.length) {
                setStatus('status-aaaa', aaaaAns.length + ' encontrado' + (aaaaAns.length > 1 ? 's' : ''), 'ok');
                setValue('value-aaaa', aaaaAns.map(function (a) { return a.data; }).join('\n'));
                score += 15;
                summaryParts.push('IPv6 ativo');
            } else {
                setStatus('status-aaaa', 'Nao encontrado', 'warning');
                setValue('value-aaaa', 'Dominio sem AAAA. Considere habilitar IPv6.');
            }

            // MX
            var mxAns = answers(by.MX);
            if (mxAns.length) {
                setStatus('status-mx', mxAns.length + ' encontrado' + (mxAns.length > 1 ? 's' : ''), 'ok');
                setValue('value-mx', mxAns.map(function (a) { return a.data; }).join('\n'));
            } else {
                setStatus('status-mx', 'Nao encontrado', 'notfound');
                setValue('value-mx', 'Dominio sem MX (pode ser intencional se nao recebe e-mail).');
            }

            // NS
            var nsAns = answers(by.NS);
            var nsAnalysis = [];
            if (nsAns.length) {
                setValue('value-ns', nsAns.map(function (a) { return a.data; }).join('\n'));
                if (nsAns.length >= 2) {
                    setStatus('status-ns', nsAns.length + ' NS', 'ok');
                    score += 10;
                    summaryParts.push(nsAns.length + ' NS');
                    nsAnalysis.push({ kind: 'ok', text: nsAns.length + ' servidores de nome configurados (minimo recomendado: 2)' });
                } else {
                    setStatus('status-ns', '1 NS', 'warning');
                    nsAnalysis.push({ kind: 'warning', text: 'Apenas 1 NS configurado - sem redundancia de resolucao DNS' });
                }
                // Diversidade simplificada: olhar para sufixos diferentes nos NS
                var sufixos = {};
                nsAns.forEach(function (a) {
                    var p = (a.data || '').replace(/\.$/, '').split('.').slice(-2).join('.');
                    sufixos[p] = true;
                });
                if (Object.keys(sufixos).length >= 2) {
                    nsAnalysis.push({ kind: 'ok', text: 'NS em mais de um provedor (sufixos distintos) - boa pratica de resiliencia' });
                } else if (nsAns.length >= 2) {
                    nsAnalysis.push({ kind: 'info', text: 'NS no mesmo provedor. Para resiliencia adicional, considere secondary DNS em outro fornecedor' });
                }
            } else {
                setStatus('status-ns', 'Erro', 'error');
                setValue('value-ns', 'Nao foi possivel obter NS.');
            }
            setAnalysisList('analysis-ns', nsAnalysis);

            // SOA
            var soaAns = answers(by.SOA);
            if (soaAns.length) {
                setStatus('status-soa', 'Encontrado', 'ok');
                setValue('value-soa', soaAns[0].data);
            } else {
                setStatus('status-soa', 'Nao encontrado', 'warning');
                setValue('value-soa', 'SOA nao retornado (anormal - todo dominio assertivo deve ter SOA).');
            }

            // TXT
            var txtAns = answers(by.TXT);
            var txtAnalysis = [];
            if (txtAns.length) {
                setStatus('status-txt', txtAns.length + ' registro' + (txtAns.length > 1 ? 's' : ''), 'ok');
                setValue('value-txt', txtAns.map(function (a) { return a.data; }).join('\n'));
                score += 10;

                var joined = txtAns.map(function (a) { return (a.data || '').toLowerCase(); }).join(' ');
                if (joined.indexOf('v=spf1') !== -1) txtAnalysis.push({ kind: 'ok', text: 'SPF detectado' });
                else txtAnalysis.push({ kind: 'warning', text: 'SPF nao detectado - configure v=spf1 para autenticar e-mails' });

                if (joined.indexOf('v=dmarc1') !== -1) txtAnalysis.push({ kind: 'ok', text: 'DMARC detectado em TXT do dominio raiz' });
                if (joined.indexOf('google-site-verification') !== -1) txtAnalysis.push({ kind: 'info', text: 'Verificacao Google Search Console / Workspace ativa' });
                if (joined.indexOf('ms=ms') !== -1 || joined.indexOf('microsoft-domain') !== -1) txtAnalysis.push({ kind: 'info', text: 'Verificacao Microsoft 365 detectada' });
            } else {
                setStatus('status-txt', 'Nao encontrado', 'warning');
                setValue('value-txt', 'Sem TXT - SPF, verificacoes de propriedade e outros precisam estar ausentes ou em subdominios.');
            }
            setAnalysisList('analysis-txt', txtAnalysis);

            // CAA
            var caaAns = answers(by.CAA);
            var caaAnalysis = [];
            if (caaAns.length) {
                setStatus('status-caa', caaAns.length + ' politica' + (caaAns.length > 1 ? 's' : ''), 'ok');
                setValue('value-caa', caaAns.map(function (a) { return a.data; }).join('\n'));
                score += 15;
                summaryParts.push('CAA configurado');
                caaAnalysis.push({ kind: 'ok', text: 'CAA presente - emissao de certificados restrita as CAs autorizadas' });

                var combined = caaAns.map(function (a) { return (a.data || '').toLowerCase(); }).join(' ');
                if (combined.indexOf('iodef') !== -1) caaAnalysis.push({ kind: 'ok', text: 'iodef configurado - voce sera notificado sobre tentativas de emissao' });
                else caaAnalysis.push({ kind: 'info', text: 'Considere adicionar tag iodef para receber alertas de tentativas de emissao' });
                if (combined.indexOf('issuewild') === -1) caaAnalysis.push({ kind: 'info', text: 'Sem issuewild explicito - emissao de wildcards segue o tag issue' });
            } else {
                setStatus('status-caa', 'Nao configurado', 'warning');
                setValue('value-caa', 'Sem CAA - qualquer CA confiavel publicamente pode emitir certificados para este dominio.');
                caaAnalysis.push({ kind: 'warning', text: 'CAA ausente. Recomendado para reduzir risco de mis-issuance.' });
            }
            setAnalysisList('analysis-caa', caaAnalysis);

            // DNSSEC: combinar DNSKEY (no proprio dominio) + DS (no pai) + AD nas respostas
            var dnsKeyAns = answers(by.DNSKEY);
            var dsAns = answers(by.DS);
            var adFlag = !!(by.A && by.A.r && by.A.r.AD) || !!(by.SOA && by.SOA.r && by.SOA.r.AD) || !!(by.DNSKEY && by.DNSKEY.r && by.DNSKEY.r.AD);

            var dnssecAnalysis = [];
            var dnssecValueLines = [];

            if (dnsKeyAns.length) {
                dnssecValueLines.push('DNSKEY: ' + dnsKeyAns.length + ' chave(s) publicada(s) no dominio');
                dnssecAnalysis.push({ kind: 'ok', text: 'DNSKEY presente no dominio (' + dnsKeyAns.length + ' chave[s])' });
            } else {
                dnssecValueLines.push('DNSKEY: nao encontrado');
                dnssecAnalysis.push({ kind: 'warning', text: 'DNSKEY ausente - DNSSEC nao esta configurado no servidor autoritativo' });
            }

            if (dsAns.length) {
                dnssecValueLines.push('DS (no dominio pai): ' + dsAns.length + ' delegation signer(s)');
                dnssecAnalysis.push({ kind: 'ok', text: 'DS publicado no dominio pai - cadeia de confianca ancorada' });
                score += 20;
            } else {
                dnssecValueLines.push('DS (no dominio pai): nao encontrado');
                dnssecAnalysis.push({ kind: 'warning', text: 'DS ausente no pai - mesmo com DNSKEY publicada, a cadeia de confianca nao esta fechada' });
            }

            if (adFlag) {
                dnssecValueLines.push('Flag AD (Authenticated Data): ATIVA - validacao DNSSEC bem-sucedida');
                dnssecAnalysis.push({ kind: 'ok', text: 'Resolvedor validante retornou AD=1: assinatura validada com sucesso' });
                setStatus('status-dnssec', 'Validado', 'ok');
                score += 30;
                summaryParts.push('DNSSEC validado');
            } else if (dnsKeyAns.length && dsAns.length) {
                dnssecValueLines.push('Flag AD: NAO retornada');
                dnssecAnalysis.push({ kind: 'warning', text: 'DNSKEY + DS presentes, mas resolvedor nao retornou AD=1. Pode indicar assinaturas expiradas ou chaves desalinhadas. Use dnsviz.net para diagnostico detalhado.' });
                setStatus('status-dnssec', 'Cadeia incompleta', 'warning');
            } else {
                dnssecValueLines.push('Flag AD: nao retornada');
                setStatus('status-dnssec', 'Nao configurado', 'error');
            }

            setValue('value-dnssec', dnssecValueLines.join('\n'));
            setAnalysisList('analysis-dnssec', dnssecAnalysis);

            // Score & summary
            if (score > 100) score = 100;
            var circle = document.getElementById('dnsScoreCircle');
            var badge = document.getElementById('dnsScoreBadge');
            var valueEl = document.getElementById('dnsScoreValue');
            var summaryEl = document.getElementById('dnsScoreSummary');
            var cls, label, summaryText;
            if (score >= 90) { cls = 'excellent'; label = 'EXCELENTE'; summaryText = 'Postura DNS robusta. ' + summaryParts.join(', ') + '.'; }
            else if (score >= 70) { cls = 'good'; label = 'BOM'; summaryText = 'Boa postura DNS. Ajustes pontuais podem elevar a nota.'; }
            else if (score >= 50) { cls = 'fair'; label = 'REGULAR'; summaryText = 'Postura DNS razoavel, com gaps relevantes. Veja recomendacoes nas secoes.'; }
            else { cls = 'poor'; label = 'CRITICO'; summaryText = 'Postura DNS abaixo do esperado. Habilite DNSSEC e CAA assim que possivel.'; }

            circle.className = 'score-circle ' + cls;
            badge.className = 'score-badge ' + cls;
            valueEl.textContent = score;
            badge.textContent = label;
            summaryEl.textContent = summaryText;

            loading.style.display = 'none';
            results.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Analisar';
        }).catch(function (err) {
            loading.style.display = 'none';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Analisar';
            alert('Erro ao consultar DNS: ' + (err && err.message ? err.message : 'desconhecido'));
        });
    }

    function answers(box) {
        if (!box || box.err || !box.r) return [];
        return (box.r.Answer || []).filter(function (a) { return a && a.data; });
    }

    btn.addEventListener('click', function () {
        var d = normalizeDomain(input.value);
        if (!d || d.indexOf('.') === -1) {
            alert('Digite um dominio valido (ex: empresa.com.br).');
            input.focus();
            return;
        }
        input.value = d;
        analyze(d);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            btn.click();
        }
    });

    // Permite ?domain=foo.com via querystring para link direto
    var params = new URLSearchParams(location.search);
    var q = params.get('domain');
    if (q) {
        input.value = q;
        setTimeout(function () { btn.click(); }, 100);
    }
})();
