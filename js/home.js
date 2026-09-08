/**
 * home.js - Inteligência Brasil
 * Page-specific script for index.html
 * Handles: email validation, IP fetch, text rotator, contact form, counters, newsletter form
 */
(function() {
    'use strict';

    // ========== SHARED: EMAIL DOMAIN BLOCKLISTS ==========
    var publicDomains = [
        'gmail.com', 'gmail.com.br', 'googlemail.com',
        'outlook.com', 'outlook.com.br', 'hotmail.com', 'hotmail.com.br', 'live.com', 'live.com.br', 'msn.com',
        'yahoo.com', 'yahoo.com.br', 'ymail.com', 'rocketmail.com',
        'icloud.com', 'me.com', 'mac.com',
        'aol.com', 'aol.com.br',
        'protonmail.com', 'protonmail.ch', 'proton.me',
        'zoho.com', 'zohomail.com',
        'mail.com', 'email.com',
        'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com', 'globomail.com',
        'r7.com', 'zipmail.com.br', 'oi.com.br', 'pop.com.br'
    ];
    var tempDomains = [
        'tempmail.com', 'temp-mail.org', 'tempmail.net', 'temp-mail.io',
        'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net', 'guerrillamail.biz', 'guerrillamailblock.com',
        '10minutemail.com', '10minutemail.net', '10minmail.com',
        'mailinator.com', 'mailinator.net', 'mailinator2.com',
        'throwaway.email', 'throwawaymail.com',
        'fakeinbox.com', 'fakemailgenerator.com',
        'getnada.com', 'nada.email',
        'dispostable.com', 'disposablemail.com',
        'maildrop.cc', 'mailnesia.com',
        'yopmail.com', 'yopmail.fr', 'yopmail.net',
        'trashmail.com', 'trashmail.net', 'trash-mail.com',
        'sharklasers.com', 'spam4.me', 'grr.la', 'guerrillamail.info',
        'mohmal.com', 'tempail.com', 'emailondeck.com',
        'mintemail.com', 'spamgourmet.com', 'mytemp.email',
        'burnermail.io', 'mailsac.com', 'inboxkitten.com',
        'tempinbox.com', 'tmpmail.org', 'tmpmail.net',
        'getairmail.com', 'discard.email', 'discardmail.com',
        'spamex.com', 'mailcatch.com', 'mailscrap.com',
        'tempr.email', 'fakemail.net', 'emailfake.com',
        'crazymailing.com', 'tempsky.com', 'tempmailaddress.com'
    ];
    var suspiciousPatterns = [/temp/i, /fake/i, /trash/i, /spam/i, /disposable/i, /throwaway/i, /mailinator/i, /guerrilla/i, /10min/i, /burner/i, /noreply/i, /no-reply/i];

    function validateCorporateEmail(email) {
        var emailLower = email.toLowerCase().trim();
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailLower)) {
            return { valid: false, message: 'Por favor, informe um e-mail válido.' };
        }
        var domain = emailLower.split('@')[1];
        if (publicDomains.indexOf(domain) !== -1) {
            return { valid: false, message: 'Por favor, utilize seu e-mail corporativo. E-mails pessoais (Gmail, Outlook, etc.) não são aceitos.' };
        }
        if (tempDomains.indexOf(domain) !== -1 || tempDomains.some(function(d) { return domain.indexOf(d) !== -1; })) {
            return { valid: false, message: 'E-mails temporários não são permitidos. Por favor, use seu e-mail corporativo.' };
        }
        if (suspiciousPatterns.some(function(p) { return p.test(domain); })) {
            return { valid: false, message: 'Este domínio de e-mail não é permitido. Por favor, use seu e-mail corporativo.' };
        }
        return { valid: true };
    }

    // ========== SHARED: IP FETCH ==========
    var SCRIPT_URL = 'https://script.google.com/a/inteligenciabrasil.seg.br/macros/s/AKfycbzzkHQxLsw0M5wU1LF2maVkF_piJiERJU34NCzE9g/exec';
    var cachedIp = '';

    function withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise(function(_, reject) { setTimeout(function() { reject(new Error('timeout')); }, ms); })
        ]);
    }

    async function fetchIp() {
        if (cachedIp) return cachedIp;
        try {
            var res = await withTimeout(fetch('/cdn-cgi/trace', { cache: 'no-store' }), 2500);
            if (res.ok) {
                var text = await res.text();
                var match = text.match(/(?:^|\n)ip=([^\n]+)/);
                if (match && match[1]) {
                    cachedIp = match[1].trim();
                    return cachedIp;
                }
            }
        } catch (e) {}
        return '';
    }

    // Pre-fetch IP (deferred to avoid blocking critical path)
    function prefetchIp() {
        fetchIp().then(function(ip) {
            var ipInput = document.getElementById('ip');
            var nlIpInput = document.getElementById('newsletterIp');
            if (ipInput) ipInput.value = ip;
            if (nlIpInput) nlIpInput.value = ip;
        });
    }
    if ('requestIdleCallback' in window) {
        requestIdleCallback(prefetchIp);
    } else {
        setTimeout(prefetchIp, 2000);
    }

    // ========== TEXT ROTATOR (replaces Morphext) ==========
    var rotatingEl = document.getElementById('js-rotating');
    if (rotatingEl) {
        var wordsStr = rotatingEl.getAttribute('data-words') || rotatingEl.textContent;
        var words = wordsStr.split(',').map(function(w) { return w.trim(); });
        if (words.length > 1) {
            var wordIndex = 0;
            rotatingEl.style.transition = 'opacity 0.5s';
            setInterval(function() {
                rotatingEl.style.opacity = '0';
                setTimeout(function() {
                    wordIndex = (wordIndex + 1) % words.length;
                    rotatingEl.textContent = words[wordIndex];
                    rotatingEl.style.opacity = '1';
                }, 500);
            }, 3000);
        }
    }

    // ========== CONTACT FORM ==========
    var contactForm = document.getElementById('contactFormServico');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!contactForm.checkValidity()) {
                contactForm.reportValidity();
                var firstInvalid = contactForm.querySelector(':invalid');
                if (firstInvalid) firstInvalid.focus();
                return;
            }

            var statusDiv = document.getElementById('homeFormMessage');
            var submitBtn = contactForm.querySelector('.btn-submit');
            var originalText = submitBtn ? submitBtn.innerHTML : '';

            function showStatus(text, color) {
                if (!statusDiv) return;
                // Clear previous content
                while (statusDiv.firstChild) statusDiv.removeChild(statusDiv.firstChild);
                // Text node, not textContent: callers append a WhatsApp link after this.
                statusDiv.appendChild(document.createTextNode(text));
                statusDiv.style.display = 'block';
                statusDiv.style.marginTop = '0.75rem';
                statusDiv.style.padding = '0.75rem';
                statusDiv.style.borderRadius = '4px';
                statusDiv.style.color = '#F1F5F9';
                statusDiv.style.backgroundColor = color;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            }

            // Ensure IP
            var ipInput = document.getElementById('ip');
            if (ipInput && !ipInput.value) ipInput.value = await fetchIp();

            try {
                var res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: new FormData(contactForm)
                });
                var response = await res.json();
                var result = (typeof response === 'object') ? response.result || response.status || 'success' : response;
                if (result === 'success' || result === 'ok') {
                    contactForm.reset();
                    showStatus('Mensagem enviada! Nossa equipe retornará em até 2 horas úteis.', '#10B981');
                } else {
                    showStatus('Ocorreu um erro ao enviar. Tente novamente ou fale conosco pelo ', '#EF4444');
                    var waLink = document.createElement('a');
                    waLink.href = 'https://wa.me/5511993619947';
                    waLink.target = '_blank';
                    waLink.rel = 'noopener';
                    waLink.textContent = 'WhatsApp';
                    waLink.style.color = '#F1F5F9';
                    if (statusDiv) statusDiv.appendChild(waLink);
                }
            } catch (err) {
                showStatus('Ocorreu um erro ao enviar. Tente novamente ou fale conosco pelo ', '#EF4444');
                var waLink = document.createElement('a');
                waLink.href = 'https://wa.me/5511993619947';
                waLink.target = '_blank';
                waLink.rel = 'noopener';
                waLink.textContent = 'WhatsApp';
                waLink.style.color = '#F1F5F9';
                if (statusDiv) statusDiv.appendChild(waLink);
            } finally {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
                if (statusDiv) statusDiv.focus();
            }
        });
    }

    // ========== ANIMATED COUNTERS ==========
    var counters = document.querySelectorAll('.counter');
    if (counters.length && 'IntersectionObserver' in window) {
        var counterObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                    entry.target.classList.add('counted');
                    var el = entry.target;
                    var target = parseFloat(el.getAttribute('data-target'));
                    var prefix = el.getAttribute('data-prefix') || '';
                    var suffix = el.getAttribute('data-suffix') || '';
                    var decimals = parseInt(el.getAttribute('data-decimals')) || 0;
                    var current = 0;
                    var steps = 100;
                    var increment = target / steps;
                    var timer = setInterval(function() {
                        current += increment;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        var displayValue = decimals > 0 ? current.toFixed(decimals) : Math.floor(current);
                        el.textContent = prefix + displayValue + suffix;
                    }, 20);
                }
            });
        }, { threshold: 0.5 });
        counters.forEach(function(counter) { counterObserver.observe(counter); });
    }

    // ========== NEWSLETTER FORM ==========
    var newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        function showNewsletterMessage(message, type) {
            var msgDiv = document.getElementById('newsletterMessage');
            msgDiv.textContent = message;
            msgDiv.className = 'newsletter-message ' + type;
            msgDiv.style.display = 'block';
            if (type === 'success') {
                setTimeout(function() { msgDiv.style.display = 'none'; }, 5000);
            }
        }

        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            var emailInput = document.getElementById('newsletterEmail');
            var submitBtn = newsletterForm.querySelector('.newsletter-btn');
            var originalText = submitBtn.innerHTML;
            var email = emailInput.value.trim();

            var validation = validateCorporateEmail(email);
            if (!validation.valid) {
                showNewsletterMessage(validation.message, 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            var ip = cachedIp || await fetchIp();
            var nlIpInput = document.getElementById('newsletterIp');
            if (nlIpInput) nlIpInput.value = ip;

            try {
                var res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'email=' + encodeURIComponent(email) + '&origem=Newsletter Home&servico=Newsletter&ip=' + encodeURIComponent(ip)
                });
                var response = await res.json();
                var result = (typeof response === 'object') ? response.result || response.status || 'success' : response;
                if (result === 'success' || result === 'ok') {
                    newsletterForm.reset();
                    showNewsletterMessage('Verifique seu e-mail para confirmar a assinatura.', 'success');
                } else {
                    showNewsletterMessage('Não foi possível inscrever agora. Tente novamente em instantes.', 'error');
                }
            } catch (err) {
                showNewsletterMessage('Não foi possível inscrever agora. Tente novamente em instantes.', 'error');
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    }
})();
