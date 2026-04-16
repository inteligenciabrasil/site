/**
 * Calculadora de Hash - Inteligencia Brasil
 * SHA-1, SHA-256, SHA-384, SHA-512 via Web Crypto API
 * MD5 via implementacao local (RFC 1321)
 * 100% client-side
 */
(function(){
    'use strict';

    // ========== MD5 (RFC 1321) - implementacao local ==========
    // Baseado em referencias publicas de MD5 em JS puro.
    function md5(str){
        function safeAdd(x,y){ var lsw=(x&0xFFFF)+(y&0xFFFF); var msw=(x>>16)+(y>>16)+(lsw>>16); return (msw<<16)|(lsw&0xFFFF); }
        function bitRol(num,cnt){ return (num<<cnt)|(num>>>(32-cnt)); }
        function md5cmn(q,a,b,x,s,t){ return safeAdd(bitRol(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b); }
        function md5ff(a,b,c,d,x,s,t){ return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
        function md5gg(a,b,c,d,x,s,t){ return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
        function md5hh(a,b,c,d,x,s,t){ return md5cmn(b^c^d,a,b,x,s,t); }
        function md5ii(a,b,c,d,x,s,t){ return md5cmn(c^(b|(~d)),a,b,x,s,t); }

        function binlMD5(x,len){
            x[len>>5]|=0x80<<(len%32);
            x[(((len+64)>>>9)<<4)+14]=len;
            var a=1732584193,b=-271733879,c=-1732584194,d=271733878;
            for(var i=0;i<x.length;i+=16){
                var olda=a,oldb=b,oldc=c,oldd=d;
                a=md5ff(a,b,c,d,x[i],7,-680876936);
                d=md5ff(d,a,b,c,x[i+1],12,-389564586);
                c=md5ff(c,d,a,b,x[i+2],17,606105819);
                b=md5ff(b,c,d,a,x[i+3],22,-1044525330);
                a=md5ff(a,b,c,d,x[i+4],7,-176418897);
                d=md5ff(d,a,b,c,x[i+5],12,1200080426);
                c=md5ff(c,d,a,b,x[i+6],17,-1473231341);
                b=md5ff(b,c,d,a,x[i+7],22,-45705983);
                a=md5ff(a,b,c,d,x[i+8],7,1770035416);
                d=md5ff(d,a,b,c,x[i+9],12,-1958414417);
                c=md5ff(c,d,a,b,x[i+10],17,-42063);
                b=md5ff(b,c,d,a,x[i+11],22,-1990404162);
                a=md5ff(a,b,c,d,x[i+12],7,1804603682);
                d=md5ff(d,a,b,c,x[i+13],12,-40341101);
                c=md5ff(c,d,a,b,x[i+14],17,-1502002290);
                b=md5ff(b,c,d,a,x[i+15],22,1236535329);

                a=md5gg(a,b,c,d,x[i+1],5,-165796510);
                d=md5gg(d,a,b,c,x[i+6],9,-1069501632);
                c=md5gg(c,d,a,b,x[i+11],14,643717713);
                b=md5gg(b,c,d,a,x[i],20,-373897302);
                a=md5gg(a,b,c,d,x[i+5],5,-701558691);
                d=md5gg(d,a,b,c,x[i+10],9,38016083);
                c=md5gg(c,d,a,b,x[i+15],14,-660478335);
                b=md5gg(b,c,d,a,x[i+4],20,-405537848);
                a=md5gg(a,b,c,d,x[i+9],5,568446438);
                d=md5gg(d,a,b,c,x[i+14],9,-1019803690);
                c=md5gg(c,d,a,b,x[i+3],14,-187363961);
                b=md5gg(b,c,d,a,x[i+8],20,1163531501);
                a=md5gg(a,b,c,d,x[i+13],5,-1444681467);
                d=md5gg(d,a,b,c,x[i+2],9,-51403784);
                c=md5gg(c,d,a,b,x[i+7],14,1735328473);
                b=md5gg(b,c,d,a,x[i+12],20,-1926607734);

                a=md5hh(a,b,c,d,x[i+5],4,-378558);
                d=md5hh(d,a,b,c,x[i+8],11,-2022574463);
                c=md5hh(c,d,a,b,x[i+11],16,1839030562);
                b=md5hh(b,c,d,a,x[i+14],23,-35309556);
                a=md5hh(a,b,c,d,x[i+1],4,-1530992060);
                d=md5hh(d,a,b,c,x[i+4],11,1272893353);
                c=md5hh(c,d,a,b,x[i+7],16,-155497632);
                b=md5hh(b,c,d,a,x[i+10],23,-1094730640);
                a=md5hh(a,b,c,d,x[i+13],4,681279174);
                d=md5hh(d,a,b,c,x[i],11,-358537222);
                c=md5hh(c,d,a,b,x[i+3],16,-722521979);
                b=md5hh(b,c,d,a,x[i+6],23,76029189);
                a=md5hh(a,b,c,d,x[i+9],4,-640364487);
                d=md5hh(d,a,b,c,x[i+12],11,-421815835);
                c=md5hh(c,d,a,b,x[i+15],16,530742520);
                b=md5hh(b,c,d,a,x[i+2],23,-995338651);

                a=md5ii(a,b,c,d,x[i],6,-198630844);
                d=md5ii(d,a,b,c,x[i+7],10,1126891415);
                c=md5ii(c,d,a,b,x[i+14],15,-1416354905);
                b=md5ii(b,c,d,a,x[i+5],21,-57434055);
                a=md5ii(a,b,c,d,x[i+12],6,1700485571);
                d=md5ii(d,a,b,c,x[i+3],10,-1894986606);
                c=md5ii(c,d,a,b,x[i+10],15,-1051523);
                b=md5ii(b,c,d,a,x[i+1],21,-2054922799);
                a=md5ii(a,b,c,d,x[i+8],6,1873313359);
                d=md5ii(d,a,b,c,x[i+15],10,-30611744);
                c=md5ii(c,d,a,b,x[i+6],15,-1560198380);
                b=md5ii(b,c,d,a,x[i+13],21,1309151649);
                a=md5ii(a,b,c,d,x[i+4],6,-145523070);
                d=md5ii(d,a,b,c,x[i+11],10,-1120210379);
                c=md5ii(c,d,a,b,x[i+2],15,718787259);
                b=md5ii(b,c,d,a,x[i+9],21,-343485551);

                a=safeAdd(a,olda); b=safeAdd(b,oldb); c=safeAdd(c,oldc); d=safeAdd(d,oldd);
            }
            return [a,b,c,d];
        }

        function binl2hex(binarray){
            var hexTab='0123456789abcdef',str='';
            for(var i=0;i<binarray.length*4;i++){
                str+=hexTab.charAt((binarray[i>>2]>>((i%4)*8+4))&0xF)+hexTab.charAt((binarray[i>>2]>>((i%4)*8))&0xF);
            }
            return str;
        }

        function bytesToWords(bytes){
            var words=[];
            for(var i=0,b=0;i<bytes.length;i++,b+=8){
                words[b>>5]|=(bytes[i]&0xFF)<<(b%32);
            }
            return words;
        }

        var bytes = new TextEncoder().encode(str);
        return binl2hex(binlMD5(bytesToWords(bytes), bytes.length*8));
    }

    // MD5 de ArrayBuffer
    function md5Buffer(buffer){
        var bytes = new Uint8Array(buffer);
        function safeAdd(x,y){ var lsw=(x&0xFFFF)+(y&0xFFFF); var msw=(x>>16)+(y>>16)+(lsw>>16); return (msw<<16)|(lsw&0xFFFF); }
        function bitRol(num,cnt){ return (num<<cnt)|(num>>>(32-cnt)); }
        function md5cmn(q,a,b,x,s,t){ return safeAdd(bitRol(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b); }
        function md5ff(a,b,c,d,x,s,t){ return md5cmn((b&c)|((~b)&d),a,b,x,s,t); }
        function md5gg(a,b,c,d,x,s,t){ return md5cmn((b&d)|(c&(~d)),a,b,x,s,t); }
        function md5hh(a,b,c,d,x,s,t){ return md5cmn(b^c^d,a,b,x,s,t); }
        function md5ii(a,b,c,d,x,s,t){ return md5cmn(c^(b|(~d)),a,b,x,s,t); }

        var words=[];
        for(var i=0,b=0;i<bytes.length;i++,b+=8){ words[b>>5]|=(bytes[i]&0xFF)<<(b%32); }
        var len = bytes.length*8;
        words[len>>5]|=0x80<<(len%32);
        words[(((len+64)>>>9)<<4)+14]=len;

        var a=1732584193,bb=-271733879,c=-1732584194,d=271733878;
        for(var j=0;j<words.length;j+=16){
            var x=[];
            for(var k=0;k<16;k++) x[k]=words[j+k]||0;
            var olda=a,oldb=bb,oldc=c,oldd=d;
            a=md5ff(a,bb,c,d,x[0],7,-680876936); d=md5ff(d,a,bb,c,x[1],12,-389564586);
            c=md5ff(c,d,a,bb,x[2],17,606105819); bb=md5ff(bb,c,d,a,x[3],22,-1044525330);
            a=md5ff(a,bb,c,d,x[4],7,-176418897); d=md5ff(d,a,bb,c,x[5],12,1200080426);
            c=md5ff(c,d,a,bb,x[6],17,-1473231341); bb=md5ff(bb,c,d,a,x[7],22,-45705983);
            a=md5ff(a,bb,c,d,x[8],7,1770035416); d=md5ff(d,a,bb,c,x[9],12,-1958414417);
            c=md5ff(c,d,a,bb,x[10],17,-42063); bb=md5ff(bb,c,d,a,x[11],22,-1990404162);
            a=md5ff(a,bb,c,d,x[12],7,1804603682); d=md5ff(d,a,bb,c,x[13],12,-40341101);
            c=md5ff(c,d,a,bb,x[14],17,-1502002290); bb=md5ff(bb,c,d,a,x[15],22,1236535329);

            a=md5gg(a,bb,c,d,x[1],5,-165796510); d=md5gg(d,a,bb,c,x[6],9,-1069501632);
            c=md5gg(c,d,a,bb,x[11],14,643717713); bb=md5gg(bb,c,d,a,x[0],20,-373897302);
            a=md5gg(a,bb,c,d,x[5],5,-701558691); d=md5gg(d,a,bb,c,x[10],9,38016083);
            c=md5gg(c,d,a,bb,x[15],14,-660478335); bb=md5gg(bb,c,d,a,x[4],20,-405537848);
            a=md5gg(a,bb,c,d,x[9],5,568446438); d=md5gg(d,a,bb,c,x[14],9,-1019803690);
            c=md5gg(c,d,a,bb,x[3],14,-187363961); bb=md5gg(bb,c,d,a,x[8],20,1163531501);
            a=md5gg(a,bb,c,d,x[13],5,-1444681467); d=md5gg(d,a,bb,c,x[2],9,-51403784);
            c=md5gg(c,d,a,bb,x[7],14,1735328473); bb=md5gg(bb,c,d,a,x[12],20,-1926607734);

            a=md5hh(a,bb,c,d,x[5],4,-378558); d=md5hh(d,a,bb,c,x[8],11,-2022574463);
            c=md5hh(c,d,a,bb,x[11],16,1839030562); bb=md5hh(bb,c,d,a,x[14],23,-35309556);
            a=md5hh(a,bb,c,d,x[1],4,-1530992060); d=md5hh(d,a,bb,c,x[4],11,1272893353);
            c=md5hh(c,d,a,bb,x[7],16,-155497632); bb=md5hh(bb,c,d,a,x[10],23,-1094730640);
            a=md5hh(a,bb,c,d,x[13],4,681279174); d=md5hh(d,a,bb,c,x[0],11,-358537222);
            c=md5hh(c,d,a,bb,x[3],16,-722521979); bb=md5hh(bb,c,d,a,x[6],23,76029189);
            a=md5hh(a,bb,c,d,x[9],4,-640364487); d=md5hh(d,a,bb,c,x[12],11,-421815835);
            c=md5hh(c,d,a,bb,x[15],16,530742520); bb=md5hh(bb,c,d,a,x[2],23,-995338651);

            a=md5ii(a,bb,c,d,x[0],6,-198630844); d=md5ii(d,a,bb,c,x[7],10,1126891415);
            c=md5ii(c,d,a,bb,x[14],15,-1416354905); bb=md5ii(bb,c,d,a,x[5],21,-57434055);
            a=md5ii(a,bb,c,d,x[12],6,1700485571); d=md5ii(d,a,bb,c,x[3],10,-1894986606);
            c=md5ii(c,d,a,bb,x[10],15,-1051523); bb=md5ii(bb,c,d,a,x[1],21,-2054922799);
            a=md5ii(a,bb,c,d,x[8],6,1873313359); d=md5ii(d,a,bb,c,x[15],10,-30611744);
            c=md5ii(c,d,a,bb,x[6],15,-1560198380); bb=md5ii(bb,c,d,a,x[13],21,1309151649);
            a=md5ii(a,bb,c,d,x[4],6,-145523070); d=md5ii(d,a,bb,c,x[11],10,-1120210379);
            c=md5ii(c,d,a,bb,x[2],15,718787259); bb=md5ii(bb,c,d,a,x[9],21,-343485551);

            a=safeAdd(a,olda); bb=safeAdd(bb,oldb); c=safeAdd(c,oldc); d=safeAdd(d,oldd);
        }

        var hexTab='0123456789abcdef',result='';
        var binarray=[a,bb,c,d];
        for(var m=0;m<16;m++){
            result+=hexTab.charAt((binarray[m>>2]>>((m%4)*8+4))&0xF)+hexTab.charAt((binarray[m>>2]>>((m%4)*8))&0xF);
        }
        return result;
    }

    // ========== Web Crypto ==========
    async function cryptoHash(algo, data){
        var hashBuf = await crypto.subtle.digest(algo, data);
        var bytes = new Uint8Array(hashBuf);
        var hex = '';
        for(var i=0; i<bytes.length; i++){
            hex += bytes[i].toString(16).padStart(2,'0');
        }
        return hex;
    }

    var ALGORITHMS = [
        { id:'md5', label:'MD5', badge:'INSEGURO', api:'md5' },
        { id:'sha1', label:'SHA-1', badge:'LEGADO', api:'SHA-1' },
        { id:'sha256', label:'SHA-256', badge:'', api:'SHA-256' },
        { id:'sha384', label:'SHA-384', badge:'', api:'SHA-384' },
        { id:'sha512', label:'SHA-512', badge:'', api:'SHA-512' }
    ];

    function $(id){ return document.getElementById(id); }

    function toast(msg){
        var t = $('hashToast');
        if(!t) return;
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function(){ t.classList.remove('show'); }, 1800);
    }

    function formatHash(hex, upper, separator){
        var out = upper ? hex.toUpperCase() : hex.toLowerCase();
        if(separator === 'space'){
            return out.match(/.{1,2}/g).join(' ');
        } else if(separator === 'colon'){
            return out.match(/.{1,2}/g).join(':');
        }
        return out;
    }

    function renderResults(container, hashes){
        var upper = $('opt-upper').checked;
        var sep = $('opt-separator').value;
        container.innerHTML = '';
        ALGORITHMS.forEach(function(a){
            var hex = hashes[a.id];
            if(hex === undefined) return;
            var formatted = formatHash(hex, upper, sep);
            var div = document.createElement('div');
            div.className = 'hash-result';
            var badge = a.badge ? '<span class="hash-badge">' + a.badge + '</span>' : '';
            div.innerHTML =
                '<div class="hash-result-label">' + a.label + badge + '</div>' +
                '<div class="hash-result-value" data-raw="' + hex + '">' + formatted + '</div>' +
                '<button class="hash-result-copy" data-algo="' + a.id + '"><i class="fas fa-copy"></i></button>';
            container.appendChild(div);
        });
        container.querySelectorAll('.hash-result-copy').forEach(function(btn){
            btn.addEventListener('click', function(){
                var val = btn.previousElementSibling.textContent;
                navigator.clipboard.writeText(val).then(function(){
                    toast('Hash copiado!');
                });
            });
        });
        updateCompare();
    }

    function updateCompare(){
        var input = $('compare-input').value.trim().toLowerCase().replace(/[\s:]/g,'');
        var result = $('compare-result');
        if(!input){
            result.className = 'hash-compare-result';
            result.textContent = '';
            return;
        }
        var hashes = currentHashes;
        if(!hashes){ return; }
        var matched = null;
        for(var k in hashes){
            if(hashes[k] === input){ matched = k.toUpperCase(); break; }
        }
        if(matched){
            result.className = 'hash-compare-result match';
            result.innerHTML = '<i class="fas fa-check-circle"></i> Hash confere com <strong>' + matched + '</strong>';
        } else {
            result.className = 'hash-compare-result nomatch';
            result.innerHTML = '<i class="fas fa-times-circle"></i> Nenhum dos hashes calculados bate com o valor informado';
        }
    }

    var currentHashes = null;

    // ========== TEXT PANEL ==========
    async function computeText(){
        var text = $('text-input').value;
        if(!text){
            $('text-results').innerHTML = '';
            currentHashes = null;
            updateCompare();
            return;
        }
        var data = new TextEncoder().encode(text);
        var results = {};
        results.md5 = md5(text);
        results.sha1 = await cryptoHash('SHA-1', data);
        results.sha256 = await cryptoHash('SHA-256', data);
        results.sha384 = await cryptoHash('SHA-384', data);
        results.sha512 = await cryptoHash('SHA-512', data);
        currentHashes = results;
        renderResults($('text-results'), results);
    }

    // ========== FILE PANEL ==========
    async function computeFile(file){
        $('file-info').innerHTML = '<i class="fas fa-file"></i> <strong>' + file.name + '</strong> - ' + formatBytes(file.size);
        var progress = $('file-progress');
        var fill = $('file-progress-fill');
        progress.classList.add('show');
        fill.style.width = '10%';

        var buffer = await file.arrayBuffer();
        fill.style.width = '30%';

        var results = {};
        results.md5 = md5Buffer(buffer);
        fill.style.width = '50%';

        results.sha1 = await cryptoHash('SHA-1', buffer);
        fill.style.width = '65%';

        results.sha256 = await cryptoHash('SHA-256', buffer);
        fill.style.width = '80%';

        results.sha384 = await cryptoHash('SHA-384', buffer);
        fill.style.width = '92%';

        results.sha512 = await cryptoHash('SHA-512', buffer);
        fill.style.width = '100%';

        setTimeout(function(){ progress.classList.remove('show'); fill.style.width = '0%'; }, 500);

        currentHashes = results;
        renderResults($('file-results'), results);
    }

    function formatBytes(b){
        if(b < 1024) return b + ' B';
        if(b < 1048576) return (b/1024).toFixed(1) + ' KB';
        if(b < 1073741824) return (b/1048576).toFixed(2) + ' MB';
        return (b/1073741824).toFixed(2) + ' GB';
    }

    // ========== TABS ==========
    function initTabs(){
        var tabs = document.querySelectorAll('.hash-tab');
        tabs.forEach(function(t){
            t.addEventListener('click', function(){
                var target = t.getAttribute('data-tab');
                tabs.forEach(function(x){ x.classList.remove('active'); });
                document.querySelectorAll('.hash-panel').forEach(function(p){ p.classList.remove('active'); });
                t.classList.add('active');
                $('panel-' + target).classList.add('active');
                currentHashes = null;
                updateCompare();
            });
        });
    }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function(){
        initTabs();

        var debounce;
        $('text-input').addEventListener('input', function(){
            clearTimeout(debounce);
            debounce = setTimeout(computeText, 200);
        });

        $('opt-upper').addEventListener('change', function(){
            if(currentHashes){
                var active = document.querySelector('.hash-tab.active').getAttribute('data-tab');
                renderResults($(active + '-results'), currentHashes);
            }
        });
        $('opt-separator').addEventListener('change', function(){
            if(currentHashes){
                var active = document.querySelector('.hash-tab.active').getAttribute('data-tab');
                renderResults($(active + '-results'), currentHashes);
            }
        });

        $('compare-input').addEventListener('input', updateCompare);

        var drop = $('file-drop');
        var fileInput = $('file-input');

        drop.addEventListener('click', function(){ fileInput.click(); });
        fileInput.addEventListener('change', function(){
            if(fileInput.files[0]) computeFile(fileInput.files[0]);
        });

        ['dragenter','dragover'].forEach(function(ev){
            drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('dragover'); });
        });
        ['dragleave','drop'].forEach(function(ev){
            drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('dragover'); });
        });
        drop.addEventListener('drop', function(e){
            e.preventDefault();
            var f = e.dataTransfer.files[0];
            if(f) computeFile(f);
        });
    });
})();
