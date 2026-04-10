/**
 * Password Generator - Inteligencia Brasil
 * 100% client-side, uses crypto.getRandomValues() for cryptographic randomness
 */
(function () {
    'use strict';

    // ========== CHARACTER SETS ==========
    var CHARS = {
        upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lower: 'abcdefghijklmnopqrstuvwxyz',
        number: '0123456789',
        symbol: '!@#$%^&*()-_=+[]{}|;:,.<>?/~`\'"\\',
        similar: '1lI0O',
        ambiguous: '{}[]/\\\'"`~,;:.<>'
    };

    // EFF Large Wordlist (subset - 256 common Portuguese-friendly words for passphrases)
    var WORDS = [
        'agua','alma','alto','amor','anel','arco','arma','asas','asno','asar',
        'azul','baba','bala','bana','base','beco','beni','bico','bico','bidu',
        'bisa','bola','bolo','bomb','bony','boto','brem','buda','bumb','cabo',
        'cabe','cair','cana','capa','cara','carb','cart','casa','caso','cati',
        'cebu','ceia','ceu','cera','chav','cida','clip','clow','cobi','coco',
        'colo','copa','copo','cora','core','cove','crav','crus','cubo','cuca',
        'curi','dado','dama','dana','dedo','deli','demu','depe','desa','dico',
        'dico','dish','dito','doce','dois','doma','doso','dose','dote','dudu',
        'dura','duro','eche','eco','egua','elev','enxo','erva','esme','estu',
        'fada','fala','famo','fano','farn','fato','feba','feio','fell','feno',
        'fera','feri','fero','feto','fiba','figa','filo','fina','fito','fofo',
        'fogo','folha','fora','fome','fora','foro','fosfo','foto','fova','fox',
        'fran','fres','frio','fula','fula','fumo','furo','gabu','gabu','gala',
        'gama','gano','gara','gata','gelo','geni','gera','gibi','giro','gota',
        'gozo','grama','grou','gude','guia','hera','hino','hoje','hora','iate',
        'ideia','ido','imame','imen','inho','isca','iuka','jabu','jaca','jato',
        'java','jaca','jeca','jega','jeju','jiba','jogo','jose','juca','juda',
        'judu','juiz','juli','juma','jura','juta','kabu','kaka','kart','kebab',
        'kefe','keto','kiwi','koop','laca','lado','lafa','lago','lama','lamy',
        'lana','lapa','lapis','lari','lata','laxo','leao','leda','leil','lema',
        'lent','liba','liga','lima','limo','lina','linho','lira','lirio','liso',
        'liti','livro','liza','loca','loja','loma','lona','lord','lote','luar',
        'lula','lume','lupa','luta','luxo','luzo','maca','mais','mala','mamut',
        'mana','mano','mapa','mar','mate','meio','mel','mero','mesa','mes',
        'mico','mido','mim','minu','miri','miro','moco','moda','moeda','mola',
        'mona','moco','muco','mudo','muga','mula','muro','musa','nabo','nada'
    ];

    // ========== CRYPTOGRAPHIC RANDOM ==========
    function randomInt(max) {
        // Uses crypto.getRandomValues for cryptographic randomness
        // Rejection sampling to avoid modulo bias
        var buf = new Uint32Array(1);
        var maxAcceptable = Math.floor(0xFFFFFFFF / max) * max;
        var n;
        do {
            crypto.getRandomValues(buf);
            n = buf[0];
        } while (n >= maxAcceptable);
        return n % max;
    }

    function randomChoice(arr) {
        return arr[randomInt(arr.length)];
    }

    function shuffle(arr) {
        // Fisher-Yates shuffle
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = randomInt(i + 1);
            var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    // ========== PASSWORD GENERATION ==========
    function generatePassword(opts) {
        var pool = '';
        var required = [];

        if (opts.upper) { pool += CHARS.upper; required.push(CHARS.upper); }
        if (opts.lower) { pool += CHARS.lower; required.push(CHARS.lower); }
        if (opts.number) { pool += CHARS.number; required.push(CHARS.number); }
        if (opts.symbol) { pool += CHARS.symbol; required.push(CHARS.symbol); }

        if (opts.excludeSimilar) {
            for (var i = 0; i < CHARS.similar.length; i++) {
                pool = pool.split(CHARS.similar[i]).join('');
            }
            required = required.map(function (set) {
                var s = set;
                for (var i = 0; i < CHARS.similar.length; i++) {
                    s = s.split(CHARS.similar[i]).join('');
                }
                return s;
            });
        }

        if (opts.excludeAmbiguous) {
            for (var i = 0; i < CHARS.ambiguous.length; i++) {
                pool = pool.split(CHARS.ambiguous[i]).join('');
            }
            required = required.map(function (set) {
                var s = set;
                for (var i = 0; i < CHARS.ambiguous.length; i++) {
                    s = s.split(CHARS.ambiguous[i]).join('');
                }
                return s;
            });
        }

        if (pool.length === 0) return '';

        var length = opts.length;
        var result = [];

        // Ensure at least one character from each required set
        required.forEach(function (set) {
            if (set.length > 0 && result.length < length) {
                result.push(set[randomInt(set.length)]);
            }
        });

        // Fill the rest from the pool
        while (result.length < length) {
            result.push(pool[randomInt(pool.length)]);
        }

        // Shuffle so required chars aren't always at the start
        return shuffle(result).join('');
    }

    function generatePassphrase(opts) {
        var words = [];
        for (var i = 0; i < opts.words; i++) {
            var w = randomChoice(WORDS);
            if (opts.capitalize) {
                w = w.charAt(0).toUpperCase() + w.slice(1);
            }
            words.push(w);
        }
        var result = words.join(opts.separator);
        if (opts.addNumber) {
            result += randomInt(100);
        }
        if (opts.addSymbol) {
            // Use a safe subset (no quotes/backslash) to avoid copy-paste issues
            var safeSymbols = '!@#$%&*+=?';
            result += safeSymbols[randomInt(safeSymbols.length)];
        }
        return result;
    }

    // ========== STRENGTH ESTIMATION ==========
    function calculateEntropy(password, isPassphrase, wordCount) {
        if (isPassphrase) {
            // Entropy = log2(wordlist_size) * num_words
            // EFF wordlist: 7776 words → log2(7776) ≈ 12.92 bits/word
            // Our reduced list: ~256 words → 8 bits/word (conservative)
            return wordCount * 8;
        }

        // Determine character pool size
        var pool = 0;
        if (/[a-z]/.test(password)) pool += 26;
        if (/[A-Z]/.test(password)) pool += 26;
        if (/[0-9]/.test(password)) pool += 10;
        if (/[^a-zA-Z0-9]/.test(password)) pool += 32;

        if (pool === 0 || password.length === 0) return 0;

        return Math.log2(pool) * password.length;
    }

    function strengthFromEntropy(entropy) {
        if (entropy < 36) return { class: 'weak', label: 'Fraca', percent: 15 };
        if (entropy < 60) return { class: 'fair', label: 'Razoavel', percent: 35 };
        if (entropy < 80) return { class: 'good', label: 'Boa', percent: 60 };
        if (entropy < 100) return { class: 'strong', label: 'Forte', percent: 80 };
        return { class: 'excellent', label: 'Excelente', percent: 100 };
    }

    function crackTime(entropy) {
        // Assume 1 trillion guesses per second (modern GPU rig)
        var guessesPerSec = 1e12;
        var combinations = Math.pow(2, entropy);
        var seconds = combinations / 2 / guessesPerSec; // average case

        if (seconds < 1) return 'instantaneo';
        if (seconds < 60) return Math.round(seconds) + ' segundos';
        if (seconds < 3600) return Math.round(seconds / 60) + ' minutos';
        if (seconds < 86400) return Math.round(seconds / 3600) + ' horas';
        if (seconds < 2592000) return Math.round(seconds / 86400) + ' dias';
        if (seconds < 31536000) return Math.round(seconds / 2592000) + ' meses';
        if (seconds < 31536000 * 1000) return Math.round(seconds / 31536000) + ' anos';
        if (seconds < 31536000 * 1e6) return Math.round(seconds / 31536000 / 1000) + ' mil anos';
        if (seconds < 31536000 * 1e9) return Math.round(seconds / 31536000 / 1e6) + ' milhoes de anos';
        return 'bilhoes de anos';
    }

    // ========== UI STATE ==========
    var currentMode = 'password';

    function getPasswordOptions() {
        return {
            length: parseInt(document.getElementById('lengthSlider').value, 10),
            upper: document.getElementById('optUpper').checked,
            lower: document.getElementById('optLower').checked,
            number: document.getElementById('optNumber').checked,
            symbol: document.getElementById('optSymbol').checked,
            excludeSimilar: document.getElementById('optExcludeSimilar').checked,
            excludeAmbiguous: document.getElementById('optExcludeAmbiguous').checked
        };
    }

    function getPassphraseOptions() {
        return {
            words: parseInt(document.getElementById('wordsSlider').value, 10),
            separator: document.getElementById('separatorSelect').value,
            capitalize: document.getElementById('optCapitalize').checked,
            addNumber: document.getElementById('optAddNumber').checked,
            addSymbol: document.getElementById('optAddSymbol').checked
        };
    }

    function generateAndDisplay() {
        var pwd, entropy;
        if (currentMode === 'password') {
            var opts = getPasswordOptions();
            // Ensure at least one char type selected
            if (!opts.upper && !opts.lower && !opts.number && !opts.symbol) {
                document.getElementById('optLower').checked = true;
                opts.lower = true;
            }
            pwd = generatePassword(opts);
            entropy = calculateEntropy(pwd, false);
        } else {
            var pOpts = getPassphraseOptions();
            pwd = generatePassphrase(pOpts);
            entropy = calculateEntropy(pwd, true, pOpts.words);
        }

        document.getElementById('pwdDisplay').value = pwd;
        updateStrength(entropy);
    }

    function updateStrength(entropy) {
        var s = strengthFromEntropy(entropy);
        var fill = document.getElementById('strengthFill');
        var label = document.getElementById('strengthLabel');
        var ent = document.getElementById('strengthEntropy');
        var time = document.getElementById('strengthTime');

        fill.style.width = s.percent + '%';
        fill.className = 'strength-fill ' + s.class;
        label.textContent = s.label;
        label.className = 'strength-label ' + s.class;
        ent.textContent = Math.round(entropy) + ' bits';
        time.textContent = crackTime(entropy);
    }

    // ========== TOAST ==========
    function showToast(msg) {
        var toast = document.getElementById('pwd-toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    // ========== COPY ==========
    function copyText(text, msg) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                showToast(msg || 'Copiado!');
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
            showToast(msg || 'Copiado!');
        }
    }

    // ========== BULK GENERATION ==========
    var bulkPasswords = [];

    function generateBulk() {
        var count = parseInt(document.getElementById('bulkCount').value, 10);
        var output = document.getElementById('bulkOutput');
        bulkPasswords = [];
        output.innerHTML = '';

        for (var i = 0; i < count; i++) {
            var pwd;
            if (currentMode === 'password') {
                var opts = getPasswordOptions();
                if (!opts.upper && !opts.lower && !opts.number && !opts.symbol) {
                    opts.lower = true;
                }
                pwd = generatePassword(opts);
            } else {
                pwd = generatePassphrase(getPassphraseOptions());
            }
            bulkPasswords.push(pwd);

            var item = document.createElement('div');
            item.className = 'pwd-bulk-item';
            var span = document.createElement('span');
            span.textContent = pwd;
            var btn = document.createElement('button');
            btn.innerHTML = '<i class="fas fa-copy"></i>';
            btn.title = 'Copiar';
            btn.addEventListener('click', (function (p) {
                return function () { copyText(p, 'Senha copiada!'); };
            })(pwd));
            item.appendChild(span);
            item.appendChild(btn);
            output.appendChild(item);
        }

        document.getElementById('bulkCopy').disabled = false;
    }

    function copyBulk() {
        if (bulkPasswords.length === 0) return;
        copyText(bulkPasswords.join('\n'), bulkPasswords.length + ' senhas copiadas!');
    }

    // ========== TAB SWITCHING ==========
    function switchTab(tab) {
        currentMode = tab;
        document.querySelectorAll('.pwd-tab').forEach(function (t) {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        document.querySelectorAll('.pwd-panel').forEach(function (p) {
            p.classList.toggle('active', p.id === 'panel-' + tab);
        });
        generateAndDisplay();
    }

    // ========== INIT ==========
    document.addEventListener('DOMContentLoaded', function () {
        // Tabs
        document.querySelectorAll('.pwd-tab').forEach(function (t) {
            t.addEventListener('click', function () { switchTab(t.dataset.tab); });
        });

        // Length slider
        var lengthSlider = document.getElementById('lengthSlider');
        var lengthValue = document.getElementById('lengthValue');
        lengthSlider.addEventListener('input', function () {
            lengthValue.textContent = lengthSlider.value;
            generateAndDisplay();
        });

        // Words slider
        var wordsSlider = document.getElementById('wordsSlider');
        var wordsValue = document.getElementById('wordsValue');
        wordsSlider.addEventListener('input', function () {
            wordsValue.textContent = wordsSlider.value;
            generateAndDisplay();
        });

        // Checkboxes & select
        ['optUpper','optLower','optNumber','optSymbol','optExcludeSimilar','optExcludeAmbiguous','optCapitalize','optAddNumber','optAddSymbol'].forEach(function (id) {
            document.getElementById(id).addEventListener('change', generateAndDisplay);
        });
        document.getElementById('separatorSelect').addEventListener('change', generateAndDisplay);

        // Refresh & copy
        document.getElementById('pwdRefresh').addEventListener('click', generateAndDisplay);
        document.getElementById('pwdCopy').addEventListener('click', function () {
            var pwd = document.getElementById('pwdDisplay').value;
            if (pwd) copyText(pwd, 'Senha copiada!');
        });

        // Bulk
        document.getElementById('bulkGenerate').addEventListener('click', generateBulk);
        document.getElementById('bulkCopy').addEventListener('click', copyBulk);

        // Initial generation
        generateAndDisplay();
    });

})();
