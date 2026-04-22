/**
 * Validador de Politica de Senhas - Inteligencia Brasil
 * 100% client-side. Avalia forca, entropia, NIST SP 800-63B, LGPD/ISO.
 */
(function(){
    'use strict';

    // Top senhas comuns (amostra curta - padroes observados em vazamentos reais)
    var COMMON = [
        '123456','123456789','qwerty','password','12345','qwerty123','1q2w3e','12345678','111111',
        '1234567890','senha','senha123','admin','admin123','abc123','iloveyou','monkey','dragon',
        '123123','1234','password1','qwe123','asdf','letmein','welcome','princess','sunshine',
        'master','football','baseball','shadow','superman','batman','michael','jordan','jennifer',
        '000000','1q2w3e4r','5tgb','ninja','123qwe','trustno1','hello','login','pass','test',
        'passw0rd','p@ssw0rd','p@ssword','passw0rd1','senha1234','mudar123','102030','102030405060',
        'brasil','brasil123','corinthians','flamengo','saopaulo','palmeiras','gremio','santos',
        'internacional','cruzeiro','atletico','nacional','coringao','saodepaulo','time','futebol',
        'marina','mariana','felipe','felipa','maria','joao','pedro','ana','lucas','julia','beatriz',
        'carlos','andre','ricardo','roberto','fernanda','carolina','gabriela','amanda','larissa'
    ];

    // Padroes teclado
    var KEYBOARD_ROWS = [
        'qwertyuiop','asdfghjkl','zxcvbnm',
        '1234567890','!@#$%^&*()',
        'qazwsxedcrfvtgbyhnujmikolp'
    ];

    // Presets de politica
    var PRESETS = {
        nist: {
            name: 'NIST 800-63B',
            minLength: 8, reqUpper: false, reqLower: false, reqNumber: false, reqSymbol: false,
            blockCommon: true, blockSequential: true, blockRepeating: false, minUnique: 0
        },
        iso: {
            name: 'ISO 27001',
            minLength: 12, reqUpper: true, reqLower: true, reqNumber: true, reqSymbol: true,
            blockCommon: true, blockSequential: true, blockRepeating: true, minUnique: 6
        },
        pci: {
            name: 'PCI-DSS',
            minLength: 12, reqUpper: true, reqLower: true, reqNumber: true, reqSymbol: false,
            blockCommon: true, blockSequential: false, blockRepeating: false, minUnique: 0
        },
        strong: {
            name: 'Forte (recomendado)',
            minLength: 16, reqUpper: true, reqLower: true, reqNumber: true, reqSymbol: true,
            blockCommon: true, blockSequential: true, blockRepeating: true, minUnique: 8
        }
    };

    function $(id){ return document.getElementById(id); }

    function hasSequential(s){
        if(s.length < 3) return false;
        s = s.toLowerCase();
        for(var i=0; i<s.length-2; i++){
            var a = s.charCodeAt(i), b = s.charCodeAt(i+1), c = s.charCodeAt(i+2);
            if(b - a === 1 && c - b === 1) return true;
            if(a - b === 1 && b - c === 1) return true;
        }
        return false;
    }

    function hasKeyboardPattern(s){
        if(s.length < 4) return false;
        var low = s.toLowerCase();
        for(var i=0; i<KEYBOARD_ROWS.length; i++){
            var row = KEYBOARD_ROWS[i];
            for(var j=0; j<=low.length-4; j++){
                var chunk = low.substr(j, 4);
                if(row.indexOf(chunk) !== -1) return true;
                if(row.indexOf(chunk.split('').reverse().join('')) !== -1) return true;
            }
        }
        return false;
    }

    function hasRepeating(s){
        return /(.)\1{2,}/.test(s);
    }

    function hasYear(s){
        return /(19|20)\d{2}/.test(s);
    }

    function isCommonPassword(s){
        var low = s.toLowerCase();
        if(COMMON.indexOf(low) !== -1) return true;
        // Check leet variants
        var deleet = low.replace(/@/g,'a').replace(/0/g,'o').replace(/1/g,'i').replace(/3/g,'e').replace(/4/g,'a').replace(/5/g,'s').replace(/7/g,'t').replace(/\$/g,'s');
        if(COMMON.indexOf(deleet) !== -1) return true;
        return false;
    }

    function poolSize(s){
        var pool = 0;
        if(/[a-z]/.test(s)) pool += 26;
        if(/[A-Z]/.test(s)) pool += 26;
        if(/[0-9]/.test(s)) pool += 10;
        if(/[^a-zA-Z0-9\s]/.test(s)) pool += 32;
        if(/\s/.test(s)) pool += 1;
        // Non-ASCII bump
        if(/[^\x00-\x7F]/.test(s)) pool += 30;
        return pool || 1;
    }

    function entropy(s){
        return s.length * (Math.log(poolSize(s)) / Math.log(2));
    }

    function crackTime(bits){
        // Assume 10^12 guesses/sec (attacker with GPU farm, offline on unsalted/weak hash)
        var guesses = Math.pow(2, bits) / 2;
        var seconds = guesses / 1e12;
        if(seconds < 1) return 'Instantaneo';
        if(seconds < 60) return Math.round(seconds) + ' segundos';
        if(seconds < 3600) return Math.round(seconds/60) + ' minutos';
        if(seconds < 86400) return Math.round(seconds/3600) + ' horas';
        if(seconds < 31536000) return Math.round(seconds/86400) + ' dias';
        if(seconds < 31536000 * 1000) return Math.round(seconds/31536000) + ' anos';
        if(seconds < 31536000 * 1e6) return Math.round(seconds/31536000/1000) + ' mil anos';
        if(seconds < 31536000 * 1e9) return Math.round(seconds/31536000/1e6) + ' milhoes de anos';
        return Math.round(seconds/31536000/1e9) + ' bilhoes de anos';
    }

    function getPolicyFromUI(){
        return {
            minLength: parseInt($('pol-min-length').value) || 8,
            reqUpper: $('pol-req-upper').checked,
            reqLower: $('pol-req-lower').checked,
            reqNumber: $('pol-req-number').checked,
            reqSymbol: $('pol-req-symbol').checked,
            blockCommon: $('pol-block-common').checked,
            blockSequential: $('pol-block-sequential').checked,
            blockRepeating: $('pol-block-repeating').checked,
            minUnique: parseInt($('pol-min-unique').value) || 0
        };
    }

    function applyPreset(key){
        var p = PRESETS[key];
        if(!p) return;
        $('pol-min-length').value = p.minLength;
        $('pol-req-upper').checked = p.reqUpper;
        $('pol-req-lower').checked = p.reqLower;
        $('pol-req-number').checked = p.reqNumber;
        $('pol-req-symbol').checked = p.reqSymbol;
        $('pol-block-common').checked = p.blockCommon;
        $('pol-block-sequential').checked = p.blockSequential;
        $('pol-block-repeating').checked = p.blockRepeating;
        $('pol-min-unique').value = p.minUnique;
        document.querySelectorAll('.pol-preset').forEach(function(b){ b.classList.remove('active'); });
        var btn = document.querySelector('.pol-preset[data-preset="' + key + '"]');
        if(btn) btn.classList.add('active');
        validate();
    }

    function uniqueChars(s){
        var set = {};
        for(var i=0; i<s.length; i++) set[s[i]] = 1;
        return Object.keys(set).length;
    }

    function runChecks(pwd, policy){
        var checks = [];
        var recommendations = [];

        // Empty
        if(!pwd){ return { checks: [], score: 0, entropy: 0, crackTime: '-' }; }

        var len = pwd.length;
        var hasUp = /[A-Z]/.test(pwd);
        var hasLow = /[a-z]/.test(pwd);
        var hasNum = /[0-9]/.test(pwd);
        var hasSym = /[^a-zA-Z0-9]/.test(pwd);

        // Length
        if(len >= policy.minLength){
            checks.push({ level: 'pass', title: 'Tamanho minimo', msg: len + ' caracteres (minimo: ' + policy.minLength + ')' });
        } else {
            checks.push({ level: 'fail', title: 'Tamanho insuficiente', msg: 'Apenas ' + len + ' caracteres. Politica exige ' + policy.minLength + '+' });
            recommendations.push('Aumente para pelo menos ' + policy.minLength + ' caracteres');
        }

        // Char variety
        if(policy.reqUpper){
            if(hasUp) checks.push({ level: 'pass', title: 'Letras maiusculas', msg: 'Presente' });
            else { checks.push({ level: 'fail', title: 'Falta letras maiusculas', msg: 'Politica exige ao menos uma A-Z' }); recommendations.push('Adicione letra maiuscula (A-Z)'); }
        }
        if(policy.reqLower){
            if(hasLow) checks.push({ level: 'pass', title: 'Letras minusculas', msg: 'Presente' });
            else { checks.push({ level: 'fail', title: 'Falta letras minusculas', msg: 'Politica exige ao menos uma a-z' }); recommendations.push('Adicione letra minuscula (a-z)'); }
        }
        if(policy.reqNumber){
            if(hasNum) checks.push({ level: 'pass', title: 'Numeros', msg: 'Presente' });
            else { checks.push({ level: 'fail', title: 'Falta numero', msg: 'Politica exige ao menos um 0-9' }); recommendations.push('Adicione numero (0-9)'); }
        }
        if(policy.reqSymbol){
            if(hasSym) checks.push({ level: 'pass', title: 'Simbolos especiais', msg: 'Presente' });
            else { checks.push({ level: 'fail', title: 'Falta simbolo', msg: 'Politica exige ao menos um caractere especial' }); recommendations.push('Adicione simbolo (! @ # $ ...)'); }
        }

        // Unique chars
        var uniq = uniqueChars(pwd);
        if(policy.minUnique > 0){
            if(uniq >= policy.minUnique){
                checks.push({ level: 'pass', title: 'Diversidade de caracteres', msg: uniq + ' caracteres unicos' });
            } else {
                checks.push({ level: 'fail', title: 'Pouca diversidade', msg: 'Apenas ' + uniq + ' caracteres unicos (minimo ' + policy.minUnique + ')' });
                recommendations.push('Use mais caracteres diferentes entre si');
            }
        }

        // Common password
        if(policy.blockCommon){
            if(isCommonPassword(pwd)){
                checks.push({ level: 'fail', title: 'Senha comum detectada', msg: 'Esta senha ou variante esta em listas de vazamentos' });
                recommendations.push('Troque por senha unica e aleatoria');
            } else {
                checks.push({ level: 'pass', title: 'Nao e senha comum', msg: 'Nao corresponde a padroes conhecidos' });
            }
        }

        // Sequential
        if(policy.blockSequential){
            if(hasSequential(pwd) || hasKeyboardPattern(pwd)){
                checks.push({ level: 'fail', title: 'Sequencia detectada', msg: 'Contem padrao sequencial (abc, 123, qwerty)' });
                recommendations.push('Evite sequencias de teclado ou alfabeto');
            } else {
                checks.push({ level: 'pass', title: 'Sem sequencias', msg: 'Nao tem padroes lineares obvios' });
            }
        }

        // Repeating
        if(policy.blockRepeating){
            if(hasRepeating(pwd)){
                checks.push({ level: 'fail', title: 'Caracteres repetidos', msg: 'Contem 3+ iguais seguidos (aaa, 111)' });
                recommendations.push('Evite repeticoes consecutivas');
            } else {
                checks.push({ level: 'pass', title: 'Sem repeticoes excessivas', msg: 'Sem caracteres repetidos seguidos' });
            }
        }

        // Year
        if(hasYear(pwd)){
            checks.push({ level: 'warn', title: 'Ano detectado', msg: 'Contem padrao YYYY (1900-2099) - comum em senhas fracas' });
            recommendations.push('Remova anos/datas facilmente previsiveis');
        }

        // Length warnings
        if(len < 12){
            checks.push({ level: 'warn', title: 'Tamanho abaixo do recomendado', msg: 'Recomenda-se 12+ caracteres; ideal e 16+' });
            if(len >= policy.minLength){ recommendations.push('Aumente para 16+ caracteres para maior resistencia'); }
        } else if(len >= 20){
            checks.push({ level: 'pass', title: 'Tamanho excelente', msg: len + ' caracteres oferecem alta resistencia' });
        }

        var bits = entropy(pwd);

        // Compute score (0-100)
        var passCount = checks.filter(function(c){ return c.level === 'pass'; }).length;
        var failCount = checks.filter(function(c){ return c.level === 'fail'; }).length;
        var total = passCount + failCount;
        var baseScore = total > 0 ? (passCount / total) * 60 : 0;

        // Add entropy bonus
        var entropyBonus = Math.min(40, (bits / 128) * 40);

        var score = Math.round(baseScore + entropyBonus);
        if(failCount > 0) score = Math.min(score, 60);
        if(isCommonPassword(pwd)) score = Math.min(score, 20);

        return {
            checks: checks,
            recommendations: recommendations,
            score: score,
            entropy: bits,
            crackTime: crackTime(bits),
            uniqChars: uniq,
            poolSize: poolSize(pwd)
        };
    }

    function scoreLabel(s){
        if(s >= 85) return { label: 'EXCELENTE', cls: 'excellent' };
        if(s >= 70) return { label: 'FORTE', cls: 'strong' };
        if(s >= 50) return { label: 'BOA', cls: 'good' };
        if(s >= 30) return { label: 'REGULAR', cls: 'fair' };
        return { label: 'FRACA', cls: 'weak' };
    }

    function render(result){
        var output = $('pol-output');
        var empty = $('pol-empty');

        if(!result || !result.checks.length){
            empty.style.display = 'block';
            output.style.display = 'none';
            return;
        }

        empty.style.display = 'none';
        output.style.display = 'block';

        var lab = scoreLabel(result.score);
        var scoreEl = $('pol-score-val');
        scoreEl.textContent = result.score;
        scoreEl.className = 'pol-score-value ' + lab.cls;
        $('pol-score-label').textContent = lab.label;
        var fillEl = $('pol-score-fill');
        fillEl.style.width = result.score + '%';
        fillEl.className = 'pol-score-fill ' + lab.cls;

        $('pol-entropy').textContent = result.entropy.toFixed(1) + ' bits';
        $('pol-crack').innerHTML = 'Tempo estimado para quebra: <strong>' + result.crackTime + '</strong>';
        $('pol-uniq').textContent = result.uniqChars;
        $('pol-pool').textContent = result.poolSize + ' chars';

        var list = $('pol-checks');
        list.innerHTML = '';
        result.checks.forEach(function(c){
            var icon = c.level === 'pass' ? 'fa-check-circle' : c.level === 'fail' ? 'fa-times-circle' : 'fa-exclamation-circle';
            var li = document.createElement('li');
            li.className = 'pol-check-item ' + c.level;
            li.innerHTML = '<i class="fas ' + icon + '"></i><div><strong>' + c.title + '</strong>' + c.msg + '</div>';
            list.appendChild(li);
        });

        var recsBox = $('pol-recs');
        if(result.recommendations && result.recommendations.length){
            var ul = recsBox.querySelector('ul');
            ul.innerHTML = result.recommendations.map(function(r){ return '<li>' + r + '</li>'; }).join('');
            recsBox.style.display = 'block';
        } else {
            recsBox.style.display = 'none';
        }
    }

    function validate(){
        var pwd = $('pol-input').value;
        var policy = getPolicyFromUI();
        var result = runChecks(pwd, policy);
        render(pwd ? result : null);
    }

    document.addEventListener('DOMContentLoaded', function(){
        var input = $('pol-input');

        input.addEventListener('input', validate);

        document.querySelectorAll('#pol-policy input').forEach(function(el){
            el.addEventListener('change', validate);
            el.addEventListener('input', validate);
        });

        document.querySelectorAll('.pol-preset').forEach(function(btn){
            btn.addEventListener('click', function(){
                applyPreset(btn.getAttribute('data-preset'));
            });
        });

        $('pol-toggle').addEventListener('click', function(){
            var icon = $('pol-toggle').querySelector('i');
            if(input.type === 'password'){
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });

        // Default: preset strong
        applyPreset('strong');
    });
})();
