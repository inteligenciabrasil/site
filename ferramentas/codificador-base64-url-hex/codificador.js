/**
 * Codificador Base64/URL/Hex - Inteligencia Brasil
 * 100% client-side, sem envio ao servidor
 */
(function(){
    'use strict';

    var state = { tab: 'base64' };

    function $(id){ return document.getElementById(id); }

    function toast(msg){
        var t = $('encToast');
        if(!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function(){ t.classList.remove('show'); }, 1800);
    }

    function setStatus(panel, msg, cls){
        var s = $('status-' + panel);
        if(!s) return;
        s.textContent = msg || '';
        s.className = 'enc-status' + (cls ? ' ' + cls : '');
    }

    function setStats(panel, input, output){
        var s = $('stats-' + panel);
        if(!s) return;
        if(!input && !output){ s.innerHTML = ''; return; }
        var inBytes = new Blob([input||'']).size;
        var outBytes = new Blob([output||'']).size;
        s.innerHTML = '<span>Entrada: <strong>' + input.length + '</strong> chars / <strong>' + inBytes + '</strong> bytes</span>' +
                      '<span>Saida: <strong>' + output.length + '</strong> chars / <strong>' + outBytes + '</strong> bytes</span>';
    }

    // ========== BASE64 ==========
    function base64Encode(str, urlSafe){
        try {
            var bytes = new TextEncoder().encode(str);
            var bin = '';
            for(var i=0; i<bytes.length; i++) bin += String.fromCharCode(bytes[i]);
            var out = btoa(bin);
            if(urlSafe) out = out.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
            return out;
        } catch(e){ throw new Error('Falha ao codificar: ' + e.message); }
    }

    function base64Decode(str, urlSafe){
        try {
            var s = str.trim();
            if(urlSafe || /[-_]/.test(s)){
                s = s.replace(/-/g,'+').replace(/_/g,'/');
                while(s.length % 4) s += '=';
            }
            var bin = atob(s);
            var bytes = new Uint8Array(bin.length);
            for(var i=0; i<bin.length; i++) bytes[i] = bin.charCodeAt(i);
            return new TextDecoder().decode(bytes);
        } catch(e){ throw new Error('Base64 invalido'); }
    }

    // ========== URL ==========
    function urlEncode(str, component){
        return component ? encodeURIComponent(str) : encodeURI(str);
    }

    function urlDecode(str, component){
        try {
            return component ? decodeURIComponent(str) : decodeURI(str);
        } catch(e){ throw new Error('URL invalida ou mal codificada'); }
    }

    // ========== HEX ==========
    function hexEncode(str, separator){
        var bytes = new TextEncoder().encode(str);
        var hex = [];
        for(var i=0; i<bytes.length; i++){
            hex.push(bytes[i].toString(16).padStart(2,'0'));
        }
        return hex.join(separator || '');
    }

    function hexDecode(str){
        try {
            var s = str.replace(/[\s,:\-]/g,'').replace(/^0x/i,'').toLowerCase();
            if(s.length % 2 !== 0) throw new Error('Comprimento impar');
            if(!/^[0-9a-f]*$/.test(s)) throw new Error('Caracteres nao-hex');
            var bytes = new Uint8Array(s.length / 2);
            for(var i=0; i<s.length; i+=2){
                bytes[i/2] = parseInt(s.substr(i,2), 16);
            }
            return new TextDecoder().decode(bytes);
        } catch(e){ throw new Error('Hex invalido: ' + e.message); }
    }

    // ========== PANEL HANDLERS ==========
    function handlePanel(panel, encodeFn, decodeFn){
        var input = $('input-' + panel);
        var output = $('output-' + panel);
        var btnEncode = $('encode-' + panel);
        var btnDecode = $('decode-' + panel);
        var btnSwap = $('swap-' + panel);
        var btnClear = $('clear-' + panel);
        var btnCopy = $('copy-' + panel);
        var btnPaste = $('paste-' + panel);

        btnEncode.addEventListener('click', function(){
            try {
                var v = encodeFn(input.value);
                output.value = v;
                setStatus(panel, 'Codificado com sucesso', 'success');
                setStats(panel, input.value, v);
            } catch(e){
                setStatus(panel, e.message, 'error');
            }
        });

        btnDecode.addEventListener('click', function(){
            try {
                var v = decodeFn(input.value);
                output.value = v;
                setStatus(panel, 'Decodificado com sucesso', 'success');
                setStats(panel, input.value, v);
            } catch(e){
                setStatus(panel, e.message, 'error');
            }
        });

        btnSwap.addEventListener('click', function(){
            var tmp = input.value;
            input.value = output.value;
            output.value = tmp;
            setStatus(panel, '');
            setStats(panel, input.value, output.value);
        });

        btnClear.addEventListener('click', function(){
            input.value = '';
            output.value = '';
            setStatus(panel, '');
            setStats(panel, '', '');
            input.focus();
        });

        btnCopy.addEventListener('click', function(){
            if(!output.value){ toast('Nada para copiar'); return; }
            navigator.clipboard.writeText(output.value).then(function(){
                toast('Copiado!');
            }).catch(function(){
                output.select();
                document.execCommand('copy');
                toast('Copiado!');
            });
        });

        if(btnPaste){
            btnPaste.addEventListener('click', function(){
                navigator.clipboard.readText().then(function(t){
                    input.value = t;
                    input.focus();
                }).catch(function(){
                    toast('Permissao negada para colar');
                });
            });
        }
    }

    // ========== TABS ==========
    function initTabs(){
        var tabs = document.querySelectorAll('.enc-tab');
        tabs.forEach(function(t){
            t.addEventListener('click', function(){
                var target = t.getAttribute('data-tab');
                tabs.forEach(function(x){ x.classList.remove('active'); });
                document.querySelectorAll('.enc-panel').forEach(function(p){ p.classList.remove('active'); });
                t.classList.add('active');
                var panel = $('panel-' + target);
                if(panel) panel.classList.add('active');
                state.tab = target;
            });
        });
    }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function(){
        initTabs();

        handlePanel('base64',
            function(s){ return base64Encode(s, $('opt-b64-urlsafe').checked); },
            function(s){ return base64Decode(s, $('opt-b64-urlsafe').checked); }
        );

        handlePanel('url',
            function(s){ return urlEncode(s, $('opt-url-mode').value === 'component'); },
            function(s){ return urlDecode(s, $('opt-url-mode').value === 'component'); }
        );

        handlePanel('hex',
            function(s){ return hexEncode(s, $('opt-hex-sep').value); },
            function(s){ return hexDecode(s); }
        );
    });
})();
