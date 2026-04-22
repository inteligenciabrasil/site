/**
 * Email Auth Validator (SPF/DKIM/DMARC) - Inteligencia Brasil
 * Uses DNS over HTTPS (DoH) from Cloudflare
 */
(function () {
    'use strict';

    var DOH_URL = 'https://cloudflare-dns.com/dns-query';

    // Common DKIM selectors to try
    var COMMON_DKIM_SELECTORS = ['google', 'default', 'selector1', 'selector2', 'k1', 'dkim', 'mail', 'smtp', 's1', 's2', 'mandrill', 'mailgun'];

    // ========== DOH QUERY ==========
    function queryDNS(name, type) {
        var url = DOH_URL + '?name=' + encodeURIComponent(name) + '&type=' + type;
        return fetch(url, {
            headers: { 'Accept': 'application/dns-json' }
        }).then(function (resp) {
            if (!resp.ok) throw new Error('DNS query failed: ' + resp.status);
            return resp.json();
        });
    }

    function getTxtRecords(name) {
        return queryDNS(name, 'TXT').then(function (data) {
            if (!data.Answer) return [];
            return data.Answer
                .filter(function (a) { return a.type === 16; })
                .map(function (a) {
                    // Strip surrounding quotes and concatenate split TXT
                    return a.data.replace(/^"(.*)"$/, '$1').replace(/" "/g, '');
                });
        });
    }

    function getMxRecords(name) {
        return queryDNS(name, 'MX').then(function (data) {
            if (!data.Answer) return [];
            return data.Answer
                .filter(function (a) { return a.type === 15; })
                .map(function (a) { return a.data; });
        });
    }

    // ========== SPF VALIDATION ==========
    function validateSPF(records) {
        var result = {
            found: false,
            value: null,
            status: 'notfound',
            issues: [],
            score: 0
        };

        var spfRecords = records.filter(function (r) {
            return r.indexOf('v=spf1') === 0;
        });

        if (spfRecords.length === 0) {
            result.issues.push({ level: 'error', text: 'Nenhum registro SPF encontrado. Crie um registro TXT comecando com v=spf1.' });
            return result;
        }

        if (spfRecords.length > 1) {
            result.issues.push({ level: 'error', text: 'Multiplos registros SPF detectados (' + spfRecords.length + '). Isso causa permerror - deve haver apenas UM registro SPF por dominio.' });
            result.status = 'error';
            result.value = spfRecords.join('\n');
            return result;
        }

        result.found = true;
        result.value = spfRecords[0];
        var spf = spfRecords[0];

        // Check for "all" mechanism at end
        if (/[+]all/.test(spf)) {
            result.issues.push({ level: 'error', text: 'Usa +all - PERMITE TODOS os servidores. NUNCA use isso. Substitua por -all (hard fail) ou ~all (soft fail).' });
            result.status = 'error';
            result.score = 10;
        } else if (/-all/.test(spf)) {
            result.issues.push({ level: 'ok', text: 'Usa -all (hard fail) - configuracao mais restritiva e segura.' });
            result.score += 40;
            result.status = 'ok';
        } else if (/~all/.test(spf)) {
            result.issues.push({ level: 'warning', text: 'Usa ~all (soft fail) - aceitavel mas considere -all para maxima protecao.' });
            result.score += 30;
            result.status = 'warning';
        } else if (/[?]all/.test(spf)) {
            result.issues.push({ level: 'warning', text: 'Usa ?all (neutral) - oferece pouca protecao. Use -all ou ~all.' });
            result.score += 15;
            result.status = 'warning';
        } else {
            result.issues.push({ level: 'warning', text: 'Sem mecanismo "all" no final. Recomenda-se -all ou ~all.' });
            result.score += 20;
            result.status = 'warning';
        }

        // Count DNS lookups (include, a, mx, exists, redirect)
        var lookupCount = 0;
        var lookupMechanisms = spf.match(/\b(include|a|mx|exists|redirect)[:=]?[^\s]*/g) || [];
        lookupMechanisms.forEach(function (m) {
            if (/^(include|exists|redirect)/.test(m)) lookupCount++;
            else if (/^(a|mx)(:|$)/.test(m)) lookupCount++;
        });

        if (lookupCount > 10) {
            result.issues.push({ level: 'error', text: 'Excede o limite de 10 DNS lookups (' + lookupCount + '). Causa falha permerror. Reduza includes ou consolide.' });
            result.status = 'error';
        } else if (lookupCount > 8) {
            result.issues.push({ level: 'warning', text: 'Proximo do limite de 10 DNS lookups (' + lookupCount + '). Cuidado ao adicionar novos includes.' });
            if (result.status === 'ok') result.status = 'warning';
        } else {
            result.issues.push({ level: 'ok', text: 'DNS lookups dentro do limite (' + lookupCount + '/10).' });
            result.score += 10;
        }

        // Check for ptr (deprecated)
        if (/\bptr\b/.test(spf)) {
            result.issues.push({ level: 'warning', text: 'Usa o mecanismo ptr - depreciado pela RFC 7208. Remova.' });
        }

        return result;
    }

    // ========== DKIM VALIDATION ==========
    function validateDKIM(domain, customSelector) {
        var selectors = customSelector ? [customSelector] : COMMON_DKIM_SELECTORS;

        var promises = selectors.map(function (sel) {
            return getTxtRecords(sel + '._domainkey.' + domain).then(function (records) {
                var dkim = records.find(function (r) { return r.indexOf('v=DKIM1') === 0 || r.indexOf('k=') >= 0 || r.indexOf('p=') >= 0; });
                return dkim ? { selector: sel, value: dkim } : null;
            }).catch(function () { return null; });
        });

        return Promise.all(promises).then(function (results) {
            var found = results.filter(function (r) { return r !== null; });
            var result = {
                found: found.length > 0,
                value: null,
                status: 'notfound',
                issues: [],
                score: 0
            };

            if (found.length === 0) {
                result.issues.push({ level: 'error', text: 'Nenhum registro DKIM encontrado nos seletores comuns. Especifique um seletor personalizado nas opcoes avancadas.' });
                return result;
            }

            // Use the first found
            var first = found[0];
            result.value = first.selector + '._domainkey: ' + first.value;
            result.status = 'ok';
            result.score = 30;

            result.issues.push({ level: 'ok', text: 'Registro DKIM encontrado no seletor "' + first.selector + '".' });

            // Check key length
            var pMatch = first.value.match(/p=([A-Za-z0-9+/=]+)/);
            if (pMatch) {
                var keyLen = pMatch[1].length;
                // Approximate: 1024-bit = ~216 chars, 2048-bit = ~392 chars
                if (keyLen < 200) {
                    result.issues.push({ level: 'warning', text: 'Chave DKIM parece ter menos de 1024 bits. Considere usar pelo menos 2048 bits.' });
                } else if (keyLen < 350) {
                    result.issues.push({ level: 'warning', text: 'Chave DKIM aparenta ser de 1024 bits. Recomenda-se 2048 bits para maior seguranca.' });
                    result.score += 5;
                } else {
                    result.issues.push({ level: 'ok', text: 'Chave DKIM tem 2048 bits ou mais (recomendado).' });
                    result.score += 10;
                }
            }

            // Check for revoked key
            if (/p=\s*$/.test(first.value) || /p=;/.test(first.value)) {
                result.issues.push({ level: 'error', text: 'Chave DKIM revogada (campo p= vazio). Remova o registro ou rotacione a chave.' });
                result.status = 'error';
            }

            if (found.length > 1) {
                var others = found.slice(1).map(function (f) { return f.selector; }).join(', ');
                result.issues.push({ level: 'info', text: 'Outros seletores DKIM tambem encontrados: ' + others });
            }

            return result;
        });
    }

    // ========== DMARC VALIDATION ==========
    function validateDMARC(records) {
        var result = {
            found: false,
            value: null,
            status: 'notfound',
            issues: [],
            score: 0
        };

        var dmarcRecords = records.filter(function (r) {
            return r.indexOf('v=DMARC1') === 0;
        });

        if (dmarcRecords.length === 0) {
            result.issues.push({ level: 'error', text: 'Nenhum registro DMARC encontrado em _dmarc.' + ' Crie um registro TXT em _dmarc.dominio.com comecando com v=DMARC1.' });
            return result;
        }

        if (dmarcRecords.length > 1) {
            result.issues.push({ level: 'error', text: 'Multiplos registros DMARC detectados. Deve haver apenas um.' });
            result.status = 'error';
            result.value = dmarcRecords.join('\n');
            return result;
        }

        result.found = true;
        result.value = dmarcRecords[0];
        var dmarc = dmarcRecords[0];

        // Policy
        var pMatch = dmarc.match(/p=(none|quarantine|reject)/);
        if (pMatch) {
            var policy = pMatch[1];
            if (policy === 'reject') {
                result.issues.push({ level: 'ok', text: 'Politica p=reject - maxima protecao contra spoofing.' });
                result.score += 40;
                result.status = 'ok';
            } else if (policy === 'quarantine') {
                result.issues.push({ level: 'ok', text: 'Politica p=quarantine - emails que falham vao para spam. Considere avancar para p=reject.' });
                result.score += 25;
                result.status = 'ok';
            } else {
                result.issues.push({ level: 'warning', text: 'Politica p=none - apenas monitora, nao bloqueia. Use temporariamente para coletar dados, depois avance para quarantine/reject.' });
                result.score += 10;
                result.status = 'warning';
            }
        } else {
            result.issues.push({ level: 'error', text: 'Falta tag p= obrigatoria.' });
            result.status = 'error';
        }

        // pct (percentage)
        var pctMatch = dmarc.match(/pct=(\d+)/);
        if (pctMatch) {
            var pct = parseInt(pctMatch[1], 10);
            if (pct < 100) {
                result.issues.push({ level: 'warning', text: 'pct=' + pct + ' - apenas ' + pct + '% dos emails sao avaliados. Aumente para 100 quando estiver confiante.' });
            } else {
                result.issues.push({ level: 'ok', text: 'pct=100 - todos os emails sao avaliados.' });
                result.score += 5;
            }
        }

        // rua (aggregate reports)
        if (/rua=mailto:/.test(dmarc)) {
            result.issues.push({ level: 'ok', text: 'Tag rua= configurada - relatorios agregados serao recebidos.' });
            result.score += 10;
        } else {
            result.issues.push({ level: 'warning', text: 'Sem tag rua= - voce nao recebera relatorios DMARC. Adicione rua=mailto:dmarc@seudominio.com' });
        }

        // ruf (forensic reports)
        if (/ruf=mailto:/.test(dmarc)) {
            result.issues.push({ level: 'info', text: 'Tag ruf= configurada - relatorios forenses (raros, mas uteis para analise).' });
        }

        // sp (subdomain policy)
        var spMatch = dmarc.match(/sp=(none|quarantine|reject)/);
        if (spMatch) {
            result.issues.push({ level: 'info', text: 'Politica de subdominios sp=' + spMatch[1] + ' definida.' });
        }

        // adkim/aspf alignment
        if (/adkim=s/.test(dmarc)) {
            result.issues.push({ level: 'info', text: 'adkim=s (strict) - DKIM deve ter alinhamento exato.' });
        }
        if (/aspf=s/.test(dmarc)) {
            result.issues.push({ level: 'info', text: 'aspf=s (strict) - SPF deve ter alinhamento exato.' });
        }

        return result;
    }

    // ========== UI HELPERS ==========
    function setStatus(elId, status, text) {
        var el = document.getElementById(elId);
        el.className = 'record-status ' + status;
        el.textContent = text || status.toUpperCase();
    }

    function renderAnalysis(elId, issues) {
        var el = document.getElementById(elId);
        if (issues.length === 0) {
            el.innerHTML = '';
            return;
        }
        var html = '<ul>';
        issues.forEach(function (i) {
            html += '<li class="' + i.level + '">' + escapeHtml(i.text) + '</li>';
        });
        html += '</ul>';
        el.innerHTML = html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function statusLabel(s) {
        return { ok: 'OK', warning: 'AVISO', error: 'ERRO', notfound: 'NAO ENCONTRADO' }[s] || s.toUpperCase();
    }

    // ========== MAIN ANALYSIS ==========
    function analyzeDomain(domain, customSelector) {
        var loading = document.getElementById('emailLoading');
        var results = document.getElementById('emailResults');
        loading.style.display = 'block';
        results.style.display = 'none';

        // Reset all
        ['spf', 'dkim', 'dmarc', 'mx'].forEach(function (k) {
            document.getElementById(k + 'Value').textContent = '';
            if (document.getElementById(k + 'Analysis')) {
                document.getElementById(k + 'Analysis').innerHTML = '';
            }
        });

        Promise.all([
            getTxtRecords(domain),
            validateDKIM(domain, customSelector),
            getTxtRecords('_dmarc.' + domain),
            getMxRecords(domain)
        ]).then(function (data) {
            var rootTxts = data[0];
            var dkimResult = data[1];
            var dmarcTxts = data[2];
            var mxRecords = data[3];

            var spfResult = validateSPF(rootTxts);
            var dmarcResult = validateDMARC(dmarcTxts);

            // SPF
            document.getElementById('spfValue').textContent = spfResult.value || '';
            setStatus('spfStatus', spfResult.status, statusLabel(spfResult.status));
            renderAnalysis('spfAnalysis', spfResult.issues);

            // DKIM
            document.getElementById('dkimValue').textContent = dkimResult.value || '';
            setStatus('dkimStatus', dkimResult.status, statusLabel(dkimResult.status));
            renderAnalysis('dkimAnalysis', dkimResult.issues);

            // DMARC
            document.getElementById('dmarcValue').textContent = dmarcResult.value || '';
            setStatus('dmarcStatus', dmarcResult.status, statusLabel(dmarcResult.status));
            renderAnalysis('dmarcAnalysis', dmarcResult.issues);

            // MX
            if (mxRecords.length > 0) {
                document.getElementById('mxValue').textContent = mxRecords.join('\n');
                setStatus('mxStatus', 'ok', 'OK');
            } else {
                setStatus('mxStatus', 'warning', 'NAO ENCONTRADO');
                document.getElementById('mxValue').textContent = 'Sem registros MX. O dominio nao recebe email.';
            }

            // Overall score (out of 100)
            var totalScore = spfResult.score + dkimResult.score + dmarcResult.score;
            var maxScore = 60 + 45 + 60; // approximate maximums
            var pct = Math.round((totalScore / 100) * 100); // normalized to ~100
            pct = Math.min(100, Math.max(0, pct));

            var scoreCircle = document.getElementById('scoreCircle');
            var scoreValue = document.getElementById('scoreValue');
            var scoreBadge = document.getElementById('scoreBadge');
            var scoreSummary = document.getElementById('scoreSummary');

            scoreValue.textContent = pct;

            var rating, summary;
            if (pct >= 80) {
                rating = 'excellent';
                summary = 'Excelente! Sua configuracao de autenticacao de email esta forte. Continue monitorando relatorios DMARC.';
            } else if (pct >= 60) {
                rating = 'good';
                summary = 'Boa configuracao. Existem oportunidades de melhoria - veja as recomendacoes em cada secao.';
            } else if (pct >= 30) {
                rating = 'fair';
                summary = 'Configuracao parcial. Alguns componentes estao ausentes ou mal configurados. Acoes recomendadas abaixo.';
            } else {
                rating = 'poor';
                summary = 'Sua marca esta vulneravel a spoofing e phishing. Configure SPF, DKIM e DMARC urgentemente.';
            }

            scoreCircle.className = 'score-circle ' + rating;
            scoreBadge.className = 'score-badge ' + rating;
            scoreBadge.textContent = { excellent: 'Excelente', good: 'Boa', fair: 'Razoavel', poor: 'Critica' }[rating];
            scoreSummary.textContent = summary;

            loading.style.display = 'none';
            results.style.display = 'block';
        }).catch(function (err) {
            console.error(err);
            loading.style.display = 'none';
            showToast('Erro ao consultar DNS. Verifique o dominio e tente novamente.');
        });
    }

    // ========== TOAST ==========
    function showToast(msg) {
        var toast = document.getElementById('email-toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2800);
    }

    // ========== INPUT VALIDATION ==========
    function cleanDomain(input) {
        return input.trim().toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/.*$/, '')
            .replace(/[^a-z0-9.\-]/g, '');
    }

    function isValidDomain(d) {
        return /^([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/i.test(d);
    }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function () {
        var input = document.getElementById('domainInput');
        var btn = document.getElementById('analyzeBtn');
        var dkimSelInput = document.getElementById('dkimSelector');

        function doAnalysis() {
            var domain = cleanDomain(input.value);
            if (!domain) {
                showToast('Digite um dominio valido.');
                return;
            }
            if (!isValidDomain(domain)) {
                showToast('Dominio invalido. Use o formato exemplo.com.br');
                return;
            }
            input.value = domain;
            var customSel = dkimSelInput.value.trim() || null;
            analyzeDomain(domain, customSel);
        }

        btn.addEventListener('click', doAnalysis);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') doAnalysis();
        });

        // URL hash support
        if (window.location.hash) {
            var hashDomain = decodeURIComponent(window.location.hash.substring(1));
            if (isValidDomain(hashDomain)) {
                input.value = hashDomain;
                doAnalysis();
            }
        }
    });

})();
