/**
 * Decoder JWT - Inteligencia Brasil
 * 100% client-side. Decodifica header e payload, valida claims temporais
 * e sinaliza vulnerabilidades como alg=none.
 */
(function(){
    'use strict';

    function $(id){ return document.getElementById(id); }

    function toast(msg){
        var t = $('jwtToast');
        if(!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function(){ t.classList.remove('show'); }, 1800);
    }

    function base64UrlDecode(str){
        var s = str.replace(/-/g,'+').replace(/_/g,'/');
        while(s.length % 4) s += '=';
        var bin = atob(s);
        var bytes = new Uint8Array(bin.length);
        for(var i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    function escapeHtml(s){
        return String(s).replace(/[&<>"']/g, function(c){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
    }

    function highlightJSON(json){
        try {
            var obj = typeof json === 'string' ? JSON.parse(json) : json;
            var str = JSON.stringify(obj, null, 2);
            return str.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function(match){
                var cls = 'j-num';
                if(/^"/.test(match)){
                    cls = /:$/.test(match) ? 'j-key' : 'j-str';
                } else if(/true|false/.test(match)){
                    cls = 'j-bool';
                } else if(/null/.test(match)){
                    cls = 'j-null';
                }
                return '<span class="'+cls+'">'+escapeHtml(match)+'</span>';
            });
        } catch(e){
            return escapeHtml(String(json));
        }
    }

    function formatDate(unix){
        if(typeof unix !== 'number') return 'Invalido';
        var d = new Date(unix * 1000);
        if(isNaN(d.getTime())) return 'Invalido';
        return d.toISOString().replace('T',' ').replace(/\.\d+Z$/,' UTC');
    }

    function relativeTime(unix){
        var now = Math.floor(Date.now()/1000);
        var diff = unix - now;
        var abs = Math.abs(diff);
        var unit = 'segundos', val = abs;
        if(abs >= 86400){ unit = 'dias'; val = Math.round(abs/86400); }
        else if(abs >= 3600){ unit = 'horas'; val = Math.round(abs/3600); }
        else if(abs >= 60){ unit = 'minutos'; val = Math.round(abs/60); }
        return diff < 0 ? 'ha ' + val + ' ' + unit : 'em ' + val + ' ' + unit;
    }

    var CLAIM_DESCRIPTIONS = {
        iss: 'Issuer - quem emitiu o token',
        sub: 'Subject - sujeito (geralmente ID do usuario)',
        aud: 'Audience - destinatario pretendido',
        exp: 'Expiration - quando expira (Unix time)',
        nbf: 'Not Before - valido a partir de (Unix time)',
        iat: 'Issued At - quando foi emitido (Unix time)',
        jti: 'JWT ID - identificador unico do token',
        typ: 'Type - tipo do token',
        alg: 'Algorithm - algoritmo de assinatura',
        kid: 'Key ID - identificador da chave usada',
        cty: 'Content Type',
        azp: 'Authorized Party (OIDC)',
        nonce: 'Nonce (OIDC)',
        scope: 'Escopos concedidos',
        scp: 'Escopos (Microsoft)',
        roles: 'Papeis atribuidos',
        email: 'Email do usuario',
        name: 'Nome do usuario',
        preferred_username: 'Username preferido'
    };

    function renderClaims(obj, container){
        container.innerHTML = '';
        var now = Math.floor(Date.now()/1000);
        Object.keys(obj).forEach(function(k){
            var v = obj[k];
            var valHtml = '';
            var cls = '';

            if((k === 'exp' || k === 'nbf' || k === 'iat' || k === 'auth_time') && typeof v === 'number'){
                valHtml = escapeHtml(String(v));
                valHtml += '<span class="jwt-time">' + escapeHtml(formatDate(v)) + ' (' + escapeHtml(relativeTime(v)) + ')</span>';
                if(k === 'exp'){ cls = v < now ? 'expired' : 'valid'; }
                else if(k === 'nbf'){ cls = v > now ? 'future' : 'valid'; }
            } else if(typeof v === 'object' && v !== null){
                valHtml = escapeHtml(JSON.stringify(v));
            } else {
                valHtml = escapeHtml(String(v));
            }

            var desc = CLAIM_DESCRIPTIONS[k];
            var keyHtml = '<span class="jwt-claim-key">' + escapeHtml(k) + '</span>';
            if(desc){
                keyHtml += '<span style="color:#64748B;font-size:.7rem;display:block;margin-top:2px">' + escapeHtml(desc) + '</span>';
            }

            var div = document.createElement('div');
            div.className = 'jwt-claim';
            div.innerHTML = '<div>' + keyHtml + '</div><div class="jwt-claim-val ' + cls + '">' + valHtml + '</div>';
            container.appendChild(div);
        });
    }

    function analyzeSecurity(header, payload){
        var alerts = [];
        var now = Math.floor(Date.now()/1000);

        // alg=none
        if(header.alg && String(header.alg).toLowerCase() === 'none'){
            alerts.push({
                level: 'danger',
                title: 'CRITICO: alg=none detectado',
                msg: 'Este token nao tem assinatura. Se o servidor aceita alg=none, qualquer pessoa pode forjar tokens. Vulnerabilidade documentada em CVE-2015-9235.'
            });
        }

        // weak alg
        if(header.alg === 'HS256' || header.alg === 'HS384' || header.alg === 'HS512'){
            alerts.push({
                level: 'warn',
                title: 'Algoritmo simetrico: ' + header.alg,
                msg: 'Tokens HMAC dependem de segredo compartilhado. Se o segredo for fraco (palavra comum), pode ser quebrado por brute-force offline. Prefira RS256/ES256 para sistemas distribuidos.'
            });
        }

        // exp claim
        if(payload.exp === undefined){
            alerts.push({
                level: 'warn',
                title: 'Claim exp ausente',
                msg: 'Token sem expiracao - nao expira nunca. Boa pratica: sempre incluir exp com vida curta (minutos a horas).'
            });
        } else if(typeof payload.exp === 'number' && payload.exp < now){
            alerts.push({
                level: 'danger',
                title: 'Token expirado',
                msg: 'Este token expirou ' + relativeTime(payload.exp) + '. Nao deveria ser aceito pelo servidor.'
            });
        } else if(typeof payload.exp === 'number'){
            alerts.push({
                level: 'ok',
                title: 'Token valido temporalmente',
                msg: 'Expira ' + relativeTime(payload.exp) + ' (' + formatDate(payload.exp) + ').'
            });
        }

        // nbf claim
        if(typeof payload.nbf === 'number' && payload.nbf > now){
            alerts.push({
                level: 'warn',
                title: 'Token ainda nao e valido (nbf futuro)',
                msg: 'Claim nbf indica que o token so sera valido ' + relativeTime(payload.nbf) + '.'
            });
        }

        // iat claim
        if(payload.iat === undefined){
            alerts.push({
                level: 'warn',
                title: 'Claim iat ausente',
                msg: 'Sem iat, nao e possivel determinar quando o token foi emitido - dificulta auditoria e deteccao de replay.'
            });
        }

        // sub / aud
        if(!payload.sub){
            alerts.push({
                level: 'warn',
                title: 'Claim sub ausente',
                msg: 'Sem subject, nao ha identificacao clara de a quem o token se refere.'
            });
        }

        // kid injection
        if(header.kid && /[\/\\\.\.]/.test(String(header.kid))){
            alerts.push({
                level: 'danger',
                title: 'Possivel kid injection',
                msg: 'Header kid contem caracteres suspeitos (/, \\, ..). Implementacoes vulneraveis usam kid para carregar chaves de arquivos, permitindo path traversal.'
            });
        }

        return alerts;
    }

    function colorizeInput(jwt){
        var display = $('jwtDisplay');
        var parts = jwt.split('.');
        if(parts.length < 2 || parts.length > 3){
            display.innerHTML = escapeHtml(jwt);
            return;
        }
        var html = '<span class="jwt-header">' + escapeHtml(parts[0]) + '</span>';
        if(parts[1] !== undefined){
            html += '<span class="jwt-colored">.</span><span class="jwt-payload">' + escapeHtml(parts[1]) + '</span>';
        }
        if(parts[2] !== undefined){
            html += '<span class="jwt-colored">.</span><span class="jwt-signature">' + escapeHtml(parts[2]) + '</span>';
        }
        display.innerHTML = html;
    }

    function decode(){
        var raw = $('jwtInput').value.trim();
        var empty = $('jwtEmpty');
        var output = $('jwtOutput');
        var alerts = $('jwtAlerts');

        if(!raw){
            empty.style.display = 'block';
            output.style.display = 'none';
            alerts.innerHTML = '';
            $('jwtDisplay').innerHTML = '';
            return;
        }

        var parts = raw.split('.');
        if(parts.length < 2 || parts.length > 3){
            empty.style.display = 'block';
            output.style.display = 'none';
            alerts.innerHTML = '<div class="jwt-alert danger"><i class="fas fa-times-circle"></i><div><strong>Formato invalido</strong>JWT deve ter 2 ou 3 segmentos separados por ponto (header.payload.signature).</div></div>';
            $('jwtDisplay').innerHTML = '';
            return;
        }

        try {
            colorizeInput(raw);
            var headerJson = base64UrlDecode(parts[0]);
            var payloadJson = base64UrlDecode(parts[1]);
            var header = JSON.parse(headerJson);
            var payload = JSON.parse(payloadJson);

            $('headerJson').innerHTML = highlightJSON(header);
            $('payloadJson').innerHTML = highlightJSON(payload);

            renderClaims(header, $('headerClaims'));
            renderClaims(payload, $('payloadClaims'));

            // Security analysis
            var sec = analyzeSecurity(header, payload);
            alerts.innerHTML = sec.map(function(a){
                var icon = a.level === 'danger' ? 'fa-exclamation-triangle' :
                           a.level === 'warn' ? 'fa-exclamation-circle' : 'fa-check-circle';
                return '<div class="jwt-alert ' + a.level + '"><i class="fas ' + icon + '"></i><div><strong>' + escapeHtml(a.title) + '</strong>' + escapeHtml(a.msg) + '</div></div>';
            }).join('');

            empty.style.display = 'none';
            output.style.display = 'block';
        } catch(e){
            empty.style.display = 'block';
            output.style.display = 'none';
            alerts.innerHTML = '<div class="jwt-alert danger"><i class="fas fa-times-circle"></i><div><strong>Erro ao decodificar</strong>' + escapeHtml(e.message) + '</div></div>';
        }
    }

    document.addEventListener('DOMContentLoaded', function(){
        var input = $('jwtInput');

        var debounce;
        input.addEventListener('input', function(){
            clearTimeout(debounce);
            debounce = setTimeout(decode, 150);
        });

        $('jwtPaste').addEventListener('click', function(){
            navigator.clipboard.readText().then(function(t){
                input.value = t.trim();
                decode();
            }).catch(function(){
                toast('Permissao negada para colar');
            });
        });

        $('jwtClear').addEventListener('click', function(){
            input.value = '';
            decode();
            input.focus();
        });

        $('jwtExample').addEventListener('click', function(){
            // Example token (alg=HS256, iss=inteligenciabrasil, sub=1234567890, exp=futuro)
            input.value = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNjk2MDAwMDAwLCJleHAiOjQ4NjM1NDU2MDAsImlzcyI6ImludGVsaWdlbmNpYWJyYXNpbCIsImF1ZCI6ImFwaS5leGVtcGxvLmNvbSIsInJvbGVzIjpbInVzZXIiLCJhZG1pbiJdfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
            decode();
        });
    });
})();
